import { createAdminClient } from "@/lib/supabase/admin";
import { asFiniteNumber, asTrimmedString, isPlainObject } from "@/lib/http/input";
import {
  buildDemoAgentRuntime,
  buildDemoSupervisorOverview,
  demoCampaigns,
  demoDeliverables,
  demoMountains,
  demoRewardSplits,
  demoReplans,
  demoSwarmSessions,
  demoVerificationRuns,
  demoWorkLeases,
  demoWorkSpecs,
} from "./demo-data";
import type {
  AgentRuntimeView,
  CampaignRecord,
  DeliverableRecord,
  MountainRecord,
  MountainSummary,
  RewardRecord,
  RewardSplitRecord,
  ReplanRecord,
  SupervisorCampaignSummary,
  SupervisorOverview,
  SupervisorSummary,
  SwarmSessionRecord,
  VerificationRunRecord,
  WorkLeaseRecord,
  WorkSpecRecord,
} from "./types";

type JsonRecord = Record<string, unknown>;

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42P01" || candidate.message?.includes("does not exist") === true;
}

function asRecord(value: unknown): JsonRecord {
  return isPlainObject(value) ? value : {};
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isPlainObject) as JsonRecord[] : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumber(value: unknown, fallback = 0) {
  return asFiniteNumber(value) ?? fallback;
}

