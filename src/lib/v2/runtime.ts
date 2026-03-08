import { randomBytes } from "crypto";
import { hashKey } from "@/lib/auth/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentLifecycleRecord, sandboxCapabilityFlags } from "@/lib/auth/agent-lifecycle";
import { asFiniteNumber, asTrimmedString, isPlainObject } from "@/lib/http/input";
import { V2RuntimeError } from "./errors";
import {
  buildDemoAgentRuntime,
  buildDemoSupervisorOverview,
  demoCampaigns,
  demoDeliverables,
  demoMountainExternalTargets,
  demoMountainMemberships,
  demoMountains,
  demoRewardSplits,
  demoReplans,
  demoSwarmSessions,
  demoVerificationRuns,
  demoWorkLeases,
  demoWorkSpecs,
} from "./demo-data";
import { METACULUS_SUMMIT_SLUG } from "./seed";
import type {
  AgentRuntimeView,
  CampaignRecord,
  CapabilityProfileRecord,
  DeliverableRecord,
  MountainDossier,
  MountainExternalTargetRecord,
  MountainMembershipRecord,
  MountainRecord,
  MountainSummary,
  ReputationScoreRecord,
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

export interface RuntimeViewer {
  account_id: string | null;
  agent_id: string | null;
  accountRole: "user" | "admin" | "super_admin" | null;
  permissions: string[];
}

const FIXTURES_ENABLED =
  process.env.TOKENMART_ENABLE_V2_FIXTURES === "1" && process.env.NODE_ENV !== "production";

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42P01" || candidate.message?.includes("does not exist") === true;
}

function runtimeSchemaError(error: unknown): never {
  throw new V2RuntimeError(
    503,
    error instanceof Error
      ? `Mission runtime schema is unavailable: ${error.message}`
      : "Mission runtime schema is unavailable",
    "mission_runtime_unavailable",
  );
}

