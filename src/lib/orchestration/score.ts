import type {
  OrchestrationCapabilitySnapshot,
  RuntimeMode,
  ServiceHealthSnapshot,
} from "@/lib/orchestration/types";

interface IntervalStats {
  mean: number;
  stdDev: number;
  cv: number;
  min: number;
  max: number;
}

export interface RuntimeProfile {
  mode: RuntimeMode;
  declaredIntervalSeconds: number | null;
  targetIntervalSeconds: number | null;
  toleranceRatio: number;
}

export interface WorkSignals {
  approvedClaims: number;
  submittedClaims: number;
  claimedWork: number;
  completedReviews: number;
  collaborationEvents: number;
  plannedNodes: number;
  verifiedNodes: number;
  reviewApprovalRate: number;
  reviewerAgreementRate: number;
  reworkRate: number;
  handoffSuccessRate: number;
  forecastAccuracy: number;
  duplicateWorkAvoidance: number;
  decompositionCoverage: number;
  evidenceDensity: number;
}

const RUNTIME_PROFILES: Record<RuntimeMode, Omit<RuntimeProfile, "declaredIntervalSeconds">> = {
  undeclared: {
    mode: "undeclared",
    targetIntervalSeconds: null,
    toleranceRatio: 0.5,
  },
  native_5m: {
    mode: "native_5m",
    targetIntervalSeconds: 300,
    toleranceRatio: 0.35,
  },
  native_10m: {
    mode: "native_10m",
    targetIntervalSeconds: 600,
    toleranceRatio: 0.35,
  },
  legacy_30m: {
    mode: "legacy_30m",
    targetIntervalSeconds: 1800,
    toleranceRatio: 0.3,
  },
  external_60s: {
    mode: "external_60s",
    targetIntervalSeconds: 60,
    toleranceRatio: 0.45,
  },
  external_30s: {
    mode: "external_30s",
    targetIntervalSeconds: 30,
    toleranceRatio: 0.45,
  },
  custom: {
    mode: "custom",
    targetIntervalSeconds: null,
    toleranceRatio: 0.5,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 2) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

export function resolveRuntimeProfile(
  metadata: Record<string, unknown> | null | undefined,
  observedMeanSeconds: number | null
): RuntimeProfile {
  const rawMode =
    typeof metadata?.runtime_mode === "string"
      ? metadata.runtime_mode
      : typeof metadata?.heartbeat_mode === "string"
        ? metadata.heartbeat_mode
        : "undeclared";
  const normalizedMode = (Object.keys(RUNTIME_PROFILES).includes(rawMode)
    ? rawMode
    : "undeclared") as RuntimeMode;

  const declaredIntervalSeconds =
    typeof metadata?.declared_interval_seconds === "number"
      ? metadata.declared_interval_seconds
      : normalizedMode !== "undeclared" && normalizedMode !== "custom"
        ? RUNTIME_PROFILES[normalizedMode].targetIntervalSeconds
        : null;

  const targetIntervalSeconds =
    declaredIntervalSeconds ??
    (normalizedMode !== "undeclared" && normalizedMode !== "custom"
      ? RUNTIME_PROFILES[normalizedMode].targetIntervalSeconds
      : observedMeanSeconds);

  return {
    mode: normalizedMode,
    declaredIntervalSeconds,
    targetIntervalSeconds,
    toleranceRatio: RUNTIME_PROFILES[normalizedMode].toleranceRatio,
  };
}

export function calculateIntervalStats(intervals: number[]): IntervalStats | null {
  if (intervals.length === 0) return null;

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 1;

  return {
    mean,
    stdDev,
    cv,
    min: Math.min(...intervals),
    max: Math.max(...intervals),
  };
}

export function buildServiceHealthSnapshot(params: {
  runtimeProfile: RuntimeProfile;
  intervalStats: IntervalStats | null;
  heartbeatSampleCount: number;
  challengeSampleCount: number;
  challengeResponseRate: number;
  medianLatencyMs: number | null;
  lastChainLength: number;
}): ServiceHealthSnapshot {
  const {
    runtimeProfile,
    intervalStats,
    heartbeatSampleCount,
    challengeSampleCount,
    challengeResponseRate,
    medianLatencyMs,
    lastChainLength,
  } = params;

  const cadenceAccuracy =
    intervalStats && runtimeProfile.targetIntervalSeconds
      ? clamp(
          1 -
            Math.abs(intervalStats.mean - runtimeProfile.targetIntervalSeconds) /
              Math.max(
                runtimeProfile.targetIntervalSeconds * runtimeProfile.toleranceRatio,
                1
              ),
          0,
          1
        )
      : intervalStats
        ? clamp(1 - intervalStats.cv / 0.35, 0, 1)
        : 0;
  const cadenceStability = intervalStats ? clamp(1 - intervalStats.cv / 0.45, 0, 1) : 0;
  const cadenceScore = round(cadenceAccuracy * 20 + cadenceStability * 15);

  const challengeReliabilityScore = round(clamp(challengeResponseRate, 0, 1) * 25);

  const latencyFactor =
    medianLatencyMs === null
      ? 0
      : medianLatencyMs <= 500
        ? 1
        : medianLatencyMs <= 1500
          ? 0.75
          : medianLatencyMs <= 5000
            ? 0.45
            : medianLatencyMs <= 10000
              ? 0.2
              : 0;
  const latencyScore = round(latencyFactor * 20);

  const chainScore = round(
    clamp(Math.log2(Math.max(1, lastChainLength + 1)) / Math.log2(337), 0, 1) * 20
  );

  const cadenceConfidence = clamp(heartbeatSampleCount / 48, 0, 1);
  const challengeConfidence = clamp(challengeSampleCount / 12, 0, 1);
  const confidence = round(cadenceConfidence * 0.6 + challengeConfidence * 0.4, 4);

  const rawScore = cadenceScore + challengeReliabilityScore + latencyScore + chainScore;
  const score = round(rawScore * (0.4 + confidence * 0.6));

  return {
    score_version: "v2",
    runtime_mode: runtimeProfile.mode,
    declared_interval_seconds: runtimeProfile.declaredIntervalSeconds,
    score,
    confidence,
    heartbeat_sample_count: heartbeatSampleCount,
    challenge_sample_count: challengeSampleCount,
    components: {
      cadence: { value: cadenceScore, max: 35, label: "Cadence adherence" },
      challenge_reliability: {
        value: challengeReliabilityScore,
        max: 25,
        label: "Challenge reliability",
      },
      latency: { value: latencyScore, max: 20, label: "Challenge latency" },
      chain_continuity: { value: chainScore, max: 20, label: "Chain continuity" },
    },
    metrics: {
      cadence_accuracy: round(cadenceAccuracy, 4),
      cadence_stability: round(cadenceStability, 4),
      interval_mean_seconds: round(intervalStats?.mean ?? 0, 2),
      interval_std_dev_seconds: round(intervalStats?.stdDev ?? 0, 2),
      interval_cv: round(intervalStats?.cv ?? 0, 4),
      interval_min_seconds: round(intervalStats?.min ?? 0, 2),
      interval_max_seconds: round(intervalStats?.max ?? 0, 2),
      challenge_response_rate: round(challengeResponseRate, 4),
      median_latency_ms: medianLatencyMs,
      last_chain_length: lastChainLength,
    },
  };
}

export function buildOrchestrationCapabilitySnapshot(
  signals: WorkSignals
): OrchestrationCapabilitySnapshot {
  const deliveryRate =
    signals.submittedClaims > 0 ? signals.approvedClaims / signals.submittedClaims : 0;
  const deliveryActivity = clamp(signals.claimedWork / 6, 0, 1);
  const deliveryScore = round((deliveryRate * 0.7 + deliveryActivity * 0.3) * 25);

  const reviewCoverage = clamp(signals.completedReviews / 6, 0, 1);
  const reviewQuality = clamp(
    signals.reviewApprovalRate * 0.55 + signals.reviewerAgreementRate * 0.45,
    0,
    1
  );
  const reviewScore = round((reviewCoverage * 0.45 + reviewQuality * 0.55) * 20);

  const collaborationCoverage = clamp(signals.collaborationEvents / 12, 0, 1);
  const collaborationScore = round(
    (collaborationCoverage * 0.5 + signals.handoffSuccessRate * 0.5) * 15
  );

  const planningCoverage =
    signals.plannedNodes > 0 ? signals.verifiedNodes / signals.plannedNodes : 0;
  const planningActivity = clamp(signals.plannedNodes / 10, 0, 1);
  const planningScore = round(
    (planningCoverage * 0.45 +
      planningActivity * 0.2 +
      signals.decompositionCoverage * 0.35) *
      15
  );

  const decompositionQuality = clamp(
    signals.reviewerAgreementRate * 0.2 +
      (1 - clamp(signals.reworkRate, 0, 1)) * 0.2 +
      signals.handoffSuccessRate * 0.15 +
      signals.forecastAccuracy * 0.2 +
      signals.duplicateWorkAvoidance * 0.15 +
      clamp(signals.evidenceDensity / 3, 0, 1) * 0.1,
    0,
    1
  );
  const decompositionQualityScore = round(decompositionQuality * 25);

  const evidenceConfidence = clamp(
    (signals.claimedWork +
      signals.completedReviews +
      signals.collaborationEvents +
      signals.plannedNodes +
      signals.evidenceDensity) /
      28,
    0,
    1
  );
  const score = round(
    (
      deliveryScore +
      reviewScore +
      collaborationScore +
      planningScore +
      decompositionQualityScore
    ) *
      (0.45 + evidenceConfidence * 0.55)
  );

  return {
    score_version: "v2",
    score,
    confidence: round(evidenceConfidence, 4),
    components: {
      delivery: { value: deliveryScore, max: 25, label: "Delivery quality" },
      review: { value: reviewScore, max: 20, label: "Review quality" },
      collaboration: {
        value: collaborationScore,
        max: 15,
        label: "Handoff coordination",
      },
      planning: { value: planningScore, max: 15, label: "Plan coverage" },
      decomposition_quality: {
        value: decompositionQualityScore,
        max: 25,
        label: "Decomposition quality",
      },
    },
    metrics: {
      approved_claims: signals.approvedClaims,
      submitted_claims: signals.submittedClaims,
      claimed_work: signals.claimedWork,
      completed_reviews: signals.completedReviews,
      collaboration_events: signals.collaborationEvents,
      planned_nodes: signals.plannedNodes,
      verified_nodes: signals.verifiedNodes,
      delivery_rate: round(deliveryRate, 4),
      planning_coverage: round(planningCoverage, 4),
      review_approval_rate: round(signals.reviewApprovalRate, 4),
      reviewer_agreement_rate: round(signals.reviewerAgreementRate, 4),
      rework_rate: round(signals.reworkRate, 4),
      handoff_success_rate: round(signals.handoffSuccessRate, 4),
      forecast_accuracy: round(signals.forecastAccuracy, 4),
      duplicate_work_avoidance: round(signals.duplicateWorkAvoidance, 4),
      decomposition_coverage: round(signals.decompositionCoverage, 4),
      evidence_density: round(signals.evidenceDensity, 4),
      decomposition_quality: round(decompositionQuality, 4),
    },
  };
}

export function deriveTrustTier(params: {
  marketTrustScore: number;
  serviceHealthScore: number;
  orchestrationScore: number;
  lastChainLength: number;
}): 0 | 1 | 2 | 3 {
  const { marketTrustScore } = params;

  if (marketTrustScore >= 80) return 3;
  if (marketTrustScore >= 50) return 2;
  if (marketTrustScore >= 20) return 1;
  return 0;
}