function normalizeMountain(row: Record<string, unknown>): MountainRecord {
  return {
    id: String(row.id),
    slug: typeof row.slug === "string" ? row.slug : null,
    title: String(row.title ?? ""),
    thesis: String(row.thesis ?? ""),
    target_problem: String(row.target_problem ?? ""),
    success_criteria: String(row.success_criteria ?? ""),
    domain: String(row.domain ?? ""),
    horizon: String(row.horizon ?? ""),
    visibility: (row.visibility as MountainRecord["visibility"]) ?? "scoped",
    status: (row.status as MountainRecord["status"]) ?? "draft",
    created_by_account_id: String(row.created_by_account_id ?? ""),
    total_budget_credits: asNumber(row.total_budget_credits),
    budget_envelopes: {
      decomposition: asNumber(asRecord(row.budget_envelopes).decomposition),
      execution: asNumber(asRecord(row.budget_envelopes).execution),
      replication: asNumber(asRecord(row.budget_envelopes).replication),
      synthesis: asNumber(asRecord(row.budget_envelopes).synthesis),
      emergency: asNumber(asRecord(row.budget_envelopes).emergency),
    },
    governance_policy: asRecord(row.governance_policy),
    decomposition_policy: asRecord(row.decomposition_policy),
    settlement_policy_mode:
      (row.settlement_policy_mode as MountainRecord["settlement_policy_mode"]) ??
      "dynamic_difficulty",
    settlement_policy: asRecord(row.settlement_policy),
    tags: asStringArray(row.tags),
    metadata: asRecord(row.metadata),
    launched_at: typeof row.launched_at === "string" ? row.launched_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeCampaign(row: Record<string, unknown>): CampaignRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    hypothesis: typeof row.hypothesis === "string" ? row.hypothesis : null,
    status: (row.status as CampaignRecord["status"]) ?? "planned",
    risk_ceiling: String(row.risk_ceiling ?? "medium"),
    decomposition_aggressiveness: asNumber(row.decomposition_aggressiveness, 50),
    replication_policy: asRecord(row.replication_policy),
    governance_policy: asRecord(row.governance_policy),
    budget_credits: asNumber(row.budget_credits),
    milestone_order: asNumber(row.milestone_order),
    owner_account_id: typeof row.owner_account_id === "string" ? row.owner_account_id : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeWorkSpec(row: Record<string, unknown>): WorkSpecRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    parent_work_spec_id:
      typeof row.parent_work_spec_id === "string" ? row.parent_work_spec_id : null,
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    status: (row.status as WorkSpecRecord["status"]) ?? "queued",
    contribution_type: String(row.contribution_type ?? ""),
    role_type: String(row.role_type ?? ""),
    allowed_role_types: asStringArray(row.allowed_role_types),
    input_contract: asRecord(row.input_contract),
    output_contract: asRecord(row.output_contract),
    verification_contract: asRecord(row.verification_contract),
    dependency_edges: asRecordArray(row.dependency_edges),
    reward_envelope: asRecord(row.reward_envelope),
    checkpoint_cadence_minutes: asNumber(row.checkpoint_cadence_minutes, 60),
    duplication_policy: asRecord(row.duplication_policy),
    risk_class: String(row.risk_class ?? "moderate"),
    priority: asNumber(row.priority, 50),
    speculative: Boolean(row.speculative),
    synthesis_required: Boolean(row.synthesis_required),
    owner_account_id: typeof row.owner_account_id === "string" ? row.owner_account_id : null,
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeWorkLease(row: Record<string, unknown>): WorkLeaseRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: String(row.work_spec_id ?? ""),
    assigned_agent_id: typeof row.assigned_agent_id === "string" ? row.assigned_agent_id : null,
    assigned_by_account_id:
      typeof row.assigned_by_account_id === "string" ? row.assigned_by_account_id : null,
    status: (row.status as WorkLeaseRecord["status"]) ?? "offered",
    offered_at: String(row.offered_at ?? new Date().toISOString()),
    accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    checkpoint_due_at:
      typeof row.checkpoint_due_at === "string" ? row.checkpoint_due_at : null,
    submitted_at: typeof row.submitted_at === "string" ? row.submitted_at : null,
    verified_at: typeof row.verified_at === "string" ? row.verified_at : null,
    renewal_count: asNumber(row.renewal_count),
    failure_reason: typeof row.failure_reason === "string" ? row.failure_reason : null,
    rationale: typeof row.rationale === "string" ? row.rationale : null,
    checkpoint_payload: asRecord(row.checkpoint_payload),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeSwarmSession(row: Record<string, unknown>): SwarmSessionRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    title: String(row.title ?? ""),
    objective: String(row.objective ?? ""),
    status: String(row.status ?? "forming"),
    coalition_terms: asRecord(row.coalition_terms),
    credit_split_policy: asRecord(row.credit_split_policy),
    coordination_context: asRecord(row.coordination_context),
    created_by_agent_id:
      typeof row.created_by_agent_id === "string" ? row.created_by_agent_id : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeDeliverable(row: Record<string, unknown>): DeliverableRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    work_lease_id: typeof row.work_lease_id === "string" ? row.work_lease_id : null,
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    deliverable_type: (row.deliverable_type as DeliverableRecord["deliverable_type"]) ?? "artifact",
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    evidence_bundle: asRecordArray(row.evidence_bundle),
    claims: asRecordArray(row.claims),
    references_bundle: asRecordArray(row.references_bundle),
    upstream_refs: asStringArray(row.upstream_refs),
    confidence: asNumber(row.confidence),
    novelty_score: asNumber(row.novelty_score),
    reproducibility_score: asNumber(row.reproducibility_score),
    artifact_url: typeof row.artifact_url === "string" ? row.artifact_url : null,
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeVerificationRun(row: Record<string, unknown>): VerificationRunRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    deliverable_id: typeof row.deliverable_id === "string" ? row.deliverable_id : null,
    verifier_agent_id:
      typeof row.verifier_agent_id === "string" ? row.verifier_agent_id : null,
    requested_by_agent_id:
      typeof row.requested_by_agent_id === "string" ? row.requested_by_agent_id : null,
    verification_type: String(row.verification_type ?? ""),
    outcome: (row.outcome as VerificationRunRecord["outcome"]) ?? "pending",
    confidence_delta: asNumber(row.confidence_delta),
    contradiction_count: asNumber(row.contradiction_count),
    findings: asRecordArray(row.findings),
    evidence_bundle: asRecordArray(row.evidence_bundle),
    requested_at: String(row.requested_at ?? new Date().toISOString()),
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeReplan(row: Record<string, unknown>): ReplanRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    work_lease_id: typeof row.work_lease_id === "string" ? row.work_lease_id : null,
    issued_by_account_id:
      typeof row.issued_by_account_id === "string" ? row.issued_by_account_id : null,
    reason: (row.reason as ReplanRecord["reason"]) ?? "manual_intervention",
    action: String(row.action ?? ""),
    summary: String(row.summary ?? ""),
    status: String(row.status ?? "open"),
    payload: asRecord(row.payload),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeRewardSplit(row: Record<string, unknown>): RewardSplitRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    work_lease_id: typeof row.work_lease_id === "string" ? row.work_lease_id : null,
    deliverable_id: typeof row.deliverable_id === "string" ? row.deliverable_id : null,
    beneficiary_agent_id:
      typeof row.beneficiary_agent_id === "string" ? row.beneficiary_agent_id : null,
    beneficiary_account_id:
      typeof row.beneficiary_account_id === "string" ? row.beneficiary_account_id : null,
    role: (row.role as RewardSplitRecord["role"]) ?? "executor",
    amount_credits: asNumber(row.amount_credits),
    rationale: String(row.rationale ?? ""),
    settlement_status: String(row.settlement_status ?? "pending"),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function summarizeMountains(
  mountains: MountainRecord[],
  campaigns: CampaignRecord[],
  workSpecs: WorkSpecRecord[],
  workLeases: WorkLeaseRecord[],
  verificationRuns: VerificationRunRecord[],
  rewardSplits: RewardSplitRecord[]
): MountainSummary[] {
  return mountains.map((mountain) => {
    const mountainCampaigns = campaigns.filter((campaign) => campaign.mountain_id === mountain.id);
    const mountainSpecs = workSpecs.filter((spec) => spec.mountain_id === mountain.id);
    const mountainLeases = workLeases.filter((lease) => lease.mountain_id === mountain.id);
    const mountainVerifications = verificationRuns.filter(
      (run) => run.mountain_id === mountain.id && run.outcome === "passed"
    );
    const mountainRewards = rewardSplits.filter((reward) => reward.mountain_id === mountain.id);
    const done = mountainSpecs.filter((spec) => ["verified", "submitted"].includes(spec.status)).length;
    const progressPercent = mountainSpecs.length > 0 ? Math.round((done / mountainSpecs.length) * 100) : 0;

    return {
      ...mountain,
      campaign_count: mountainCampaigns.length,
      work_spec_count: mountainSpecs.length,
      active_lease_count: mountainLeases.filter((lease) =>
        ["accepted", "active", "checkpoint_due", "submitted"].includes(lease.status)
      ).length,
      verified_deliverable_count: mountainVerifications.length,
      reward_distributed_credits: Number(
        mountainRewards.reduce((sum, reward) => sum + reward.amount_credits, 0).toFixed(2)
      ),
      progress_percent: progressPercent,
    };
  });
}

async function safeSelect<T>(
  table: string,
  normalizer: (row: Record<string, unknown>) => T,
  fallback: T[],
  orderBy = "created_at"
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db.from(table).select("*").order(orderBy, { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      return fallback;
    }
    throw error;
  }
  return (data ?? []).map((row: unknown) => normalizer(row as Record<string, unknown>));
}

async function safeSelectOne<T extends { id: string }>(
  table: string,
  id: string,
  normalizer: (row: Record<string, unknown>) => T,
  fallback: T[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      return fallback.find((row) => row.id === id) ?? null;
    }
    throw error;
  }

  if (!data) return null;
  return normalizer(data as Record<string, unknown>);
}

async function safeUpdateOne<T extends { id: string }>(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  normalizer: (row: Record<string, unknown>) => T,
  fallback: T[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const nextPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from(table)
    .update(nextPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      const existing = fallback.find((row) => row.id === id);
      return existing ? ({ ...existing, ...nextPatch } as T) : null;
    }
    throw error;
  }

  if (!data) return null;
  return normalizer(data as Record<string, unknown>);
}

export async function listMountains(): Promise<MountainSummary[]> {
  const [mountains, campaigns, workSpecs, workLeases, verificationRuns, rewardSplits] =
    await Promise.all([
      safeSelect("mountains", normalizeMountain, demoMountains),
      safeSelect("campaigns", normalizeCampaign, demoCampaigns),
      safeSelect("work_specs", normalizeWorkSpec, demoWorkSpecs),
      safeSelect("work_leases", normalizeWorkLease, demoWorkLeases),
      safeSelect("verification_runs", normalizeVerificationRun, demoVerificationRuns),
      safeSelect("reward_splits", normalizeRewardSplit, demoRewardSplits),
    ]);

  return summarizeMountains(mountains, campaigns, workSpecs, workLeases, verificationRuns, rewardSplits);
}

export async function listCampaigns(): Promise<CampaignRecord[]> {
  return safeSelect("campaigns", normalizeCampaign, demoCampaigns);
}

export async function listWorkSpecs(): Promise<WorkSpecRecord[]> {
  return safeSelect("work_specs", normalizeWorkSpec, demoWorkSpecs);
}

export async function listWorkLeases(): Promise<WorkLeaseRecord[]> {
  return safeSelect("work_leases", normalizeWorkLease, demoWorkLeases);
}

export async function listSwarmSessions(): Promise<SwarmSessionRecord[]> {
  return safeSelect("swarm_sessions", normalizeSwarmSession, demoSwarmSessions);
}

export async function listDeliverables(): Promise<DeliverableRecord[]> {
  return safeSelect("deliverables", normalizeDeliverable, demoDeliverables);
}

export async function listVerificationRuns(): Promise<VerificationRunRecord[]> {
  return safeSelect("verification_runs", normalizeVerificationRun, demoVerificationRuns);
}

export async function listReplans(): Promise<ReplanRecord[]> {
  return safeSelect("replans", normalizeReplan, demoReplans);
}

export async function listRewardSplits(): Promise<RewardSplitRecord[]> {
  return safeSelect("reward_splits", normalizeRewardSplit, demoRewardSplits);
}

export async function listRewards(): Promise<RewardRecord[]> {
  return listRewardSplits();
}

export async function getMountain(id: string) {
  return safeSelectOne("mountains", id, normalizeMountain, demoMountains);
}

export async function getCampaign(id: string) {
  return safeSelectOne("campaigns", id, normalizeCampaign, demoCampaigns);
}

export async function getWorkSpec(id: string) {
  return safeSelectOne("work_specs", id, normalizeWorkSpec, demoWorkSpecs);
}

export async function getWorkLease(id: string) {
  return safeSelectOne("work_leases", id, normalizeWorkLease, demoWorkLeases);
}

export async function getSwarmSession(id: string) {
  return safeSelectOne("swarm_sessions", id, normalizeSwarmSession, demoSwarmSessions);
}

export async function getDeliverable(id: string) {
  return safeSelectOne("deliverables", id, normalizeDeliverable, demoDeliverables);
}

export async function getVerificationRun(id: string) {
  return safeSelectOne("verification_runs", id, normalizeVerificationRun, demoVerificationRuns);
}

export async function getReward(id: string) {
  return safeSelectOne("reward_splits", id, normalizeRewardSplit, demoRewardSplits);
}

export async function updateMountain(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("mountains", id, patch, normalizeMountain, demoMountains);
}

export async function updateCampaign(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("campaigns", id, patch, normalizeCampaign, demoCampaigns);
}

export async function updateWorkSpec(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("work_specs", id, patch, normalizeWorkSpec, demoWorkSpecs);
}

export async function updateWorkLease(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("work_leases", id, patch, normalizeWorkLease, demoWorkLeases);
}

export async function updateSwarmSession(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("swarm_sessions", id, patch, normalizeSwarmSession, demoSwarmSessions);
}

export async function updateDeliverable(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("deliverables", id, patch, normalizeDeliverable, demoDeliverables);
}

export async function updateVerificationRun(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne(
    "verification_runs",
    id,
    patch,
    normalizeVerificationRun,
    demoVerificationRuns,
  );
}

export async function updateReward(id: string, patch: Record<string, unknown>) {
  return safeUpdateOne("reward_splits", id, patch, normalizeRewardSplit, demoRewardSplits);
}

export async function getSupervisorOverview(): Promise<SupervisorOverview> {
  try {
    const [mountains, campaigns, work_specs, work_leases, deliverables, verification_runs, replans, reward_splits, swarm_sessions] =
      await Promise.all([
        listMountains(),
        listCampaigns(),
        listWorkSpecs(),
        listWorkLeases(),
        listDeliverables(),
        listVerificationRuns(),
        listReplans(),
        listRewardSplits(),
        listSwarmSessions(),
      ]);

    return {
      mountains,
      campaigns,
      work_specs,
      work_leases,
      deliverables,
      verification_runs,
      replans,
      reward_splits,
      swarm_sessions,
      system_metrics: {
        active_mountains: mountains.filter((mountain) => mountain.status === "active").length,
        blocked_specs: work_specs.filter((spec) => spec.status === "blocked").length,
        overdue_checkpoints: work_leases.filter((lease) => {
          if (!lease.checkpoint_due_at) return false;
          return new Date(lease.checkpoint_due_at).getTime() < Date.now();
        }).length,
        contradiction_alerts: verification_runs.filter((run) => run.outcome === "contradiction").length,
        unsettled_rewards: reward_splits.filter((reward) => reward.settlement_status !== "settled").length,
      },
    };
  } catch {
    return {
      ...buildDemoSupervisorOverview(),
      mountains: summarizeMountains(
        demoMountains,
        demoCampaigns,
        demoWorkSpecs,
        demoWorkLeases,
        demoVerificationRuns,
        demoRewardSplits
      ),
    };
  }
}

export async function getSupervisorSummary(): Promise<SupervisorSummary> {
  const overview = await getSupervisorOverview();

  return {
    overview: {
      active_mountains: overview.mountains.filter((mountain) => mountain.status === "active").length,
      active_campaigns: overview.campaigns.filter((campaign) => campaign.status === "active").length,
      queued_work_specs: overview.work_specs.filter((spec) => ["queued", "ready", "blocked"].includes(spec.status)).length,
      active_work_leases: overview.work_leases.filter((lease) =>
        ["accepted", "active", "checkpoint_due", "submitted"].includes(lease.status),
      ).length,
      forming_swarms: overview.swarm_sessions.filter((session) => session.status === "forming").length,
      pending_verifications: overview.verification_runs.filter((run) => run.outcome === "pending").length,
      unsettled_rewards: overview.reward_splits.filter((reward) => reward.settlement_status !== "settled").length,
    },
    queues: {
      mountains: overview.mountains,
      campaigns: overview.campaigns,
      work_specs: overview.work_specs,
      work_leases: overview.work_leases,
      swarm_sessions: overview.swarm_sessions,
      deliverables: overview.deliverables,
      verification_runs: overview.verification_runs,
      rewards: overview.reward_splits,
    },
    interventions: overview.replans,
  };
}

export async function getSupervisorCampaignSummary(
  campaignId: string,
): Promise<SupervisorCampaignSummary | null> {
  const overview = await getSupervisorOverview();
  const campaign = overview.campaigns.find((candidate) => candidate.id === campaignId);
  if (!campaign) return null;

  const work_specs = overview.work_specs.filter((spec) => spec.campaign_id === campaignId);
  const work_leases = overview.work_leases.filter((lease) => lease.campaign_id === campaignId);
  const swarm_sessions = overview.swarm_sessions.filter((session) => session.campaign_id === campaignId);
  const deliverables = overview.deliverables.filter((deliverable) => deliverable.campaign_id === campaignId);
  const verification_runs = overview.verification_runs.filter((run) => run.campaign_id === campaignId);
  const rewards = overview.reward_splits.filter((reward) => reward.campaign_id === campaignId);

  return {
    campaign,
    mountain: overview.mountains.find((mountain) => mountain.id === campaign.mountain_id) ?? null,
    work_specs,
    work_leases,
    swarm_sessions,
    deliverables,
    verification_runs,
    rewards,
    metrics: {
      queued_specs: work_specs.filter((spec) => ["queued", "ready", "blocked"].includes(spec.status)).length,
      active_leases: work_leases.filter((lease) =>
        ["accepted", "active", "checkpoint_due", "submitted"].includes(lease.status),
      ).length,
      pending_verifications: verification_runs.filter((run) => run.outcome === "pending").length,
      unsettled_rewards: rewards.filter((reward) => reward.settlement_status !== "settled").length,
    },
  };
}

export async function getAgentRuntime(agentId: string): Promise<AgentRuntimeView> {
  try {
    const [mountains, campaigns, workSpecs, workLeases, verificationRuns, swarmSessions] =
      await Promise.all([
        listMountains(),
        listCampaigns(),
        listWorkSpecs(),
        listWorkLeases(),
        listVerificationRuns(),
        listSwarmSessions(),
      ]);

    const leaseAssignments = workLeases.filter((lease) => lease.assigned_agent_id === agentId);
    const currentAssignments = leaseAssignments.map((lease) => {
      const spec = workSpecs.find((candidate) => candidate.id === lease.work_spec_id);
      return {
        lease_id: lease.id,
        work_spec_id: lease.work_spec_id,
        mountain_id: lease.mountain_id,
        campaign_id: lease.campaign_id,
        title: spec?.title ?? "Assigned work package",
        summary: spec?.summary ?? "Supervisor-assigned work package.",
        role_type: spec?.role_type ?? "executor",
        status: lease.status,
        checkpoint_due_at: lease.checkpoint_due_at,
        expires_at: lease.expires_at,
        reward_envelope: spec?.reward_envelope ?? {},
        rationale: lease.rationale,
      };
    });

    const recommendedSpeculativeLines = workSpecs.filter(
      (spec) =>
        spec.speculative &&
        ["ready", "queued"].includes(spec.status) &&
        spec.allowed_role_types.includes(spec.role_type)
    );

    return {
      current_assignments: currentAssignments,
      checkpoint_deadlines: currentAssignments
        .filter((assignment) => assignment.checkpoint_due_at)
        .sort((a, b) =>
          new Date(a.checkpoint_due_at ?? 0).getTime() - new Date(b.checkpoint_due_at ?? 0).getTime()
        ),
      blocked_items: currentAssignments.filter((assignment) => assignment.status === "checkpoint_due"),
      coalition_invites: swarmSessions.filter((session) => session.status === "forming"),
      verification_requests: verificationRuns.filter(
        (run) => run.verifier_agent_id === agentId || run.outcome === "needs_replication"
      ),
      recommended_speculative_lines: recommendedSpeculativeLines,
      mission_context: {
        mountains,
        campaigns,
        capability_profile: buildDemoAgentRuntime().mission_context.capability_profile,
        reputation: buildDemoAgentRuntime().mission_context.reputation,
      },
      supervisor_messages: [
        {
          id: "message-assign-why",
          tone: "directive",
          subject: "Assignment logic",
          detail:
            "You are being routed by mission reliability, scientific rigor, and role fit instead of the old ranked marketplace queue.",
        },
        {
          id: "message-checkpoint",
          tone: "warning",
          subject: "Checkpoint discipline",
          detail:
            "Every active lease needs evidence before renewal. Missing a checkpoint now triggers lease reclamation instead of passive drift.",
        },
      ],
    };
  } catch {
    const runtime = buildDemoAgentRuntime();
    runtime.mission_context.mountains = summarizeMountains(
      demoMountains,
      demoCampaigns,
      demoWorkSpecs,
      demoWorkLeases,
      demoVerificationRuns,
      demoRewardSplits
    );
    return runtime;
  }
}

export async function createMountain(input: {
  accountId: string;
  title: string;
  thesis: string;
  targetProblem: string;
  successCriteria: string;
  domain: string;
  horizon: string;
  visibility: MountainRecord["visibility"];
  totalBudgetCredits: number;
  budgetEnvelopes: JsonRecord;
  governancePolicy?: JsonRecord;
  decompositionPolicy?: JsonRecord;
  settlementPolicyMode?: MountainRecord["settlement_policy_mode"];
  settlementPolicy?: JsonRecord;
  tags?: string[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const payload = {
    title: input.title,
    thesis: input.thesis,
    target_problem: input.targetProblem,
    success_criteria: input.successCriteria,
    domain: input.domain,
    horizon: input.horizon,
    visibility: input.visibility,
    status: "draft",
    created_by_account_id: input.accountId,
    total_budget_credits: input.totalBudgetCredits,
    budget_envelopes: input.budgetEnvelopes,
    governance_policy: input.governancePolicy ?? {},
    decomposition_policy: input.decompositionPolicy ?? {},
    settlement_policy_mode: input.settlementPolicyMode ?? "dynamic_difficulty",
    settlement_policy: input.settlementPolicy ?? {},
    tags: input.tags ?? [],
    slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  };

  const { data, error } = await db.from("mountains").insert(payload).select("*").single();
  if (error) throw error;
  return normalizeMountain(data as Record<string, unknown>);
}

export async function createCampaign(input: {
  mountainId: string;
  title: string;
  summary: string;
  hypothesis?: string | null;
  budgetCredits?: number;
  riskCeiling?: string;
  decompositionAggressiveness?: number;
  ownerAccountId?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("campaigns")
    .insert({
      mountain_id: input.mountainId,
      title: input.title,
      summary: input.summary,
      hypothesis: input.hypothesis ?? null,
      budget_credits: input.budgetCredits ?? 0,
      risk_ceiling: input.riskCeiling ?? "medium",
      decomposition_aggressiveness: input.decompositionAggressiveness ?? 50,
      owner_account_id: input.ownerAccountId ?? null,
      status: "planned",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeCampaign(data as Record<string, unknown>);
}

export async function createWorkSpec(input: {
  mountainId: string;
  campaignId?: string | null;
  title: string;
  summary: string;
  contributionType: string;
  roleType: string;
  allowedRoleTypes: string[];
  checkpointCadenceMinutes?: number;
  priority?: number;
  riskClass?: string;
  speculative?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("work_specs")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      title: input.title,
      summary: input.summary,
      contribution_type: input.contributionType,
      role_type: input.roleType,
      allowed_role_types: input.allowedRoleTypes,
      checkpoint_cadence_minutes: input.checkpointCadenceMinutes ?? 60,
      priority: input.priority ?? 50,
      risk_class: input.riskClass ?? "moderate",
      speculative: input.speculative ?? false,
      status: "queued",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeWorkSpec(data as Record<string, unknown>);
}

export async function createWorkLease(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId: string;
  assignedAgentId?: string | null;
  assignedByAccountId?: string | null;
  rationale?: string | null;
  checkpointDueAt?: string | null;
  expiresAt?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("work_leases")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId,
      assigned_agent_id: input.assignedAgentId ?? null,
      assigned_by_account_id: input.assignedByAccountId ?? null,
      rationale: input.rationale ?? null,
      checkpoint_due_at: input.checkpointDueAt ?? null,
      expires_at: input.expiresAt ?? null,
      status: input.assignedAgentId ? "offered" : "reassigned",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeWorkLease(data as Record<string, unknown>);
}

export async function createSwarmSession(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  title: string;
  objective: string;
  createdByAgentId?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("swarm_sessions")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      title: input.title,
      objective: input.objective,
      created_by_agent_id: input.createdByAgentId ?? null,
      status: "forming",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeSwarmSession(data as Record<string, unknown>);
}

export async function createDeliverable(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  workLeaseId?: string | null;
  agentId?: string | null;
  deliverableType: DeliverableRecord["deliverable_type"];
  title: string;
  summary: string;
  evidenceBundle?: JsonRecord[];
  claims?: JsonRecord[];
  referencesBundle?: JsonRecord[];
  artifactUrl?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("deliverables")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      work_lease_id: input.workLeaseId ?? null,
      agent_id: input.agentId ?? null,
      deliverable_type: input.deliverableType,
      title: input.title,
      summary: input.summary,
      evidence_bundle: input.evidenceBundle ?? [],
      claims: input.claims ?? [],
      references_bundle: input.referencesBundle ?? [],
      artifact_url: input.artifactUrl ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeDeliverable(data as Record<string, unknown>);
}

export async function createVerificationRun(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  deliverableId?: string | null;
  verifierAgentId?: string | null;
  requestedByAgentId?: string | null;
  verificationType: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("verification_runs")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      deliverable_id: input.deliverableId ?? null,
      verifier_agent_id: input.verifierAgentId ?? null,
      requested_by_agent_id: input.requestedByAgentId ?? null,
      verification_type: input.verificationType,
      outcome: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeVerificationRun(data as Record<string, unknown>);
}

export async function createReplan(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  workLeaseId?: string | null;
  issuedByAccountId?: string | null;
  reason: ReplanRecord["reason"];
  action: string;
  summary: string;
  payload?: JsonRecord;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("replans")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      work_lease_id: input.workLeaseId ?? null,
      issued_by_account_id: input.issuedByAccountId ?? null,
      reason: input.reason,
      action: input.action,
      summary: input.summary,
      payload: input.payload ?? {},
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeReplan(data as Record<string, unknown>);
}

export async function createRewardSplit(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  workLeaseId?: string | null;
  deliverableId?: string | null;
  beneficiaryAgentId?: string | null;
  beneficiaryAccountId?: string | null;
  role: RewardSplitRecord["role"];
  amountCredits: number;
  rationale: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("reward_splits")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      work_lease_id: input.workLeaseId ?? null,
      deliverable_id: input.deliverableId ?? null,
      beneficiary_agent_id: input.beneficiaryAgentId ?? null,
      beneficiary_account_id: input.beneficiaryAccountId ?? null,
      role: input.role,
      amount_credits: input.amountCredits,
      rationale: input.rationale,
      settlement_status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeRewardSplit(data as Record<string, unknown>);
}

export async function createReward(input: {
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  workLeaseId?: string | null;
  deliverableId?: string | null;
  beneficiaryAgentId?: string | null;
  beneficiaryAccountId?: string | null;
  role: RewardSplitRecord["role"];
  amountCredits: number;
  rationale: string;
}) {
  return createRewardSplit(input);
}

export function parseMountainCreateInput(payload: unknown) {
  if (!isPlainObject(payload)) return null;
  const title = asTrimmedString(payload.title);
  const thesis = asTrimmedString(payload.thesis);
  const targetProblem = asTrimmedString(payload.target_problem);
  const successCriteria = asTrimmedString(payload.success_criteria);
  const domain = asTrimmedString(payload.domain);
  const horizon = asTrimmedString(payload.horizon);
  const visibility = asTrimmedString(payload.visibility) as MountainRecord["visibility"] | null;
  const totalBudgetCredits = asFiniteNumber(payload.total_budget_credits);

  if (
    !title ||
    !thesis ||
    !targetProblem ||
    !successCriteria ||
    !domain ||
    !horizon ||
    !visibility ||
    totalBudgetCredits == null
  ) {
    return null;
  }

  return {
    title,
    thesis,
    targetProblem,
    successCriteria,
    domain,
    horizon,
    visibility,
    totalBudgetCredits,
    budgetEnvelopes: asRecord(payload.budget_envelopes),
    governancePolicy: asRecord(payload.governance_policy),
    decompositionPolicy: asRecord(payload.decomposition_policy),
    settlementPolicyMode:
      (asTrimmedString(payload.settlement_policy_mode) as MountainRecord["settlement_policy_mode"] | null) ??
      "dynamic_difficulty",
    settlementPolicy: asRecord(payload.settlement_policy),
    tags: asStringArray(payload.tags),
  };
}
