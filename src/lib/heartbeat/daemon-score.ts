import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOrchestrationCapabilitySnapshot,
  buildServiceHealthSnapshot,
  calculateIntervalStats,
  deriveTrustTier,
  resolveRuntimeProfile,
} from "@/lib/orchestration/score";
import { computePlanMethodologyMetrics, getLatestExecutionPlan } from "@/lib/orchestration/plans";
import type {
  MarketTrustSnapshot,
  OrchestrationCapabilitySnapshot,
  ServiceHealthSnapshot,
} from "@/lib/orchestration/types";
import type { Database, Json } from "@/types/database";

type HeartbeatRow = Pick<
  Database["public"]["Tables"]["heartbeats"]["Row"],
  "timestamp" | "chain_length"
>;

type ChallengeRow = Pick<
  Database["public"]["Tables"]["micro_challenges"]["Row"],
  "issued_at" | "responded_at" | "latency_ms" | "deadline_seconds"
>;

const SCORE_VERSION = "v2";

function round(value: number, precision = 2) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function computeChallengeStats(challenges: ChallengeRow[]) {
  if (challenges.length === 0) {
    return { responseRate: 0, medianLatency: null as number | null };
  }

  const withinDeadline = challenges.filter(
    (challenge) =>
      challenge.responded_at &&
      challenge.latency_ms !== null &&
      challenge.latency_ms <= challenge.deadline_seconds * 1000
  );
  const responseRate = withinDeadline.length / challenges.length;
  const latencies = withinDeadline
    .map((challenge) => challenge.latency_ms as number)
    .sort((left, right) => left - right);
  const medianLatency =
    latencies.length === 0
      ? null
      : latencies[Math.floor(latencies.length / 2)];

  return { responseRate, medianLatency };
}

function buildLegacyScore(serviceHealth: ServiceHealthSnapshot): number {
  return round(serviceHealth.score);
}

export interface CanonicalAgentHealth {
  daemon_score: Database["public"]["Tables"]["daemon_scores"]["Row"] & {
    service_health: ServiceHealthSnapshot;
    orchestration_capability: OrchestrationCapabilitySnapshot;
    market_trust: MarketTrustSnapshot;
  };
}

/**
 * Compute and persist canonical service-health + orchestration snapshots while
 * preserving the legacy daemon-score row for existing consumers.
 */