function maybeUseFixtures<T>(error: unknown, fallback: T[]): T[] {
  if (FIXTURES_ENABLED && isMissingTableError(error)) {
    return fallback;
  }
  runtimeSchemaError(error);
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

function nowIso() {
  return new Date().toISOString();
}

function isAdmin(viewer: RuntimeViewer | null | undefined) {
  return viewer?.accountRole === "admin" || viewer?.accountRole === "super_admin";
}

export function viewerFromIdentity(
  identity:
    | {
        accountRole: RuntimeViewer["accountRole"];
        context: {
          account_id: string | null;
          agent_id: string | null;
          permissions: string[];
        };
      }
    | null
    | undefined
): RuntimeViewer | null {
  if (!identity) return null;
  return {
    account_id: identity.context.account_id,
    agent_id: identity.context.agent_id,
    accountRole: identity.accountRole,
    permissions: identity.context.permissions,
  };
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    offered_at: String(row.offered_at ?? nowIso()),
    accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    checkpoint_due_at: typeof row.checkpoint_due_at === "string" ? row.checkpoint_due_at : null,
    submitted_at: typeof row.submitted_at === "string" ? row.submitted_at : null,
    verified_at: typeof row.verified_at === "string" ? row.verified_at : null,
    renewal_count: asNumber(row.renewal_count),
    failure_reason: typeof row.failure_reason === "string" ? row.failure_reason : null,
    rationale: typeof row.rationale === "string" ? row.rationale : null,
    lease_token_hash: typeof row.lease_token_hash === "string" ? row.lease_token_hash : null,
    checkpoint_payload: asRecord(row.checkpoint_payload),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_by_agent_id: typeof row.created_by_agent_id === "string" ? row.created_by_agent_id : null,
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

function normalizeVerificationRun(row: Record<string, unknown>): VerificationRunRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : null,
    work_spec_id: typeof row.work_spec_id === "string" ? row.work_spec_id : null,
    deliverable_id: typeof row.deliverable_id === "string" ? row.deliverable_id : null,
    verifier_agent_id: typeof row.verifier_agent_id === "string" ? row.verifier_agent_id : null,
    requested_by_agent_id:
      typeof row.requested_by_agent_id === "string" ? row.requested_by_agent_id : null,
    verification_type: String(row.verification_type ?? ""),
    outcome: (row.outcome as VerificationRunRecord["outcome"]) ?? "pending",
    confidence_delta: asNumber(row.confidence_delta),
    contradiction_count: asNumber(row.contradiction_count),
    findings: asRecordArray(row.findings),
    evidence_bundle: asRecordArray(row.evidence_bundle),
    requested_at: String(row.requested_at ?? nowIso()),
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
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
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

function normalizeCapabilityProfile(row: Record<string, unknown>): CapabilityProfileRecord {
  return {
    agent_id: String(row.agent_id ?? ""),
    domain_tags: asStringArray(row.domain_tags),
    tool_access_classes: asStringArray(row.tool_access_classes),
    compute_profile: asRecord(row.compute_profile),
    preferred_roles: asStringArray(row.preferred_roles),
    collaboration_style: typeof row.collaboration_style === "string" ? row.collaboration_style : null,
    replication_reliability: asNumber(row.replication_reliability),
    synthesis_quality: asNumber(row.synthesis_quality),
    metadata: asRecord(row.metadata),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

function normalizeReputationScore(row: Record<string, unknown>): ReputationScoreRecord {
  return {
    agent_id: String(row.agent_id ?? ""),
    mission_reliability: asNumber(row.mission_reliability),
    scientific_rigor: asNumber(row.scientific_rigor),
    collaboration_quality: asNumber(row.collaboration_quality),
    review_quality: asNumber(row.review_quality),
    social_contribution: asNumber(row.social_contribution),
    deployment_health: asNumber(row.deployment_health),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

function normalizeMountainMembership(row: Record<string, unknown>): MountainMembershipRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    account_id: typeof row.account_id === "string" ? row.account_id : null,
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    role: (row.role as MountainMembershipRecord["role"]) ?? "participant",
    status: (row.status as MountainMembershipRecord["status"]) ?? "active",
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

function normalizeMountainExternalTarget(
  row: Record<string, unknown>,
): MountainExternalTargetRecord {
  return {
    id: String(row.id),
    mountain_id: String(row.mountain_id ?? ""),
    provider: String(row.provider ?? ""),
    target_slug: String(row.target_slug ?? ""),
    official_agent_id: typeof row.official_agent_id === "string" ? row.official_agent_id : null,
    rules_snapshot: asRecord(row.rules_snapshot),
    submission_policy: asRecord(row.submission_policy),
    disclosure_policy: asRecord(row.disclosure_policy),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

async function safeSelect<T>(
  table: string,
  normalizer: (row: Record<string, unknown>) => T,
  fallback: T[],
  orderBy = "created_at",
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db.from(table).select("*").order(orderBy, { ascending: false });
  if (error) {
    return maybeUseFixtures(error, fallback);
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
    const fallbackRows = maybeUseFixtures(error, fallback);
    return fallbackRows.find((row) => row.id === id) ?? null;
  }

  if (!data) return null;
  return normalizer(data as Record<string, unknown>);
}

async function safeSelectMaybeSingle<T>(
  table: string,
  matchField: string,
  matchValue: string,
  normalizer: (row: Record<string, unknown>) => T,
  fallback: T[],
  predicate: (row: T) => boolean,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db.from(table).select("*").eq(matchField, matchValue).maybeSingle();
  if (error) {
    const fallbackRows = maybeUseFixtures(error, fallback);
    return fallbackRows.find(predicate) ?? null;
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
    updated_at: nowIso(),
  };
  const { data, error } = await db.from(table).update(nextPatch).eq("id", id).select("*").maybeSingle();

  if (error) {
    const fallbackRows = maybeUseFixtures(error, fallback);
    const existing = fallbackRows.find((row) => row.id === id);
    return existing ? ({ ...existing, ...nextPatch } as T) : null;
  }

  if (!data) return null;
  return normalizer(data as Record<string, unknown>);
}

async function loadMountainsRaw() {
  return safeSelect("mountains", normalizeMountain, demoMountains);
}

async function loadCampaignsRaw() {
  return safeSelect("campaigns", normalizeCampaign, demoCampaigns);
}

async function loadWorkSpecsRaw() {
  return safeSelect("work_specs", normalizeWorkSpec, demoWorkSpecs);
}

async function loadWorkLeasesRaw() {
  return safeSelect("work_leases", normalizeWorkLease, demoWorkLeases);
}

async function loadSwarmSessionsRaw() {
  return safeSelect("swarm_sessions", normalizeSwarmSession, demoSwarmSessions);
}

async function loadDeliverablesRaw() {
  return safeSelect("deliverables", normalizeDeliverable, demoDeliverables);
}

async function loadVerificationRunsRaw() {
  return safeSelect("verification_runs", normalizeVerificationRun, demoVerificationRuns);
}

async function loadReplansRaw() {
  return safeSelect("replans", normalizeReplan, demoReplans);
}

async function loadRewardSplitsRaw() {
  return safeSelect("reward_splits", normalizeRewardSplit, demoRewardSplits);
}

async function loadCapabilityProfilesRaw() {
  return safeSelect("agent_capability_profiles", normalizeCapabilityProfile, []);
}

async function loadReputationScoresRaw() {
  return safeSelect("agent_reputation_scores", normalizeReputationScore, []);
}

async function loadMountainMembershipsRaw() {
  return safeSelect("mountain_memberships", normalizeMountainMembership, demoMountainMemberships);
}

async function loadMountainExternalTargetsRaw() {
  return safeSelect(
    "mountain_external_targets",
    normalizeMountainExternalTarget,
    demoMountainExternalTargets,
  );
}

function hasActiveMembership(
  viewer: RuntimeViewer | null | undefined,
  mountainId: string,
  memberships: MountainMembershipRecord[],
) {
  if (!viewer) return false;
  if (isAdmin(viewer)) return true;
  return memberships.some(
    (membership) =>
      membership.mountain_id === mountainId &&
      membership.status === "active" &&
      ((viewer.account_id && membership.account_id === viewer.account_id) ||
        (viewer.agent_id && membership.agent_id === viewer.agent_id)),
  );
}

function canViewMountain(
  viewer: RuntimeViewer | null | undefined,
  mountain: MountainRecord,
  memberships: MountainMembershipRecord[],
) {
  if (mountain.visibility === "public") return true;
  return hasActiveMembership(viewer, mountain.id, memberships);
}

function canViewMountainOperationalData(
  viewer: RuntimeViewer | null | undefined,
  mountainId: string,
  memberships: MountainMembershipRecord[],
) {
  return hasActiveMembership(viewer, mountainId, memberships);
}

function isPublicSafeDeliverable(deliverable: DeliverableRecord) {
  return deliverable.metadata.public_safe !== false;
}

function visibleMountainIds(
  viewer: RuntimeViewer | null | undefined,
  mountains: MountainRecord[],
  memberships: MountainMembershipRecord[],
) {
  return new Set(
    mountains.filter((mountain) => canViewMountain(viewer, mountain, memberships)).map((mountain) => mountain.id),
  );
}

function summarizeMountains(
  mountains: MountainRecord[],
  campaigns: CampaignRecord[],
  workSpecs: WorkSpecRecord[],
  workLeases: WorkLeaseRecord[],
  verificationRuns: VerificationRunRecord[],
  rewardSplits: RewardSplitRecord[],
  externalTargets: MountainExternalTargetRecord[],
): MountainSummary[] {
  return mountains.map((mountain) => {
    const mountainCampaigns = campaigns.filter((campaign) => campaign.mountain_id === mountain.id);
    const mountainSpecs = workSpecs.filter((spec) => spec.mountain_id === mountain.id);
    const mountainLeases = workLeases.filter((lease) => lease.mountain_id === mountain.id);
    const mountainVerifications = verificationRuns.filter(
      (run) => run.mountain_id === mountain.id && run.outcome === "passed",
    );
    const mountainRewards = rewardSplits.filter((reward) => reward.mountain_id === mountain.id);
    const done = mountainSpecs.filter((spec) => spec.status === "verified").length;
    const progressPercent =
      mountainSpecs.length > 0 ? Math.round((done / mountainSpecs.length) * 100) : 0;
    const externalTarget = externalTargets.find((target) => target.mountain_id === mountain.id) ?? null;

    return {
      ...mountain,
      campaign_count: mountainCampaigns.length,
      work_spec_count: mountainSpecs.length,
      active_lease_count: mountainLeases.filter((lease) =>
        ["accepted", "active", "checkpoint_due", "submitted"].includes(lease.status),
      ).length,
      verified_deliverable_count: mountainVerifications.length,
      reward_distributed_credits: Number(
        mountainRewards.reduce((sum, reward) => sum + reward.amount_credits, 0).toFixed(2),
      ),
      progress_percent: progressPercent,
      external_target: externalTarget
        ? {
            provider: externalTarget.provider,
            target_slug: externalTarget.target_slug,
            official_agent_id: externalTarget.official_agent_id,
            metadata: externalTarget.metadata,
          }
        : null,
    };
  });
}

function matchCapability(spec: WorkSpecRecord, capabilityProfile: CapabilityProfileRecord | null) {
  if (!capabilityProfile) return spec.speculative;
  const roleMatch =
    capabilityProfile.preferred_roles.includes(spec.role_type) ||
    capabilityProfile.preferred_roles.some((role) => spec.allowed_role_types.includes(role));
  const domainMatch =
    capabilityProfile.domain_tags.length === 0 ||
    capabilityProfile.domain_tags.some((tag) => spec.title.toLowerCase().includes(tag) || spec.summary.toLowerCase().includes(tag));
  return roleMatch && domainMatch;
}

async function assertMountainExists(mountainId: string) {
  const mountain = await safeSelectOne("mountains", mountainId, normalizeMountain, demoMountains);
  if (!mountain) {
    throw new V2RuntimeError(404, "Mountain not found", "mountain_not_found");
  }
  return mountain;
}

async function assertCampaignLineage(campaignId: string | null | undefined, mountainId: string) {
  if (!campaignId) return null;
  const campaign = await safeSelectOne("campaigns", campaignId, normalizeCampaign, demoCampaigns);
  if (!campaign) {
    throw new V2RuntimeError(404, "Campaign not found", "campaign_not_found");
  }
  if (campaign.mountain_id !== mountainId) {
    throw new V2RuntimeError(409, "Campaign does not belong to the mountain", "campaign_lineage_mismatch");
  }
  return campaign;
}

async function assertWorkSpecLineage(
  workSpecId: string | null | undefined,
  mountainId: string,
  campaignId?: string | null,
) {
  if (!workSpecId) return null;
  const workSpec = await safeSelectOne("work_specs", workSpecId, normalizeWorkSpec, demoWorkSpecs);
  if (!workSpec) {
    throw new V2RuntimeError(404, "Work spec not found", "work_spec_not_found");
  }
  if (workSpec.mountain_id !== mountainId) {
    throw new V2RuntimeError(409, "Work spec does not belong to the mountain", "work_spec_lineage_mismatch");
  }
  if (campaignId && workSpec.campaign_id && workSpec.campaign_id !== campaignId) {
    throw new V2RuntimeError(409, "Work spec does not belong to the campaign", "work_spec_campaign_mismatch");
  }
  return workSpec;
}

async function assertWorkLeaseLineage(
  workLeaseId: string | null | undefined,
  mountainId: string,
  campaignId?: string | null,
  workSpecId?: string | null,
) {
  if (!workLeaseId) return null;
  const workLease = await safeSelectOne("work_leases", workLeaseId, normalizeWorkLease, demoWorkLeases);
  if (!workLease) {
    throw new V2RuntimeError(404, "Work lease not found", "work_lease_not_found");
  }
  if (workLease.mountain_id !== mountainId) {
    throw new V2RuntimeError(409, "Work lease does not belong to the mountain", "work_lease_lineage_mismatch");
  }
  if (campaignId && workLease.campaign_id && workLease.campaign_id !== campaignId) {
    throw new V2RuntimeError(409, "Work lease does not belong to the campaign", "work_lease_campaign_mismatch");
  }
  if (workSpecId && workLease.work_spec_id !== workSpecId) {
    throw new V2RuntimeError(409, "Work lease does not belong to the work spec", "work_lease_spec_mismatch");
  }
  return workLease;
}

async function assertDeliverableLineage(
  deliverableId: string | null | undefined,
  mountainId: string,
  campaignId?: string | null,
  workSpecId?: string | null,
) {
  if (!deliverableId) return null;
  const deliverable = await safeSelectOne(
    "deliverables",
    deliverableId,
    normalizeDeliverable,
    demoDeliverables,
  );
  if (!deliverable) {
    throw new V2RuntimeError(404, "Deliverable not found", "deliverable_not_found");
  }
  if (deliverable.mountain_id !== mountainId) {
    throw new V2RuntimeError(409, "Deliverable does not belong to the mountain", "deliverable_lineage_mismatch");
  }
  if (campaignId && deliverable.campaign_id && deliverable.campaign_id !== campaignId) {
    throw new V2RuntimeError(409, "Deliverable does not belong to the campaign", "deliverable_campaign_mismatch");
  }
  if (workSpecId && deliverable.work_spec_id && deliverable.work_spec_id !== workSpecId) {
    throw new V2RuntimeError(409, "Deliverable does not belong to the work spec", "deliverable_spec_mismatch");
  }
  return deliverable;
}

async function assertViewerCanAccessMountain(viewer: RuntimeViewer | null, mountainId: string) {
  const [mountain, memberships] = await Promise.all([
    assertMountainExists(mountainId),
    loadMountainMembershipsRaw(),
  ]);
  if (!canViewMountain(viewer, mountain, memberships)) {
    throw new V2RuntimeError(403, "Mountain visibility does not allow this operation", "mountain_forbidden");
  }
  return { mountain, memberships };
}

function mergeMetadata(
  currentValue: Record<string, unknown>,
  patch: Record<string, unknown> | null | undefined,
) {
  return {
    ...currentValue,
    ...(patch ?? {}),
  };
}

export async function listMountains(viewer?: RuntimeViewer | null): Promise<MountainSummary[]> {
  const [
    mountains,
    campaigns,
    workSpecs,
    workLeases,
    verificationRuns,
    rewardSplits,
    externalTargets,
    memberships,
  ]: [
    MountainRecord[],
    CampaignRecord[],
    WorkSpecRecord[],
    WorkLeaseRecord[],
    VerificationRunRecord[],
    RewardSplitRecord[],
    MountainExternalTargetRecord[],
    MountainMembershipRecord[],
  ] =
    await Promise.all([
      loadMountainsRaw(),
      loadCampaignsRaw(),
      loadWorkSpecsRaw(),
      loadWorkLeasesRaw(),
      loadVerificationRunsRaw(),
      loadRewardSplitsRaw(),
      loadMountainExternalTargetsRaw(),
      loadMountainMembershipsRaw(),
    ]);

  const filteredMountains = mountains.filter((mountain) => canViewMountain(viewer, mountain, memberships));
  const visibleIds = new Set(filteredMountains.map((mountain) => mountain.id));

  return summarizeMountains(
    filteredMountains,
    campaigns.filter((campaign) => visibleIds.has(campaign.mountain_id)),
    workSpecs.filter((spec) => visibleIds.has(spec.mountain_id)),
    workLeases.filter((lease) => visibleIds.has(lease.mountain_id)),
    verificationRuns.filter((run) => visibleIds.has(run.mountain_id)),
    rewardSplits.filter((reward) => visibleIds.has(reward.mountain_id)),
    externalTargets.filter((target) => visibleIds.has(target.mountain_id)),
  );
}

export async function listCampaigns(viewer?: RuntimeViewer | null): Promise<CampaignRecord[]> {
  const [mountains, campaigns, memberships]: [
    MountainRecord[],
    CampaignRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadCampaignsRaw(),
    loadMountainMembershipsRaw(),
  ]);
  const visibleIds = visibleMountainIds(viewer, mountains, memberships);
  return campaigns.filter((campaign) => visibleIds.has(campaign.mountain_id));
}

export async function listWorkSpecs(viewer?: RuntimeViewer | null): Promise<WorkSpecRecord[]> {
  const [mountains, workSpecs, memberships]: [
    MountainRecord[],
    WorkSpecRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadWorkSpecsRaw(),
    loadMountainMembershipsRaw(),
  ]);
  const visibleIds = visibleMountainIds(viewer, mountains, memberships);
  return workSpecs.filter((spec) => visibleIds.has(spec.mountain_id));
}

export async function listWorkLeases(viewer?: RuntimeViewer | null): Promise<WorkLeaseRecord[]> {
  const [mountains, workLeases, memberships]: [
    MountainRecord[],
    WorkLeaseRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadWorkLeasesRaw(),
    loadMountainMembershipsRaw(),
  ]);
  if (isAdmin(viewer)) return workLeases;
  return workLeases.filter(
    (lease) =>
      lease.assigned_agent_id === viewer?.agent_id ||
      canViewMountainOperationalData(viewer, lease.mountain_id, memberships) ||
      (mountains.find((mountain) => mountain.id === lease.mountain_id)?.visibility === "public" &&
        false),
  );
}

export async function listSwarmSessions(viewer?: RuntimeViewer | null): Promise<SwarmSessionRecord[]> {
  const [mountains, swarmSessions, memberships]: [
    MountainRecord[],
    SwarmSessionRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadSwarmSessionsRaw(),
    loadMountainMembershipsRaw(),
  ]);
  const visibleIds = visibleMountainIds(viewer, mountains, memberships);
  return swarmSessions.filter((session) => visibleIds.has(session.mountain_id));
}

export async function listDeliverables(viewer?: RuntimeViewer | null): Promise<DeliverableRecord[]> {
  const [mountains, deliverables, memberships]: [
    MountainRecord[],
    DeliverableRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadDeliverablesRaw(),
    loadMountainMembershipsRaw(),
  ]);
  return deliverables.filter((deliverable) => {
    const mountain = mountains.find((candidate) => candidate.id === deliverable.mountain_id);
    if (!mountain) return false;
    if (isAdmin(viewer)) return true;
    if (deliverable.agent_id && viewer?.agent_id === deliverable.agent_id) return true;
    if (mountain.visibility === "public") return isPublicSafeDeliverable(deliverable);
    return hasActiveMembership(viewer, mountain.id, memberships);
  });
}

export async function listVerificationRuns(viewer?: RuntimeViewer | null): Promise<VerificationRunRecord[]> {
  const [mountains, verificationRuns, memberships]: [
    MountainRecord[],
    VerificationRunRecord[],
    MountainMembershipRecord[],
  ] = await Promise.all([
    loadMountainsRaw(),
    loadVerificationRunsRaw(),
    loadMountainMembershipsRaw(),
  ]);
  if (isAdmin(viewer)) return verificationRuns;
  return verificationRuns.filter((run) => {
    const mountain = mountains.find((candidate) => candidate.id === run.mountain_id);
    if (!mountain) return false;
    return run.verifier_agent_id === viewer?.agent_id || hasActiveMembership(viewer, mountain.id, memberships);
  });
}

export async function listReplans(viewer?: RuntimeViewer | null): Promise<ReplanRecord[]> {
  if (!isAdmin(viewer)) return [];
  return loadReplansRaw();
}

export async function listRewardSplits(viewer?: RuntimeViewer | null): Promise<RewardSplitRecord[]> {
  const rewards: RewardSplitRecord[] = await loadRewardSplitsRaw();
  if (isAdmin(viewer)) return rewards;
  return rewards.filter(
    (reward) =>
      reward.beneficiary_agent_id === viewer?.agent_id ||
      reward.beneficiary_account_id === viewer?.account_id,
  );
}

export async function listRewards(viewer?: RuntimeViewer | null): Promise<RewardRecord[]> {
  return listRewardSplits(viewer);
}

export async function getMountain(id: string, viewer?: RuntimeViewer | null) {
  const [mountain, summaries] = await Promise.all([
    safeSelectOne("mountains", id, normalizeMountain, demoMountains),
    listMountains(viewer),
  ]);
  if (!mountain) return null;
  const summary = summaries.find((candidate) => candidate.id === id);
  if (!summary) return null;
  return summary;
}

export async function getCampaign(id: string, viewer?: RuntimeViewer | null) {
  const campaign = await safeSelectOne("campaigns", id, normalizeCampaign, demoCampaigns);
  if (!campaign) return null;
  await assertViewerCanAccessMountain(viewer ?? null, campaign.mountain_id);
  return campaign;
}

export async function getWorkSpec(id: string, viewer?: RuntimeViewer | null) {
  const workSpec = await safeSelectOne("work_specs", id, normalizeWorkSpec, demoWorkSpecs);
  if (!workSpec) return null;
  await assertViewerCanAccessMountain(viewer ?? null, workSpec.mountain_id);
  return workSpec;
}

export async function getWorkLease(id: string, viewer?: RuntimeViewer | null) {
  const workLease = await safeSelectOne("work_leases", id, normalizeWorkLease, demoWorkLeases);
  if (!workLease) return null;
  const { memberships } = await assertViewerCanAccessMountain(viewer ?? null, workLease.mountain_id);
  if (
    !isAdmin(viewer) &&
    workLease.assigned_agent_id !== viewer?.agent_id &&
    !hasActiveMembership(viewer, workLease.mountain_id, memberships)
  ) {
    return null;
  }
  return workLease;
}

export async function getSwarmSession(id: string, viewer?: RuntimeViewer | null) {
  const swarmSession = await safeSelectOne("swarm_sessions", id, normalizeSwarmSession, demoSwarmSessions);
  if (!swarmSession) return null;
  await assertViewerCanAccessMountain(viewer ?? null, swarmSession.mountain_id);
  return swarmSession;
}

export async function getDeliverable(id: string, viewer?: RuntimeViewer | null) {
  const deliverable = await safeSelectOne("deliverables", id, normalizeDeliverable, demoDeliverables);
  if (!deliverable) return null;
  const mountain = await safeSelectOne("mountains", deliverable.mountain_id, normalizeMountain, demoMountains);
  const memberships = await loadMountainMembershipsRaw();
  if (!mountain) return null;
  if (isAdmin(viewer)) return deliverable;
  if (deliverable.agent_id && viewer?.agent_id === deliverable.agent_id) return deliverable;
  if (mountain.visibility === "public" && isPublicSafeDeliverable(deliverable)) return deliverable;
  if (hasActiveMembership(viewer, mountain.id, memberships)) return deliverable;
  return null;
}

export async function getVerificationRun(id: string, viewer?: RuntimeViewer | null) {
  const verificationRun = await safeSelectOne(
    "verification_runs",
    id,
    normalizeVerificationRun,
    demoVerificationRuns,
  );
  if (!verificationRun) return null;
  const memberships = await loadMountainMembershipsRaw();
  if (
    isAdmin(viewer) ||
    verificationRun.verifier_agent_id === viewer?.agent_id ||
    hasActiveMembership(viewer, verificationRun.mountain_id, memberships)
  ) {
    return verificationRun;
  }
  return null;
}

export async function getReward(id: string, viewer?: RuntimeViewer | null) {
  const reward = await safeSelectOne("reward_splits", id, normalizeRewardSplit, demoRewardSplits);
  if (!reward) return null;
  if (
    isAdmin(viewer) ||
    reward.beneficiary_agent_id === viewer?.agent_id ||
    reward.beneficiary_account_id === viewer?.account_id
  ) {
    return reward;
  }
  return null;
}

export async function getMountainDossier(
  mountainId: string,
  viewer?: RuntimeViewer | null,
): Promise<MountainDossier | null> {
  const [
    mountain,
    campaigns,
    workSpecs,
    deliverables,
    swarmSessions,
    verificationRuns,
    rewardSplits,
    externalTargets,
    summaries,
  ]: [
    MountainRecord | null,
    CampaignRecord[],
    WorkSpecRecord[],
    DeliverableRecord[],
    SwarmSessionRecord[],
    VerificationRunRecord[],
    RewardSplitRecord[],
    MountainExternalTargetRecord[],
    MountainSummary[],
  ] = await Promise.all([
    safeSelectOne("mountains", mountainId, normalizeMountain, demoMountains),
    listCampaigns(viewer),
    listWorkSpecs(viewer),
    listDeliverables(viewer),
    listSwarmSessions(viewer),
    listVerificationRuns(viewer),
    listRewardSplits(viewer),
    loadMountainExternalTargetsRaw(),
    listMountains(viewer),
  ]);

  if (!mountain) return null;
  const summary = summaries.find((candidate) => candidate.id === mountainId);
  if (!summary) return null;
  const externalTarget = externalTargets.find((target) => target.mountain_id === mountainId) ?? null;
  const mountainDeliverables = deliverables.filter((deliverable) => deliverable.mountain_id === mountainId);

  return {
    mountain: summary,
    external_target: externalTarget,
    campaigns: campaigns.filter((campaign) => campaign.mountain_id === mountainId),
    work_specs: workSpecs.filter((spec) => spec.mountain_id === mountainId),
    deliverables: mountainDeliverables,
    swarm_sessions: swarmSessions.filter((session) => session.mountain_id === mountainId),
    verification_runs: verificationRuns.filter((run) => run.mountain_id === mountainId),
    reward_splits: rewardSplits.filter((reward) => reward.mountain_id === mountainId),
    panel_summary: {
      public_artifact_count: mountainDeliverables.filter(isPublicSafeDeliverable).length,
      active_campaign_count: campaigns.filter(
        (campaign) => campaign.mountain_id === mountainId && campaign.status === "active",
      ).length,
      active_work_spec_count: workSpecs.filter(
        (spec) =>
          spec.mountain_id === mountainId &&
          ["ready", "in_progress", "blocked", "submitted"].includes(spec.status),
      ).length,
      official_agent_id: externalTarget?.official_agent_id ?? null,
      question_coverage:
        typeof externalTarget?.metadata.question_coverage === "number"
          ? Number(externalTarget.metadata.question_coverage)
          : null,
      forecast_count:
        typeof externalTarget?.metadata.forecast_count === "number"
          ? Number(externalTarget.metadata.forecast_count)
          : null,
      comment_compliance_rate:
        typeof externalTarget?.metadata.comment_compliance_rate === "number"
          ? Number(externalTarget.metadata.comment_compliance_rate)
          : null,
      leaderboard_status:
        typeof externalTarget?.metadata.leaderboard_status === "string"
          ? externalTarget.metadata.leaderboard_status
          : null,
    },
  };
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
    const [
      mountains,
      campaigns,
      work_specs,
      work_leases,
      deliverables,
      verification_runs,
      replans,
      reward_splits,
      swarm_sessions,
    ]: [
      MountainSummary[],
      CampaignRecord[],
      WorkSpecRecord[],
      WorkLeaseRecord[],
      DeliverableRecord[],
      VerificationRunRecord[],
      ReplanRecord[],
      RewardSplitRecord[],
      SwarmSessionRecord[],
    ] =
      await Promise.all([
        listMountains({ account_id: null, agent_id: null, accountRole: "admin", permissions: [] }),
        loadCampaignsRaw(),
        loadWorkSpecsRaw(),
        loadWorkLeasesRaw(),
        loadDeliverablesRaw(),
        loadVerificationRunsRaw(),
        loadReplansRaw(),
        loadRewardSplitsRaw(),
        loadSwarmSessionsRaw(),
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
  } catch (error) {
    if (FIXTURES_ENABLED) {
      return {
        ...buildDemoSupervisorOverview(),
        mountains: summarizeMountains(
          demoMountains,
          demoCampaigns,
          demoWorkSpecs,
          demoWorkLeases,
          demoVerificationRuns,
          demoRewardSplits,
          demoMountainExternalTargets,
        ),
      };
    }
    throw error;
  }
}

export async function getSupervisorSummary(): Promise<SupervisorSummary> {
  const overview = await getSupervisorOverview();

  return {
    overview: {
      active_mountains: overview.mountains.filter((mountain) => mountain.status === "active").length,
      active_campaigns: overview.campaigns.filter((campaign) => campaign.status === "active").length,
      queued_work_specs: overview.work_specs.filter((spec) =>
        ["queued", "ready", "blocked"].includes(spec.status),
      ).length,
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
    const viewer: RuntimeViewer = {
      account_id: null,
      agent_id: agentId,
      accountRole: "user",
      permissions: ["mission:agent"],
    };
    const [
      mountains,
      campaigns,
      workSpecs,
      workLeases,
      verificationRuns,
      swarmSessions,
      capabilityProfiles,
      reputationScores,
    ]: [
      MountainSummary[],
      CampaignRecord[],
      WorkSpecRecord[],
      WorkLeaseRecord[],
      VerificationRunRecord[],
      SwarmSessionRecord[],
      CapabilityProfileRecord[],
      ReputationScoreRecord[],
    ] =
      await Promise.all([
        listMountains(viewer),
        listCampaigns(viewer),
        listWorkSpecs(viewer),
        listWorkLeases(viewer),
        listVerificationRuns(viewer),
        listSwarmSessions(viewer),
        loadCapabilityProfilesRaw(),
        loadReputationScoresRaw(),
      ]);

    const capabilityProfile =
      capabilityProfiles.find((candidate) => candidate.agent_id === agentId) ??
      buildDemoAgentRuntime().mission_context.capability_profile;
    const reputation =
      reputationScores.find((candidate) => candidate.agent_id === agentId) ??
      buildDemoAgentRuntime().mission_context.reputation;

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
        matchCapability(spec, capabilityProfile ?? null),
    );
    const lifecycle = await getAgentLifecycleRecord(agentId);
    const lifecycleState = lifecycle?.lifecycle_state ?? "claimed";
    const inBootstrap =
      lifecycleState === "sandbox" || lifecycleState === "connected_unclaimed";

    if (inBootstrap && currentAssignments.length === 0) {
      currentAssignments.push({
        lease_id: `bootstrap-${agentId}`,
        work_spec_id: `bootstrap-runtime-preview-${agentId}`,
        mountain_id: mountains[0]?.id ?? "bootstrap-preview",
        campaign_id: campaigns[0]?.id ?? null,
        title: "Verify your OpenClaw runtime link",
        summary:
          "Pass the first heartbeat, confirm the runtime endpoint responds, and inspect the starter mission preview before upgrading to a durable identity.",
        role_type: "bootstrap",
        status: "active",
        checkpoint_due_at: null,
        expires_at: lifecycle?.bootstrap_expires_at ?? null,
        reward_envelope: { mode: "sandbox_preview", credits: 0 },
        rationale:
          "This starter assignment exists to help brand-new OpenClaw users verify that TokenBook is live before they worry about custody, treasury, or public identity.",
      });
    }

    return {
      current_assignments: currentAssignments,
      checkpoint_deadlines: currentAssignments
        .filter((assignment) => assignment.checkpoint_due_at)
        .sort(
          (a, b) =>
            new Date(a.checkpoint_due_at ?? 0).getTime() -
            new Date(b.checkpoint_due_at ?? 0).getTime(),
        ),
      blocked_items: currentAssignments.filter((assignment) => assignment.status === "checkpoint_due"),
      coalition_invites: swarmSessions.filter((session) => session.status === "forming"),
      verification_requests: verificationRuns.filter(
        (run) => run.verifier_agent_id === agentId || run.outcome === "needs_replication",
      ),
      recommended_speculative_lines: recommendedSpeculativeLines,
      mission_context: {
        mountains,
        campaigns,
        capability_profile: capabilityProfile ?? null,
        reputation: reputation ?? null,
      },
      supervisor_messages: [
        ...(inBootstrap
          ? [
              {
                id: "message-bootstrap-mode",
                tone: "directive" as const,
                subject: "Bootstrap mode",
                detail:
                  "You are in the low-friction OpenClaw bootstrap lane. First prove liveness, then upgrade to a durable identity when you want public contribution history or treasury access.",
              },
            ]
          : []),
        {
          id: "message-assign-why",
          tone: "directive",
          subject: "Assignment logic",
          detail:
            "You are being routed by capability fit, mission reliability, and role preference instead of the old ranked marketplace queue.",
        },
        {
          id: "message-checkpoint",
          tone: "warning",
          subject: "Checkpoint discipline",
          detail:
            "Every active lease needs evidence before renewal. Missing a checkpoint can now trigger reassignment or escalation.",
        },
        {
          id: "message-metaculus",
          tone: "opportunity",
          subject: "Metaculus summit",
          detail:
            "The canonical public summit is the Spring AI Benchmark forecasting program. Comments and compliance matter as much as raw forecast quality.",
        },
      ],
      bootstrap: {
        mode: lifecycleState,
        durable_identity_eligible: lifecycleState !== "claimed",
        sandbox_capability_flags: sandboxCapabilityFlags(lifecycleState),
        first_success_hint: inBootstrap
          ? "Send one successful heartbeat and refresh your runtime status to unlock the first-success milestone."
          : null,
      },
    };
  } catch (error) {
    if (FIXTURES_ENABLED) {
      const runtime = buildDemoAgentRuntime();
      runtime.mission_context.mountains = summarizeMountains(
        demoMountains,
        demoCampaigns,
        demoWorkSpecs,
        demoWorkLeases,
        demoVerificationRuns,
        demoRewardSplits,
        demoMountainExternalTargets,
      );
      return runtime;
    }
    throw error;
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
  await assertMountainExists(input.mountainId);
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
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
  await assertMountainExists(input.mountainId);
  const workSpec = await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("work_leases")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? workSpec?.campaign_id ?? null,
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
  await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
  const workSpec = await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
  const workLease = await assertWorkLeaseLineage(
    input.workLeaseId,
    input.mountainId,
    input.campaignId,
    input.workSpecId ?? undefined,
  );

  if (workLease && input.agentId && workLease.assigned_agent_id && workLease.assigned_agent_id !== input.agentId) {
    throw new V2RuntimeError(
      403,
      "Deliverable agent must match the assigned work lease agent",
      "deliverable_agent_mismatch",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from("deliverables")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? workSpec?.campaign_id ?? workLease?.campaign_id ?? null,
      work_spec_id: input.workSpecId ?? workLease?.work_spec_id ?? null,
      work_lease_id: input.workLeaseId ?? null,
      agent_id: input.agentId ?? workLease?.assigned_agent_id ?? null,
      deliverable_type: input.deliverableType,
      title: input.title,
      summary: input.summary,
      evidence_bundle: input.evidenceBundle ?? [],
      claims: input.claims ?? [],
      references_bundle: input.referencesBundle ?? [],
      artifact_url: input.artifactUrl ?? null,
      metadata: {
        public_safe: true,
      },
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
  await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
  await assertDeliverableLineage(input.deliverableId, input.mountainId, input.campaignId, input.workSpecId);
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
  await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
  await assertWorkLeaseLineage(input.workLeaseId, input.mountainId, input.campaignId, input.workSpecId);
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
  await assertMountainExists(input.mountainId);
  await assertCampaignLineage(input.campaignId, input.mountainId);
  await assertWorkSpecLineage(input.workSpecId, input.mountainId, input.campaignId);
  await assertWorkLeaseLineage(input.workLeaseId, input.mountainId, input.campaignId, input.workSpecId);
  await assertDeliverableLineage(input.deliverableId, input.mountainId, input.campaignId, input.workSpecId);
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

export async function acceptWorkLease(input: {
  viewer: RuntimeViewer;
  workLeaseId: string;
}) {
  const workLease = await safeSelectOne("work_leases", input.workLeaseId, normalizeWorkLease, demoWorkLeases);
  if (!workLease) {
    throw new V2RuntimeError(404, "Work lease not found", "work_lease_not_found");
  }
  if (!isAdmin(input.viewer) && workLease.assigned_agent_id !== input.viewer.agent_id) {
    throw new V2RuntimeError(403, "Only the assigned agent can accept this lease", "lease_forbidden");
  }
  if (!["offered", "reassigned"].includes(workLease.status)) {
    throw new V2RuntimeError(409, "Work lease is not in an accept-ready state", "lease_status_invalid");
  }
  const rawLeaseToken = randomBytes(24).toString("hex");
  const acceptedAt = nowIso();
  const updated = await updateWorkLease(input.workLeaseId, {
    status: "accepted",
    accepted_at: acceptedAt,
    started_at: workLease.started_at ?? acceptedAt,
    lease_token_hash: hashKey(rawLeaseToken),
  });
  if (!updated) {
    throw new V2RuntimeError(404, "Work lease not found", "work_lease_not_found");
  }
  return { work_lease: updated, lease_token: rawLeaseToken };
}

export async function submitWorkLeaseCheckpoint(input: {
  viewer: RuntimeViewer;
  workLeaseId: string;
  leaseToken?: string | null;
  progress: string;
  evidence: JsonRecord[];
  blockers: string[];
  submitForVerification?: boolean;
  nextCheckpointDueAt?: string | null;
  metadata?: JsonRecord;
}) {
  const workLease = await safeSelectOne("work_leases", input.workLeaseId, normalizeWorkLease, demoWorkLeases);
  if (!workLease) {
    throw new V2RuntimeError(404, "Work lease not found", "work_lease_not_found");
  }
  if (!isAdmin(input.viewer) && workLease.assigned_agent_id !== input.viewer.agent_id) {
    throw new V2RuntimeError(403, "Only the assigned agent can checkpoint this lease", "lease_forbidden");
  }
  if (!["accepted", "active", "checkpoint_due"].includes(workLease.status)) {
    throw new V2RuntimeError(409, "Work lease cannot accept checkpoints in the current state", "lease_status_invalid");
  }
  const persistedHash = workLease.lease_token_hash ?? undefined;
  const nextStatus = input.submitForVerification ? "submitted" : "active";
  const checkpointPayload = {
    ...workLease.checkpoint_payload,
    progress: input.progress,
    evidence: input.evidence,
    blockers: input.blockers,
    last_checkpoint_at: nowIso(),
  };

  if (
    persistedHash &&
    !isAdmin(input.viewer) &&
    hashKey(input.leaseToken?.trim() || "") !== persistedHash
  ) {
    throw new V2RuntimeError(403, "Lease token is missing or invalid", "lease_token_invalid");
  }

  const updated = await updateWorkLease(input.workLeaseId, {
    status: nextStatus,
    checkpoint_payload: checkpointPayload,
    checkpoint_due_at: input.submitForVerification ? workLease.checkpoint_due_at : input.nextCheckpointDueAt ?? workLease.checkpoint_due_at,
    submitted_at: input.submitForVerification ? nowIso() : workLease.submitted_at,
    metadata: mergeMetadata(workLease.metadata, input.metadata),
  });
  if (!updated) {
    throw new V2RuntimeError(404, "Work lease not found", "work_lease_not_found");
  }
  return updated;
}

export async function completeDeliverableVerification(input: {
  viewer: RuntimeViewer;
  deliverableId: string;
  verificationRunId: string;
  outcome: VerificationRunRecord["outcome"];
  findings?: JsonRecord[];
  evidenceBundle?: JsonRecord[];
  confidenceDelta?: number;
  contradictionCount?: number;
}) {
  const [deliverable, verificationRun] = await Promise.all([
    safeSelectOne("deliverables", input.deliverableId, normalizeDeliverable, demoDeliverables),
    safeSelectOne(
      "verification_runs",
      input.verificationRunId,
      normalizeVerificationRun,
      demoVerificationRuns,
    ),
  ]);
  if (!deliverable) {
    throw new V2RuntimeError(404, "Deliverable not found", "deliverable_not_found");
  }
  if (!verificationRun) {
    throw new V2RuntimeError(404, "Verification run not found", "verification_not_found");
  }
  if (verificationRun.deliverable_id !== deliverable.id) {
    throw new V2RuntimeError(409, "Verification run does not belong to deliverable", "verification_mismatch");
  }
  if (!isAdmin(input.viewer) && verificationRun.verifier_agent_id !== input.viewer.agent_id) {
    throw new V2RuntimeError(403, "Only the verifier or admin can complete verification", "verification_forbidden");
  }
  if (verificationRun.outcome !== "pending" && verificationRun.outcome !== "needs_replication") {
    throw new V2RuntimeError(409, "Verification run is already complete", "verification_status_invalid");
  }

  const completed = await updateVerificationRun(verificationRun.id, {
    outcome: input.outcome,
    findings: input.findings ?? [],
    evidence_bundle: input.evidenceBundle ?? [],
    confidence_delta: input.confidenceDelta ?? 0,
    contradiction_count: input.contradictionCount ?? 0,
    completed_at: nowIso(),
  });
  if (!completed) {
    throw new V2RuntimeError(404, "Verification run not found", "verification_not_found");
  }

  if (deliverable.work_lease_id) {
    await updateWorkLease(deliverable.work_lease_id, {
      status:
        input.outcome === "passed"
          ? "verified"
          : input.outcome === "failed"
            ? "failed"
            : input.outcome === "contradiction"
              ? "checkpoint_due"
              : "submitted",
      verified_at: input.outcome === "passed" ? nowIso() : null,
      failure_reason:
        input.outcome === "failed" || input.outcome === "contradiction"
          ? `Verification outcome: ${input.outcome}`
          : null,
    });
  }

  if (deliverable.work_spec_id) {
    await updateWorkSpec(deliverable.work_spec_id, {
      status:
        input.outcome === "passed"
          ? "verified"
          : input.outcome === "failed"
            ? "failed"
            : input.outcome === "contradiction"
              ? "blocked"
              : "submitted",
    });
  }

  return completed;
}

export async function settleReward(input: {
  viewer: RuntimeViewer;
  rewardId: string;
  settlementReference?: string | null;
  metadata?: JsonRecord;
}) {
  if (!isAdmin(input.viewer)) {
    throw new V2RuntimeError(403, "Only admin can settle rewards", "reward_forbidden");
  }
  const reward = await safeSelectOne("reward_splits", input.rewardId, normalizeRewardSplit, demoRewardSplits);
  if (!reward) {
    throw new V2RuntimeError(404, "Reward not found", "reward_not_found");
  }
  if (reward.settlement_status === "settled") {
    throw new V2RuntimeError(409, "Reward is already settled", "reward_already_settled");
  }
  const updated = await updateReward(input.rewardId, {
    settlement_status: "settled",
    metadata: mergeMetadata(reward.metadata, {
      ...(input.metadata ?? {}),
      settlement_reference: input.settlementReference ?? null,
      settled_at: nowIso(),
    }),
  });
  if (!updated) {
    throw new V2RuntimeError(404, "Reward not found", "reward_not_found");
  }
  return updated;
}

export async function issueSupervisorReplan(input: {
  viewer: RuntimeViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  workLeaseId?: string | null;
  reason: ReplanRecord["reason"];
  action: string;
  summary: string;
  payload?: JsonRecord;
}) {
  if (!isAdmin(input.viewer)) {
    throw new V2RuntimeError(403, "Only admin can issue supervisor replans", "replan_forbidden");
  }
  return createReplan({
    mountainId: input.mountainId,
    campaignId: input.campaignId,
    workSpecId: input.workSpecId,
    workLeaseId: input.workLeaseId,
    issuedByAccountId: input.viewer.account_id,
    reason: input.reason,
    action: input.action,
    summary: input.summary,
    payload: input.payload,
  });
}

export async function recordOfficialSubmission(input: {
  viewer: RuntimeViewer;
  mountainId: string;
  questionId: string;
  probability: number;
  commentPosted: boolean;
  submittedByAgentId?: string | null;
  notes?: string | null;
}) {
  if (!isAdmin(input.viewer)) {
    throw new V2RuntimeError(403, "Only admin can record official submissions", "submission_forbidden");
  }
  const externalTarget = await safeSelectMaybeSingle(
    "mountain_external_targets",
    "mountain_id",
    input.mountainId,
    normalizeMountainExternalTarget,
    demoMountainExternalTargets,
    (row) => row.mountain_id === input.mountainId,
  );
  if (!externalTarget) {
    throw new V2RuntimeError(404, "External target not configured for mountain", "external_target_not_found");
  }
  if (
    input.submittedByAgentId &&
    externalTarget.official_agent_id &&
    externalTarget.official_agent_id !== input.submittedByAgentId
  ) {
    throw new V2RuntimeError(
      409,
      "Submitted agent does not match the configured official agent",
      "official_agent_mismatch",
    );
  }
  const forecastCount = Number(externalTarget.metadata.forecast_count ?? 0) + 1;
  const commentCount = Number(externalTarget.metadata.comment_count ?? 0) + (input.commentPosted ? 1 : 0);
  const metadata = {
    ...externalTarget.metadata,
    forecast_count: forecastCount,
    comment_count: commentCount,
    comment_compliance_rate: forecastCount > 0 ? Number((commentCount / forecastCount).toFixed(4)) : 0,
    last_sync_at: nowIso(),
    last_submission: {
      question_id: input.questionId,
      probability: input.probability,
      comment_posted: input.commentPosted,
      submitted_by_agent_id: input.submittedByAgentId ?? externalTarget.official_agent_id,
      notes: input.notes ?? null,
      submitted_at: nowIso(),
    },
  };
  const updated = await safeUpdateOne(
    "mountain_external_targets",
    externalTarget.id,
    { metadata },
    normalizeMountainExternalTarget,
    demoMountainExternalTargets,
  );
  if (!updated) {
    throw new V2RuntimeError(404, "External target not found", "external_target_not_found");
  }
  return updated;
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
      (asTrimmedString(
        payload.settlement_policy_mode,
      ) as MountainRecord["settlement_policy_mode"] | null) ?? "dynamic_difficulty",
    settlementPolicy: asRecord(payload.settlement_policy),
    tags: asStringArray(payload.tags),
  };
}

export function runtimeFixturesEnabled() {
  return FIXTURES_ENABLED;
}

export function canonicalSummitSlug() {
  return METACULUS_SUMMIT_SLUG;
}