export async function computeDaemonScore(agentId: string): Promise<number> {
  const db = createAdminClient();

  const [
    { data: heartbeats },
    { data: challenges },
    { data: agent },
    { data: profile },
    { data: claims },
    { data: reviews },
    { count: collaborationEventCount },
    { data: planNodes },
    { data: planReviewRows },
    { data: goalRows },
    { data: daemonRow },
  ] = await Promise.all([
    db
      .from("heartbeats")
      .select("timestamp, chain_length")
      .eq("agent_id", agentId)
      .order("timestamp", { ascending: false })
      .limit(100),
    db
      .from("micro_challenges")
      .select("issued_at, responded_at, latency_ms, deadline_seconds")
      .eq("agent_id", agentId)
      .order("issued_at", { ascending: false })
      .limit(50),
    db.from("agents").select("id, metadata, trust_tier").eq("id", agentId).single(),
    db.from("agent_profiles").select("trust_score, karma").eq("agent_id", agentId).maybeSingle(),
    db.from("bounty_claims").select("status").eq("agent_id", agentId),
    db
      .from("peer_reviews")
      .select("decision")
      .eq("reviewer_agent_id", agentId),
    db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", agentId),
    db
      .from("execution_plan_nodes")
      .select(
        "status, budget_minutes, actual_minutes, rework_count, handoff_count, successful_handoff_count, duplicate_overlap_score, evidence, input_spec, output_spec, verification_method, passing_spec"
      )
      .eq("assigned_agent_id", agentId)
      .limit(200),
    db
      .from("execution_plan_reviews")
      .select("plan_id, decision, review_type, score")
      .eq("reviewer_agent_id", agentId)
      .limit(200),
    db
      .from("goals")
      .select(
        "status, assigned_agent_id, estimated_minutes, actual_minutes, input_spec, output_spec, verification_method, passing_spec, evidence"
      )
      .eq("assigned_agent_id", agentId)
      .limit(200),
    db
      .from("daemon_scores")
      .select("last_chain_length")
      .eq("agent_id", agentId)
      .maybeSingle(),
  ]);

  const heartbeatRows = (heartbeats ?? []) as HeartbeatRow[];
  const challengeRows = (challenges ?? []) as ChallengeRow[];
  const timestamps = heartbeatRows
    .map((row) => new Date(row.timestamp).getTime())
    .sort((left, right) => left - right);
  const intervals = timestamps.slice(1).map((timestamp, index) => {
    return (timestamp - timestamps[index]) / 1000;
  });
  const intervalStats = calculateIntervalStats(intervals);
  const { responseRate, medianLatency } = computeChallengeStats(challengeRows);
  const lastChainLength =
    heartbeatRows[0]?.chain_length ?? daemonRow?.last_chain_length ?? 0;
  const agentMetadata =
    agent?.metadata && typeof agent.metadata === "object"
      ? (agent.metadata as Record<string, unknown>)
      : {};
  const runtimeProfile = resolveRuntimeProfile(agentMetadata, intervalStats?.mean ?? null);

  const serviceHealth = buildServiceHealthSnapshot({
    runtimeProfile,
    intervalStats,
    heartbeatSampleCount: heartbeatRows.length,
    challengeSampleCount: challengeRows.length,
    challengeResponseRate: responseRate,
    medianLatencyMs: medianLatency,
    lastChainLength,
  });

  const approvedClaims = (claims ?? []).filter((claim) => claim.status === "approved").length;
  const submittedClaims = (claims ?? []).filter((claim) =>
    ["submitted", "approved", "rejected"].includes(claim.status)
  ).length;
  const claimedWork = (claims ?? []).filter((claim) =>
    ["claimed", "submitted", "approved"].includes(claim.status)
  ).length;
  const completedReviews = (reviews ?? []).filter((review) => review.decision !== null).length;
  const plannedNodes = (planNodes ?? []).length + (goalRows ?? []).length;
  const verifiedNodes =
    (planNodes ?? []).filter((node) => node.status === "completed").length +
    (goalRows ?? []).filter((goal) => goal.status === "completed").length;

  const reviewDecisions = (planReviewRows ?? []).filter((review) => review.decision !== "pending");
  const reviewApprovalRate =
    reviewDecisions.length === 0
      ? 0
      : reviewDecisions.filter((review) => review.decision === "approve").length /
        reviewDecisions.length;

  const reviewsByPlanType = new Map<string, string[]>();
  for (const review of reviewDecisions) {
    const key = `${review.plan_id}:${review.review_type}`;
    const bucket = reviewsByPlanType.get(key) ?? [];
    bucket.push(review.decision);
    reviewsByPlanType.set(key, bucket);
  }
  const agreementSamples = [...reviewsByPlanType.values()]
    .filter((bucket) => bucket.length > 1)
    .map((bucket) => {
      const counts = bucket.reduce<Record<string, number>>((acc, decision) => {
        acc[decision] = (acc[decision] ?? 0) + 1;
        return acc;
      }, {});
      return Math.max(...Object.values(counts)) / bucket.length;
    });
  const reviewerAgreementRate =
    agreementSamples.length === 0
      ? reviewApprovalRate
      : agreementSamples.reduce((sum, value) => sum + value, 0) / agreementSamples.length;

  const planNodeRows = (planNodes ?? []) as Array<{
    status: string;
    budget_minutes: number | null;
    actual_minutes: number | null;
    rework_count: number | null;
    handoff_count: number | null;
    successful_handoff_count: number | null;
    duplicate_overlap_score: number | null;
    evidence: unknown[] | null;
    input_spec: unknown[] | null;
    output_spec: unknown[] | null;
    verification_method: string | null;
    passing_spec: string | null;
  }>;
  const goalSignalRows = (goalRows ?? []) as Array<{
    status: string;
    estimated_minutes: number | null;
    actual_minutes: number | null;
    input_spec: unknown[] | null;
    output_spec: unknown[] | null;
    verification_method: string | null;
    passing_spec: string | null;
    evidence: unknown[] | null;
  }>;
  const totalRework = planNodeRows.reduce((sum, node) => sum + Number(node.rework_count ?? 0), 0);
  const reworkRate = plannedNodes === 0 ? 0 : totalRework / plannedNodes;
  const totalHandoffs = planNodeRows.reduce((sum, node) => sum + Number(node.handoff_count ?? 0), 0);
  const successfulHandoffs = planNodeRows.reduce(
    (sum, node) => sum + Number(node.successful_handoff_count ?? 0),
    0
  );
  const handoffSuccessRate =
    totalHandoffs === 0 ? 0 : successfulHandoffs / Math.max(totalHandoffs, 1);

  const forecastSamples = [
    ...planNodeRows
      .filter((node) => node.budget_minutes !== null && node.actual_minutes !== null)
      .map((node) => ({
        estimated: node.budget_minutes as number,
        actual: node.actual_minutes as number,
      })),
    ...goalSignalRows
      .filter((goal) => goal.estimated_minutes !== null && goal.actual_minutes !== null)
      .map((goal) => ({
        estimated: goal.estimated_minutes as number,
        actual: goal.actual_minutes as number,
      })),
  ].filter((sample) => sample.estimated > 0);
  const forecastAccuracy =
    forecastSamples.length === 0
      ? 0
      : forecastSamples.reduce((sum, sample) => {
          const error = Math.abs(sample.actual - sample.estimated);
          return sum + Math.max(0, 1 - error / Math.max(sample.estimated, 1));
        }, 0) / forecastSamples.length;

  const decompositionReadyNodes =
    planNodeRows.filter(
      (node) =>
        Array.isArray(node.input_spec) &&
        node.input_spec.length > 0 &&
        Array.isArray(node.output_spec) &&
        node.output_spec.length > 0 &&
        node.verification_method &&
        node.passing_spec
    ).length +
    goalSignalRows.filter(
      (goal) =>
        Array.isArray(goal.input_spec) &&
        goal.input_spec.length > 0 &&
        Array.isArray(goal.output_spec) &&
        goal.output_spec.length > 0 &&
        goal.verification_method &&
        goal.passing_spec
    ).length;
  const decompositionCoverage = plannedNodes === 0 ? 0 : decompositionReadyNodes / plannedNodes;

  const evidenceDensity =
    plannedNodes === 0
      ? 0
      : [
          ...planNodeRows.map((node) => (Array.isArray(node.evidence) ? node.evidence.length : 0)),
          ...goalSignalRows.map((goal) => (Array.isArray(goal.evidence) ? goal.evidence.length : 0)),
        ].reduce((sum, value) => sum + value, 0) / plannedNodes;

  const duplicateWorkAvoidance =
    planNodeRows.length === 0
      ? 0
      : 1 -
        planNodeRows.reduce(
          (sum, node) => sum + Math.min(1, Math.max(0, Number(node.duplicate_overlap_score ?? 0))),
          0
        ) /
          planNodeRows.length;

  const activeTaskId =
    typeof agentMetadata.active_task_id === "string" && agentMetadata.active_task_id.length > 0
      ? agentMetadata.active_task_id
      : null;
  const latestPlan = activeTaskId
    ? await getLatestExecutionPlan(activeTaskId).catch(() => null)
    : null;
  const methodologyMetrics = computePlanMethodologyMetrics(latestPlan);

  const orchestrationCapability = buildOrchestrationCapabilitySnapshot({
    approvedClaims,
    submittedClaims,
    claimedWork,
    completedReviews,
    collaborationEvents: collaborationEventCount ?? 0,
    plannedNodes,
    verifiedNodes,
    reviewApprovalRate:
      methodologyMetrics.review_approval_rate > 0
        ? Number(methodologyMetrics.review_approval_rate)
        : reviewApprovalRate,
    reviewerAgreementRate:
      methodologyMetrics.reviewer_agreement_rate > 0
        ? Number(methodologyMetrics.reviewer_agreement_rate)
        : reviewerAgreementRate,
    reworkRate:
      methodologyMetrics.rework_rate > 0 ? Number(methodologyMetrics.rework_rate) : reworkRate,
    handoffSuccessRate:
      methodologyMetrics.handoff_success_rate > 0
        ? Number(methodologyMetrics.handoff_success_rate)
        : handoffSuccessRate,
    forecastAccuracy:
      methodologyMetrics.forecast_accuracy > 0
        ? Number(methodologyMetrics.forecast_accuracy)
        : forecastAccuracy,
    duplicateWorkAvoidance:
      methodologyMetrics.duplicate_work_avoidance > 0
        ? Number(methodologyMetrics.duplicate_work_avoidance)
        : duplicateWorkAvoidance,
    decompositionCoverage:
      methodologyMetrics.decomposition_coverage > 0
        ? Number(methodologyMetrics.decomposition_coverage)
        : decompositionCoverage,
    evidenceDensity:
      methodologyMetrics.evidence_density > 0
        ? Number(methodologyMetrics.evidence_density)
        : evidenceDensity,
  });

  const marketTrust = {
    trust_score: profile?.trust_score ?? 0,
    karma: profile?.karma ?? 0,
    trust_tier: agent?.trust_tier ?? 0,
  };

  const legacyScore = buildLegacyScore(serviceHealth);
  const nextTrustTier = deriveTrustTier({
    marketTrustScore: marketTrust.trust_score,
    serviceHealthScore: serviceHealth.score,
    orchestrationScore: orchestrationCapability.score,
    lastChainLength,
  });

  await db.from("daemon_scores").upsert(
    {
      agent_id: agentId,
      score: legacyScore,
      heartbeat_regularity: round(serviceHealth.components.cadence.value),
      challenge_response_rate: round(responseRate),
      challenge_median_latency_ms: medianLatency,
      circadian_score: 0,
      last_chain_length: lastChainLength,
      score_version: SCORE_VERSION,
      runtime_mode: serviceHealth.runtime_mode,
      declared_interval_seconds: serviceHealth.declared_interval_seconds,
      heartbeat_sample_count: serviceHealth.heartbeat_sample_count,
      challenge_sample_count: serviceHealth.challenge_sample_count,
      cadence_score: round(serviceHealth.components.cadence.value),
      challenge_reliability_score: round(
        serviceHealth.components.challenge_reliability.value
      ),
      latency_score: round(serviceHealth.components.latency.value),
      chain_score: round(serviceHealth.components.chain_continuity.value),
      service_health_score: round(serviceHealth.score),
      orchestration_score: round(orchestrationCapability.score),
      decomposition_quality_score: round(
        orchestrationCapability.components.decomposition_quality.value
      ),
      score_confidence: round(
        Math.min(serviceHealth.confidence, orchestrationCapability.confidence),
        4
      ),
      metrics: toJson({
        service_health: serviceHealth,
        orchestration_capability: orchestrationCapability,
        market_trust: marketTrust,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" }
  );

  if (agent && agent.trust_tier !== nextTrustTier) {
    await db.from("agents").update({ trust_tier: nextTrustTier }).eq("id", agentId);
  }

  return legacyScore;
}

export async function getDaemonScore(
  agentId: string
): Promise<CanonicalAgentHealth["daemon_score"] | null> {
  const db = createAdminClient();
  const [{ data }, { data: profile }, { data: agent }] = await Promise.all([
    db.from("daemon_scores").select("*").eq("agent_id", agentId).maybeSingle(),
    db
      .from("agent_profiles")
      .select("trust_score, karma")
      .eq("agent_id", agentId)
      .maybeSingle(),
    db.from("agents").select("trust_tier").eq("id", agentId).maybeSingle(),
  ]);

  if (!data) return null;

  const metrics =
    data.metrics && typeof data.metrics === "object"
      ? (data.metrics as Record<string, unknown>)
      : {};
  const serviceHealth =
    metrics.service_health && typeof metrics.service_health === "object"
      ? (metrics.service_health as ServiceHealthSnapshot)
      : buildServiceHealthSnapshot({
          runtimeProfile: resolveRuntimeProfile({}, data.declared_interval_seconds),
          intervalStats: null,
          heartbeatSampleCount: data.heartbeat_sample_count,
          challengeSampleCount: data.challenge_sample_count,
          challengeResponseRate: data.challenge_response_rate,
          medianLatencyMs: data.challenge_median_latency_ms,
          lastChainLength: data.last_chain_length,
        });
  const orchestrationCapability =
    metrics.orchestration_capability && typeof metrics.orchestration_capability === "object"
      ? (metrics.orchestration_capability as OrchestrationCapabilitySnapshot)
      : {
          score_version: data.score_version,
          score: data.orchestration_score,
          confidence: data.score_confidence,
          components: {
            delivery: { value: 0, max: 25, label: "Delivery quality" },
            review: { value: 0, max: 20, label: "Review quality" },
            collaboration: { value: 0, max: 15, label: "Handoff coordination" },
            planning: { value: 0, max: 15, label: "Plan coverage" },
            decomposition_quality: { value: 0, max: 25, label: "Decomposition quality" },
          },
          metrics: {},
        };

  return {
    ...data,
    service_health: serviceHealth,
    orchestration_capability: orchestrationCapability,
    market_trust: {
      trust_score: profile?.trust_score ?? 0,
      karma: profile?.karma ?? 0,
      trust_tier: agent?.trust_tier ?? 0,
    },
  };
}
