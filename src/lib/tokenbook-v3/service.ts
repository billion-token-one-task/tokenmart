import { createAdminClient } from "@/lib/supabase/admin";
import { asFiniteNumber, asTrimmedString, isPlainObject } from "@/lib/http/input";
import { getAgentLifecycleRecord } from "@/lib/auth/agent-lifecycle";
import type { Database, Json } from "@/types/database";
import type { MountainSummary } from "@/lib/v2/types";
import { rankMountainFeed, type RankMountainFeedOptions } from "./ranking";
import type {
  AgentDossierView,
  AgentRequestRecord,
  AgentRequestView,
  ArtifactThreadMessageRecord,
  ArtifactThreadMessageView,
  ArtifactThreadRecord,
  ArtifactThreadView,
  CoalitionMemberRecord,
  CoalitionSessionRecord,
  CoalitionSessionView,
  ContradictionClusterRecord,
  ContradictionClusterView,
  FeedActorSummary,
  FeedAuthorAffinityRecord,
  FeedFeedbackInput,
  FeedTab,
  FeedObjectRef,
  MethodCardRecord,
  MethodCardView,
  MissionEventRecord,
  MissionEventView,
  MissionEventVisibility,
  MissionSubscriptionRecord,
  MountainFeedItem,
  MountainFeedQuery,
  MountainFeedResponse,
  PublicSignalPostRecord,
  PublicSignalPostView,
  ReplicationCallRecord,
  ReplicationCallView,
  RuntimeArtifactThreadMention,
  RuntimeCoalitionInvite,
  RuntimeCollaboration,
  RuntimeContradictionAlert,
  RuntimeMethodRecommendation,
  RuntimeReplicationAlert,
  RuntimeStructuredRequest,
  TokenBookViewer,
  TrustRoleScoreRecord,
} from "./types";

type AdminDb = ReturnType<typeof createAdminClient>;
type Db = AdminDb & {
  from: AdminDb["from"];
};

type Tables = Database["public"]["Tables"];
type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type MountainRow = Tables["mountains"]["Row"] & {
  slug?: string | null;
  thesis?: string | null;
  target_problem?: string | null;
  success_criteria?: Json;
  domain?: string | null;
  horizon?: string | null;
  total_budget_credits?: number | string | null;
  budget_envelopes?: Json;
  governance_policy?: Json;
  decomposition_policy?: Json;
  settlement_policy_mode?: string | null;
  settlement_policy?: Json;
  tags?: string[] | null;
  launched_at?: string | null;
  completed_at?: string | null;
};
type CampaignRow = Tables["campaigns"]["Row"];
type DeliverableRow = Tables["deliverables"]["Row"];
type VerificationRunRow = Tables["verification_runs"]["Row"];
type SwarmSessionRow = Tables["swarm_sessions"]["Row"];

type JsonObject = Record<string, Json | undefined>;

interface VisibleContext {
  mountains: MountainSummary[];
  campaigns: CampaignRow[];
  deliverables: DeliverableRow[];
  verificationRuns: VerificationRunRow[];
  swarms: SwarmSessionRow[];
  visibleMountainIds: Set<string>;
}

interface LooseQueryResult<T> {
  data: T[] | null;
  error: Error | null;
}

interface MountainMembershipQuery {
  select(columns: string): {
    or(filters: string): Promise<LooseQueryResult<Record<string, unknown>>>;
  };
}

interface LooseMembershipClient {
  from(name: "mountain_memberships"): MountainMembershipQuery;
}

function db(): Db {
  return createAdminClient() as Db;
}

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value: unknown, fallback = 0) {
  return asFiniteNumber(value) ?? fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? (value as Record<string, unknown>) : {};
}

function toVisibility(value: unknown): MissionEventVisibility {
  if (value === "private" || value === "scoped") return value;
  return "public";
}

function isAdmin(viewer: TokenBookViewer | null) {
  return viewer?.accountRole === "admin" || viewer?.accountRole === "super_admin";
}

function severityValue(raw: string | number | null | undefined) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  const normalized = String(raw ?? "").toLowerCase();
  switch (normalized) {
    case "critical":
      return 100;
    case "high":
      return 82;
    case "medium":
      return 62;
    case "low":
      return 38;
    default:
      return 50;
  }
}

function urgencyValue(raw: string | number | null | undefined) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  const normalized = String(raw ?? "").toLowerCase();
  switch (normalized) {
    case "critical":
      return 100;
    case "high":
      return 78;
    case "medium":
      return 56;
    case "low":
      return 34;
    default:
      return 48;
  }
}

function mountainSummaryFromRow(
  row: MountainRow,
  counts: {
    campaignCount?: number;
    workSpecCount?: number;
    activeLeaseCount?: number;
    verifiedDeliverables?: number;
  } = {},
): MountainSummary {
  const metadata = toJsonObject(row.metadata);
  return {
    id: String(row.id ?? ""),
    slug: asTrimmedString(row.slug),
    title: String(row.title ?? ""),
    thesis: String(row.thesis ?? row.summary ?? row.description ?? ""),
    target_problem: String(row.target_problem ?? row.target_outcome ?? ""),
    success_criteria: String(row.success_criteria ?? ""),
    domain: String(row.domain ?? metadata.domain ?? "general"),
    horizon: String(row.horizon ?? metadata.horizon ?? ""),
    visibility: toVisibility(metadata.visibility) as MountainSummary["visibility"],
    status: String(row.status ?? "active") as MountainSummary["status"],
    created_by_account_id: String(row.created_by_account_id ?? ""),
    total_budget_credits: toNumber(row.total_budget_credits),
    budget_envelopes: {
      decomposition: toNumber(toJsonObject(row.budget_envelopes).decomposition),
      execution: toNumber(toJsonObject(row.budget_envelopes).execution),
      replication: toNumber(toJsonObject(row.budget_envelopes).replication),
      synthesis: toNumber(toJsonObject(row.budget_envelopes).synthesis),
      emergency: toNumber(toJsonObject(row.budget_envelopes).emergency),
    },
    governance_policy: toJsonObject(row.governance_policy),
    decomposition_policy: toJsonObject(row.decomposition_policy),
    settlement_policy_mode:
      (String(row.settlement_policy_mode ?? "dynamic_difficulty") as MountainSummary["settlement_policy_mode"]),
    settlement_policy: toJsonObject(row.settlement_policy),
    tags: toStringArray(row.tags ?? metadata.tags),
    metadata,
    launched_at: asTrimmedString(row.launched_at),
    completed_at: asTrimmedString(row.completed_at),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
    campaign_count: counts.campaignCount ?? 0,
    work_spec_count: counts.workSpecCount ?? 0,
    active_lease_count: counts.activeLeaseCount ?? 0,
    verified_deliverable_count: counts.verifiedDeliverables ?? 0,
    reward_distributed_credits: toNumber(metadata.reward_distributed_credits),
    progress_percent: toNumber(metadata.progress_percent),
    external_target: null,
  };
}

async function listVisibleContext(viewer: TokenBookViewer | null): Promise<VisibleContext> {
  const client = db();
  const [mountainsRes, campaignsRes, deliverablesRes, verificationRes, swarmsRes, membershipsRes] =
    await Promise.all([
      client.from("mountains").select("*").order("created_at", { ascending: false }),
      client.from("campaigns").select("*"),
      client.from("deliverables").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("verification_runs").select("*").order("created_at", { ascending: false }).limit(160),
      client.from("swarm_sessions").select("*").order("created_at", { ascending: false }).limit(120),
      viewer?.account_id || viewer?.agent_id
        ? (client as unknown as LooseMembershipClient)
            .from("mountain_memberships")
            .select("*")
            .or(
              [
                viewer.account_id ? `account_id.eq.${viewer.account_id}` : null,
                viewer.agent_id ? `agent_id.eq.${viewer.agent_id}` : null,
              ]
                .filter(Boolean)
                .join(","),
            )
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const result of [mountainsRes, campaignsRes, deliverablesRes, verificationRes, swarmsRes, membershipsRes]) {
    if (result.error) throw result.error;
  }

  const membershipMountainIds = new Set(
    ((membershipsRes.data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => String(row.status ?? "active") === "active")
      .map((row) => String(row.mountain_id ?? "")),
  );

  const visibleMountains = (mountainsRes.data ?? []).filter((mountain) => {
    if (isAdmin(viewer)) return true;
    if (toVisibility(toJsonObject(mountain.metadata).visibility) === "public") return true;
    return membershipMountainIds.has(mountain.id);
  });

  const visibleMountainIds = new Set(visibleMountains.map((mountain) => mountain.id));
  const visibleCampaigns = (campaignsRes.data ?? []).filter((campaign) =>
    visibleMountainIds.has(String(campaign.mountain_id ?? "")),
  );
  const visibleDeliverables = (deliverablesRes.data ?? []).filter((deliverable) =>
    visibleMountainIds.has(String(deliverable.mountain_id ?? "")),
  );
  const visibleVerificationRuns = (verificationRes.data ?? []).filter((run) =>
    visibleMountainIds.has(String(run.mountain_id ?? "")),
  );
  const visibleSwarms = (swarmsRes.data ?? []).filter((swarm) =>
    visibleMountainIds.has(String(swarm.mountain_id ?? "")),
  );

  const campaignCounts = new Map<string, number>();
  for (const campaign of visibleCampaigns) {
    const mountainId = String(campaign.mountain_id ?? "");
    campaignCounts.set(mountainId, (campaignCounts.get(mountainId) ?? 0) + 1);
  }
  const verifiedDeliverableCounts = new Map<string, number>();
  for (const deliverable of visibleDeliverables) {
    if (String(deliverable.status ?? "") === "accepted") {
      const mountainId = String(deliverable.mountain_id ?? "");
      verifiedDeliverableCounts.set(
        mountainId,
        (verifiedDeliverableCounts.get(mountainId) ?? 0) + 1,
      );
    }
  }

  return {
    mountains: visibleMountains.map((mountain) =>
      mountainSummaryFromRow(mountain, {
        campaignCount: campaignCounts.get(mountain.id) ?? 0,
        verifiedDeliverables: verifiedDeliverableCounts.get(mountain.id) ?? 0,
      }),
    ),
    campaigns: visibleCampaigns,
    deliverables: visibleDeliverables,
    verificationRuns: visibleVerificationRuns,
    swarms: visibleSwarms,
    visibleMountainIds,
  };
}

async function loadActors(agentIds: Array<string | null>, accountIds: Array<string | null>) {
  const client = db();
  const uniqueAgentIds = Array.from(new Set(agentIds.filter((value): value is string => Boolean(value))));
  const uniqueAccountIds = Array.from(
    new Set(accountIds.filter((value): value is string => Boolean(value))),
  );
  const [agentsRes, accountsRes] = await Promise.all([
    uniqueAgentIds.length > 0
      ? client.from("agents").select("id,name,harness,trust_tier").in("id", uniqueAgentIds)
      : Promise.resolve({ data: [] as Pick<AgentRow, "id" | "name" | "harness" | "trust_tier">[], error: null }),
    uniqueAccountIds.length > 0
      ? client.from("accounts").select("id,display_name,email").in("id", uniqueAccountIds)
      : Promise.resolve({ data: [] as Pick<AccountRow, "id" | "display_name" | "email">[], error: null }),
  ]);
  if (agentsRes.error) throw agentsRes.error;
  if (accountsRes.error) throw accountsRes.error;

  const agents = new Map(
    (agentsRes.data ?? []).map((agent) => [
      agent.id,
      {
        agent_id: agent.id,
        account_id: null,
        name: agent.name,
        harness: agent.harness,
        trust_tier: agent.trust_tier,
      } satisfies FeedActorSummary,
    ]),
  );
  const accounts = new Map(
    (accountsRes.data ?? []).map((account) => [
      account.id,
      {
        agent_id: null,
        account_id: account.id,
        name: account.display_name ?? account.email,
        harness: "human",
        trust_tier: null,
      } satisfies FeedActorSummary,
    ]),
  );

  return { agents, accounts };
}

function actorFromMaps(
  agents: Map<string, FeedActorSummary>,
  accounts: Map<string, FeedActorSummary>,
  agentId: string | null,
  accountId?: string | null,
): FeedActorSummary | null {
  if (agentId && agents.has(agentId)) return agents.get(agentId)!;
  if (accountId && accounts.has(accountId)) return accounts.get(accountId)!;
  if (agentId) {
    return {
      agent_id: agentId,
      account_id: accountId ?? null,
      name: `Agent ${agentId.slice(0, 8)}`,
      harness: null,
      trust_tier: null,
    };
  }
  if (accountId) {
    return {
      agent_id: null,
      account_id: accountId,
      name: `Operator ${accountId.slice(0, 8)}`,
      harness: "human",
      trust_tier: null,
    };
  }
  return null;
}

function mountainRef(context: VisibleContext, mountainId: string | null) {
  if (!mountainId) return null;
  const mountain = context.mountains.find((entry) => entry.id === mountainId);
  return mountain
    ? {
        id: mountain.id,
        title: mountain.title,
        domain: mountain.domain,
        progress_percent: mountain.progress_percent,
      }
    : null;
}

function countParticipants(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (isPlainObject(value)) return Object.keys(value).length;
  return 0;
}

function baseFeedItem(input: {
  id: string;
  item_type: MountainFeedItem["item_type"];
  kind: MountainFeedItem["kind"];
  created_at: string;
  published_at?: string;
  title: string;
  summary: string;
  tone: MountainFeedItem["tone"];
  visibility: MissionEventVisibility;
  mission_relevance: number;
  reward_relevance: number;
  action_likelihood: number;
  trust_signal: number;
  urgency: number;
  reward_credits: number;
  tags?: string[];
  reasons?: string[];
  badges?: string[];
  actor: FeedActorSummary | null;
  mountain: MountainFeedItem["mountain"];
  object_ref: FeedObjectRef;
  rank_reason: string;
  stats?: Partial<MountainFeedItem["stats"]>;
  metadata?: Record<string, unknown>;
  href?: string | null;
}): MountainFeedItem {
  return {
    id: input.id,
    item_type: input.item_type,
    kind: input.kind,
    created_at: input.created_at,
    published_at: input.published_at ?? input.created_at,
    title: input.title,
    summary: input.summary,
    tone: input.tone,
    visibility: input.visibility,
    score: 0,
    freshness_score: 0,
    relevance_score: input.mission_relevance,
    trust_score: input.trust_signal,
    mission_relevance: input.mission_relevance,
    reward_relevance: input.reward_relevance,
    action_likelihood: input.action_likelihood,
    trust_signal: input.trust_signal,
    urgency: input.urgency,
    reward_credits: input.reward_credits,
    tags: input.tags ?? [],
    reasons: input.reasons ?? [],
    badges: input.badges ?? [],
    metrics: [
      { label: "Mission", value: String(input.mission_relevance) },
      { label: "Reward", value: String(input.reward_relevance) },
      { label: "Action", value: String(input.action_likelihood) },
      { label: "Trust", value: String(input.trust_signal) },
    ],
    stats: {
      replies: input.stats?.replies ?? 0,
      participants: input.stats?.participants ?? 0,
      contradictions: input.stats?.contradictions ?? 0,
      reward_credits: input.stats?.reward_credits ?? input.reward_credits,
      reuse_count: input.stats?.reuse_count ?? 0,
    },
    rank_reason: input.rank_reason,
    actor: input.actor,
    author: input.actor,
    mountain: input.mountain,
    object_ref: input.object_ref,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
  };
}

function eventFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: MissionEventRecord,
): MountainFeedItem {
  const scoreHints = toJsonObject(row.score_hints);
  const rewardCredits = toNumber(scoreHints.reward_credits ?? toJsonObject(row.metadata).reward_credits);
  return baseFeedItem({
    id: row.id,
    item_type: "mission_event",
    kind: "event",
    created_at: row.created_at,
    published_at: row.happened_at,
    title: row.title,
    summary: row.summary,
    tone: row.event_type.includes("contradiction") ? "warning" : "neutral",
    visibility: toVisibility(row.visibility),
    mission_relevance: toNumber(scoreHints.mission_relevance, 68),
    reward_relevance: Math.min(100, rewardCredits > 0 ? Math.round(rewardCredits / 10) : 8),
    action_likelihood: toNumber(scoreHints.action_likelihood, 58),
    trust_signal: toNumber(scoreHints.trust_signal, 60),
    urgency: toNumber(scoreHints.urgency, 50),
    reward_credits: rewardCredits,
    tags: toStringArray(toJsonObject(row.metadata).tags),
    reasons: [row.event_type.replace(/_/g, " "), "mission event"],
    badges: [row.event_type.replace(/_/g, " "), "event"],
    actor: actorFromMaps(actors.agents, actors.accounts, row.actor_agent_id, row.actor_account_id),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: row.event_type,
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: row.event_type.replace(/_/g, " "),
    metadata: toJsonObject(row.metadata),
  });
}

function signalPostFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: PublicSignalPostRecord,
): MountainFeedItem {
  const stats = toJsonObject(row.stats);
  return baseFeedItem({
    id: row.id,
    item_type: "signal_post",
    kind: "signal_post",
    created_at: row.created_at,
    title: row.headline,
    summary: row.body,
    tone: "brand",
    visibility: toVisibility(row.visibility),
    mission_relevance: Math.min(100, 42 + toNumber(stats.reposts) * 4 + toNumber(stats.replies) * 2),
    reward_relevance: 0,
    action_likelihood: Math.min(100, 35 + toNumber(stats.replies) * 3 + toNumber(stats.opens) * 2),
    trust_signal: 58,
    urgency: toNumber(stats.urgency, 34),
    reward_credits: 0,
    tags: row.tags ?? [],
    reasons: ["town square", "signal post"],
    badges: [row.signal_type, "signal"],
    actor: actorFromMaps(actors.agents, actors.accounts, row.author_agent_id, row.author_account_id),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "signal_post",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "public signal",
    stats: {
      replies: toNumber(stats.replies),
      participants: toNumber(stats.participants),
      contradictions: 0,
      reward_credits: 0,
      reuse_count: toNumber(stats.reposts),
    },
    metadata: stats,
  });
}

function contradictionFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: ContradictionClusterRecord,
): MountainFeedItem {
  const metadata = toJsonObject(row.metadata);
  const severity = severityValue(row.severity);
  const rewardCredits = toNumber(metadata.reward_credits);
  return baseFeedItem({
    id: row.id,
    item_type: "contradiction_cluster",
    kind: "contradiction",
    created_at: row.created_at,
    published_at: row.updated_at,
    title: row.title,
    summary: row.summary,
    tone: "warning",
    visibility: toVisibility(row.visibility),
    mission_relevance: Math.min(100, 66 + Math.round(severity / 3)),
    reward_relevance: Math.min(100, rewardCredits > 0 ? Math.round(rewardCredits / 12) : 12),
    action_likelihood: 82,
    trust_signal: 68,
    urgency: severity,
    reward_credits: rewardCredits,
    tags: toStringArray(metadata.tags),
    reasons: ["contradiction", "adjudication needed"],
    badges: [row.status, row.severity],
    actor: actorFromMaps(actors.agents, actors.accounts, row.created_by_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "contradiction_cluster",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "contradiction pressure",
    stats: {
      replies: 0,
      participants: 0,
      contradictions: row.linked_deliverable_ids.length,
      reward_credits: rewardCredits,
      reuse_count: 0,
    },
    metadata,
  });
}

function replicationFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: ReplicationCallRecord,
): MountainFeedItem {
  const metadata = toJsonObject(row.metadata);
  const urgency = urgencyValue(row.urgency);
  const rewardCredits = toNumber(row.reward_credits);
  return baseFeedItem({
    id: row.id,
    item_type: "replication_call",
    kind: "replication",
    created_at: row.created_at,
    title: row.title,
    summary: row.summary,
    tone: "warning",
    visibility: toVisibility(row.visibility),
    mission_relevance: Math.min(100, 64 + Math.round(urgency / 4)),
    reward_relevance: Math.min(100, rewardCredits > 0 ? Math.round(rewardCredits / 10) : 8),
    action_likelihood: 88,
    trust_signal: 62,
    urgency,
    reward_credits: rewardCredits,
    tags: row.domain_tags ?? [],
    reasons: ["replication opportunity", "verification pressure"],
    badges: [row.status, row.urgency],
    actor: actorFromMaps(actors.agents, actors.accounts, row.created_by_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "replication_call",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "reward-backed replication",
    stats: {
      replies: 0,
      participants: 0,
      contradictions: row.contradiction_cluster_id ? 1 : 0,
      reward_credits: rewardCredits,
      reuse_count: 0,
    },
    metadata,
  });
}

function coalitionFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: CoalitionSessionRecord,
  memberCount: number,
): MountainFeedItem {
  const reliability = toNumber(row.reliability_score, 50);
  const splitPolicy = toJsonObject(row.reward_split_policy);
  const rewardCredits = toNumber(splitPolicy.pool_credits);
  const metadata = toJsonObject(row.metadata);
  return baseFeedItem({
    id: row.id,
    item_type: "coalition_session",
    kind: "coalition",
    created_at: row.created_at,
    published_at: row.updated_at,
    title: row.title,
    summary: row.objective,
    tone: "success",
    visibility: toVisibility(row.visibility),
    mission_relevance: Math.min(100, 58 + Math.round(reliability / 3)),
    reward_relevance: Math.min(100, rewardCredits > 0 ? Math.round(rewardCredits / 10) : 10),
    action_likelihood: 72,
    trust_signal: reliability,
    urgency: toNumber(metadata.urgency, 42),
    reward_credits: rewardCredits,
    tags: toStringArray(metadata.tags),
    reasons: ["coalition forming", "coordination opportunity"],
    badges: [row.status, "coalition"],
    actor: actorFromMaps(actors.agents, actors.accounts, row.created_by_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "coalition_session",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "coalition formation",
    stats: {
      replies: 0,
      participants: memberCount,
      contradictions: 0,
      reward_credits: rewardCredits,
      reuse_count: 0,
    },
    metadata,
  });
}

function methodFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: MethodCardRecord,
): MountainFeedItem {
  const metadata = toJsonObject(row.metadata);
  const usefulness = toNumber(row.usefulness_score, 50);
  return baseFeedItem({
    id: row.id,
    item_type: "method_card",
    kind: "method",
    created_at: row.created_at,
    published_at: row.updated_at,
    title: row.title,
    summary: row.summary,
    tone: "neutral",
    visibility: toVisibility(row.visibility),
    mission_relevance: Math.min(100, 56 + Math.round(usefulness / 3)),
    reward_relevance: 18,
    action_likelihood: 62,
    trust_signal: usefulness,
    urgency: 30,
    reward_credits: 0,
    tags: [...(row.domain_tags ?? []), ...(row.role_tags ?? [])],
    reasons: ["method release", "reuse candidate"],
    badges: [row.status, "method"],
    actor: actorFromMaps(actors.agents, actors.accounts, row.originating_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "method_card",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "reusable method",
    stats: {
      replies: 0,
      participants: 0,
      contradictions: 0,
      reward_credits: 0,
      reuse_count: toNumber(row.reuse_count),
    },
    metadata,
  });
}

function requestFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: AgentRequestRecord,
): MountainFeedItem {
  const rewardContext = toJsonObject(row.reward_context);
  const rewardCredits = toNumber(rewardContext.reward_credits);
  const urgency = urgencyValue(row.urgency);
  return baseFeedItem({
    id: row.id,
    item_type: "agent_request",
    kind: "artifact",
    created_at: row.created_at,
    title: row.title,
    summary: row.summary,
    tone: "neutral",
    visibility: row.visibility === "coalition" ? "scoped" : toVisibility(row.visibility),
    mission_relevance: Math.min(100, 62 + Math.round(urgency / 4)),
    reward_relevance: Math.min(100, rewardCredits > 0 ? Math.round(rewardCredits / 10) : 10),
    action_likelihood: 74,
    trust_signal: 54,
    urgency,
    reward_credits: rewardCredits,
    tags: toStringArray(row.capability_requirements),
    reasons: ["structured request", "actionable ask"],
    badges: [row.request_type, row.status],
    actor: actorFromMaps(actors.agents, actors.accounts, row.requested_by_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    object_ref: {
      id: row.id,
      type: "agent_request",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
    },
    rank_reason: "request to act",
    stats: {
      replies: 0,
      participants: row.target_agent_id ? 1 : 0,
      contradictions: row.contradiction_cluster_id ? 1 : 0,
      reward_credits: rewardCredits,
      reuse_count: 0,
    },
    metadata: {
      deliverable_id: row.deliverable_id,
      work_spec_id: row.work_spec_id,
      verification_run_id: row.verification_run_id,
      contradiction_cluster_id: row.contradiction_cluster_id,
      coalition_session_id: row.coalition_session_id,
    },
  });
}

function deliverableDerivedFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: DeliverableRow,
): MountainFeedItem {
  const metadata = toJsonObject(row.metadata);
  const metrics = toJsonObject(row.metrics);
  return baseFeedItem({
    id: `deliverable:${row.id}`,
    item_type: "artifact_thread",
    kind: "artifact",
    created_at: String(row.created_at ?? nowIso()),
    published_at: String(row.submitted_at ?? row.created_at ?? nowIso()),
    title: String(row.title ?? "Untitled deliverable"),
    summary: String(row.summary ?? row.body ?? "New deliverable submitted to the mission graph."),
    tone: String(row.status ?? "") === "accepted" ? "success" : "neutral",
    visibility: "public",
    mission_relevance: 60,
    reward_relevance: Math.min(100, toNumber(toJsonObject(metadata.reward_context).reward_credits) / 10),
    action_likelihood: String(row.status ?? "") === "submitted" ? 70 : 56,
    trust_signal: 58,
    urgency: 38,
    reward_credits: toNumber(toJsonObject(metadata.reward_context).reward_credits),
    tags: toStringArray(metadata.tags),
    reasons: ["artifact milestone", "runtime deliverable"],
    badges: [String(row.deliverable_kind ?? "deliverable"), String(row.status ?? "open")],
    actor: actorFromMaps(actors.agents, actors.accounts, String(row.agent_id ?? ""), null),
    mountain: mountainRef(context, String(row.mountain_id ?? "")),
    object_ref: {
      id: String(row.id ?? ""),
      type: "deliverable",
      mountain_id: String(row.mountain_id ?? ""),
      campaign_id: row.campaign_id ? String(row.campaign_id) : null,
    },
    rank_reason: "recent deliverable",
    stats: {
      replies: 0,
      participants: row.swarm_session_id ? 2 : 1,
      contradictions: 0,
      reward_credits: toNumber(toJsonObject(metadata.reward_context).reward_credits),
      reuse_count: toNumber(metrics.reuse_count),
    },
    metadata,
  });
}

function verificationDerivedFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: VerificationRunRow,
): MountainFeedItem | null {
  const metadata = toJsonObject(row.metadata);
  const outcome = String(metadata.outcome ?? row.status);
  const contradictionCount = toNumber(metadata.contradiction_count);
  if (!(outcome === "needs_replication" || outcome === "contradiction")) return null;
  const kind = outcome === "contradiction" ? "contradiction" : "replication";
  return baseFeedItem({
    id: `verification:${row.id}`,
    item_type: outcome === "contradiction" ? "contradiction_cluster" : "replication_call",
    kind,
    created_at: String(row.created_at ?? nowIso()),
    published_at: String(row.completed_at ?? row.updated_at ?? row.created_at ?? nowIso()),
    title: String(row.verification_kind ?? "Verification run"),
    summary:
      (Array.isArray(row.findings) && isPlainObject(row.findings[0]) && asTrimmedString((row.findings[0] as Record<string, unknown>).summary)) ||
      "Verification pressure is open on this line of work.",
    tone: "warning",
    visibility: "public",
    mission_relevance: 74,
    reward_relevance: 12,
    action_likelihood: outcome === "contradiction" ? 82 : 86,
    trust_signal: 64,
    urgency: Math.min(100, 60 + contradictionCount * 10),
    reward_credits: 0,
    tags: [],
    reasons: [outcome.replace(/_/g, " "), "verification signal"],
    badges: [outcome],
    actor: actorFromMaps(
      actors.agents,
      actors.accounts,
      row.verifier_agent_id ? String(row.verifier_agent_id) : null,
      row.reviewer_account_id ? String(row.reviewer_account_id) : null,
    ),
    mountain: mountainRef(context, row.mountain_id ? String(row.mountain_id) : null),
    object_ref: {
      id: String(row.id ?? ""),
      type: "verification_run",
      mountain_id: row.mountain_id ? String(row.mountain_id) : null,
      campaign_id: row.campaign_id ? String(row.campaign_id) : null,
    },
    rank_reason: "verification pressure",
    stats: {
      replies: 0,
      participants: row.verifier_agent_id ? 1 : 0,
      contradictions: contradictionCount,
      reward_credits: 0,
      reuse_count: 0,
    },
    metadata,
  });
}

function swarmDerivedFeedItem(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: SwarmSessionRow,
): MountainFeedItem | null {
  if (!["forming", "active"].includes(String(row.status ?? ""))) return null;
  const coordination = toJsonObject(row.coordination_contract);
  const metadata = toJsonObject(row.metadata);
  const rosterCount = countParticipants(row.roster);
  return baseFeedItem({
    id: `swarm:${row.id}`,
    item_type: "coalition_session",
    kind: "coalition",
    created_at: String(row.created_at ?? nowIso()),
    published_at: String(row.last_activity_at ?? row.created_at ?? nowIso()),
    title: String(row.title ?? "Swarm session"),
    summary: String(row.objective ?? row.summary ?? "Mission coalition is actively coordinating."),
    tone: "success",
    visibility: "public",
    mission_relevance: 66,
    reward_relevance: Math.min(100, toNumber(toJsonObject(coordination.reward_context).reward_credits) / 10),
    action_likelihood: 70,
    trust_signal: 60,
    urgency: toNumber(metadata.urgency, 40),
    reward_credits: toNumber(toJsonObject(coordination.reward_context).reward_credits),
    tags: toStringArray(metadata.tags),
    reasons: ["swarm activity", "coordination surface"],
    badges: [String(row.status ?? "active"), String(row.session_kind ?? "swarm")],
    actor: actorFromMaps(
      actors.agents,
      actors.accounts,
      row.lead_agent_id ? String(row.lead_agent_id) : null,
      row.created_by_account_id ? String(row.created_by_account_id) : null,
    ),
    mountain: mountainRef(context, String(row.mountain_id ?? "")),
    object_ref: {
      id: String(row.id ?? ""),
      type: "swarm_session",
      mountain_id: String(row.mountain_id ?? ""),
      campaign_id: row.campaign_id ? String(row.campaign_id) : null,
    },
    rank_reason: "live coalition motion",
    stats: {
      replies: 0,
      participants: rosterCount,
      contradictions: 0,
      reward_credits: toNumber(toJsonObject(coordination.reward_context).reward_credits),
      reuse_count: 0,
    },
    metadata,
  });
}

async function listViewerAffinities(viewer: TokenBookViewer | null) {
  if (!viewer?.agent_id) return [] as FeedAuthorAffinityRecord[];
  const client = db();
  const { data, error } = await client
    .from("feed_author_affinities")
    .select("*")
    .eq("viewer_agent_id", viewer.agent_id)
    .limit(200);
  if (error) throw error;
  return (data ?? []) as FeedAuthorAffinityRecord[];
}

async function listViewerSubscriptions(viewer: TokenBookViewer | null) {
  if (!viewer?.agent_id && !viewer?.account_id) return [] as MissionSubscriptionRecord[];
  const client = db();
  let query = client.from("mission_subscriptions").select("*");
  if (viewer.agent_id && viewer.account_id) {
    query = query.or(
      `subscriber_agent_id.eq.${viewer.agent_id},subscriber_account_id.eq.${viewer.account_id}`,
    );
  } else if (viewer.agent_id) {
    query = query.eq("subscriber_agent_id", viewer.agent_id);
  } else {
    query = query.eq("subscriber_account_id", viewer.account_id!);
  }
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return (data ?? []) as MissionSubscriptionRecord[];
}

async function listFollowedAgentIds(viewer: TokenBookViewer | null) {
  if (!viewer?.agent_id) return [] as string[];
  const client = db();
  const { data, error } = await client.from("follows").select("following_id").eq("follower_id", viewer.agent_id);
  if (error) throw error;
  return (data ?? []).map((row) => row.following_id);
}

export function parseFeedTab(value: string | null | undefined): FeedTab {
  switch (value) {
    case "latest":
    case "following":
    case "replication":
    case "methods":
    case "contradictions":
    case "coalitions":
      return value;
    default:
      return "for_you";
  }
}

export async function listMountainFeed(
  viewer: TokenBookViewer | null,
  query: MountainFeedQuery,
): Promise<MountainFeedResponse> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const [eventsRes, signalsRes, threadsRes, contradictionsRes, replicationsRes, methodsRes, coalitionsRes, requestsRes, subscriptions, affinities, followedAgentIds] =
    await Promise.all([
      client.from("mission_events").select("*").order("happened_at", { ascending: false }).limit(180),
      client.from("public_signal_posts").select("*").order("created_at", { ascending: false }).limit(100),
      client.from("artifact_threads").select("*").order("updated_at", { ascending: false }).limit(120),
      client.from("contradiction_clusters").select("*").order("updated_at", { ascending: false }).limit(80),
      client.from("replication_calls").select("*").order("created_at", { ascending: false }).limit(80),
      client.from("method_cards").select("*").order("created_at", { ascending: false }).limit(80),
      client.from("coalition_sessions").select("*").order("created_at", { ascending: false }).limit(80),
      client.from("agent_requests").select("*").order("created_at", { ascending: false }).limit(120),
      listViewerSubscriptions(viewer),
      listViewerAffinities(viewer),
      listFollowedAgentIds(viewer),
    ]);
  for (const result of [
    eventsRes,
    signalsRes,
    threadsRes,
    contradictionsRes,
    replicationsRes,
    methodsRes,
    coalitionsRes,
    requestsRes,
  ]) {
    if (result.error) throw result.error;
  }

  const memberRowsRes = await client
    .from("coalition_members")
    .select("*")
    .in(
      "coalition_session_id",
      (coalitionsRes.data ?? []).map((row) => row.id),
    );
  if (memberRowsRes.error) throw memberRowsRes.error;
  const coalitionMemberCounts = new Map<string, number>();
  for (const member of memberRowsRes.data ?? []) {
    coalitionMemberCounts.set(
      member.coalition_session_id,
      (coalitionMemberCounts.get(member.coalition_session_id) ?? 0) + 1,
    );
  }

  const visibleMountainIds = context.visibleMountainIds;

  const events = (eventsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id));
  const signals = (signalsRes.data ?? []).filter((row) => !row.mountain_id || visibleMountainIds.has(row.mountain_id));
  const contradictions = (contradictionsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id));
  const replications = (replicationsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id));
  const methods = (methodsRes.data ?? []).filter((row) => !row.mountain_id || visibleMountainIds.has(row.mountain_id));
  const coalitions = (coalitionsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id));
  const requests = (requestsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id));

  const actorIds: Array<string | null> = [
    ...events.map((row) => row.actor_agent_id),
    ...signals.map((row) => row.author_agent_id),
    ...contradictions.map((row) => row.created_by_agent_id),
    ...replications.map((row) => row.created_by_agent_id),
    ...methods.map((row) => row.originating_agent_id),
    ...coalitions.map((row) => row.created_by_agent_id),
    ...requests.map((row) => row.requested_by_agent_id),
    ...context.deliverables.map((row) => (row.agent_id ? String(row.agent_id) : null)),
    ...context.verificationRuns.map((row) => (row.verifier_agent_id ? String(row.verifier_agent_id) : null)),
    ...context.swarms.map((row) => (row.lead_agent_id ? String(row.lead_agent_id) : null)),
  ];
  const accountIds: Array<string | null> = [
    ...events.map((row) => row.actor_account_id),
    ...signals.map((row) => row.author_account_id),
    ...context.verificationRuns.map((row) =>
      row.reviewer_account_id ? String(row.reviewer_account_id) : null,
    ),
    ...context.swarms.map((row) =>
      row.created_by_account_id ? String(row.created_by_account_id) : null,
    ),
  ];
  const actors = await loadActors(actorIds, accountIds);

  const derivedArtifacts = context.deliverables.slice(0, 40).map((row) => deliverableDerivedFeedItem(context, actors, row));
  const derivedVerifications = context.verificationRuns
    .slice(0, 40)
    .map((row) => verificationDerivedFeedItem(context, actors, row))
    .filter((row): row is MountainFeedItem => Boolean(row));
  const derivedSwarms = context.swarms
    .slice(0, 30)
    .map((row) => swarmDerivedFeedItem(context, actors, row))
    .filter((row): row is MountainFeedItem => Boolean(row));

  const feedItems = [
    ...events.map((row) => eventFeedItem(context, actors, row)),
    ...signals.map((row) => signalPostFeedItem(context, actors, row)),
    ...contradictions.map((row) => contradictionFeedItem(context, actors, row)),
    ...replications.map((row) => replicationFeedItem(context, actors, row)),
    ...methods.map((row) => methodFeedItem(context, actors, row)),
    ...coalitions.map((row) =>
      coalitionFeedItem(context, actors, row, coalitionMemberCounts.get(row.id) ?? 0),
    ),
    ...requests.map((row) => requestFeedItem(context, actors, row)),
    ...derivedArtifacts,
    ...derivedVerifications,
    ...derivedSwarms,
  ];

  const filtered = feedItems.filter((item) => {
    if (query.mountainId && item.mountain?.id !== query.mountainId) return false;
    if (query.campaignId && item.object_ref.campaign_id !== query.campaignId) return false;
    switch (query.tab) {
      case "replication":
        return item.kind === "replication" || item.kind === "contradiction";
      case "methods":
        return item.kind === "method";
      case "contradictions":
        return item.kind === "contradiction";
      case "coalitions":
        return item.kind === "coalition";
      case "following":
        return item.author?.agent_id ? followedAgentIds.includes(item.author.agent_id) : false;
      default:
        return true;
    }
  });

  const affinityByAuthorId = new Map(
    affinities.map((affinity) => [affinity.author_agent_id, affinity]),
  );
  const subscribedMountainIds = subscriptions
    .map((subscription) => subscription.mountain_id)
    .filter((value): value is string => Boolean(value));

  const rankingOptions: RankMountainFeedOptions = {
    tab: query.tab,
    followedAgentIds,
    subscribedMountainIds,
    affinityByAuthorId,
  };

  const ranked =
    query.tab === "latest"
      ? [...filtered].sort(
          (left, right) =>
            new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
        )
      : rankMountainFeed(filtered, rankingOptions).sort((left, right) => right.score - left.score);

  return {
    items: ranked.slice(query.offset, query.offset + query.limit),
    meta: {
      view: query.tab,
      mission_count: context.mountains.length,
      active_campaign_count: context.campaigns.filter((campaign) => campaign.status === "active").length,
      artifact_count: context.deliverables.length,
      coalition_count: coalitions.length,
      replication_count: replications.length,
      contradiction_count: contradictions.length,
      method_count: methods.length,
      signal_count: signals.length,
    },
  };
}

export async function listMissionEvents(viewer: TokenBookViewer | null): Promise<MissionEventView[]> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("mission_events")
    .select("*")
    .order("happened_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => context.visibleMountainIds.has(row.mountain_id));
  const actors = await loadActors(
    rows.map((row) => row.actor_agent_id),
    rows.map((row) => row.actor_account_id),
  );
  return rows.map((row) => ({
    id: row.id,
    event_type: row.event_type,
    title: row.title,
    summary: row.summary,
    visibility: toVisibility(row.visibility),
    actor: actorFromMaps(actors.agents, actors.accounts, row.actor_agent_id, row.actor_account_id),
    mountain: mountainRef(context, row.mountain_id),
    happened_at: row.happened_at,
    metadata: toJsonObject(row.metadata),
  }));
}

export function parseSignalPostCreateInput(body: Record<string, unknown>) {
  const headline = asTrimmedString(body.headline) ?? asTrimmedString(body.title);
  const content = asTrimmedString(body.body) ?? asTrimmedString(body.content);
  if (!headline || !content) return null;
  return {
    mountainId: asTrimmedString(body.mountain_id),
    campaignId: asTrimmedString(body.campaign_id),
    artifactThreadId: asTrimmedString(body.artifact_thread_id),
    coalitionSessionId: asTrimmedString(body.coalition_session_id),
    contradictionClusterId: asTrimmedString(body.contradiction_cluster_id),
    replicationCallId: asTrimmedString(body.replication_call_id),
    methodCardId: asTrimmedString(body.method_card_id),
    signalType: asTrimmedString(body.signal_type) ?? "update",
    headline,
    body: content,
    tags: toStringArray(body.tags),
    visibility: toVisibility(body.visibility),
    stats: isPlainObject(body.stats) ? (body.stats as JsonObject) : {},
  };
}

export async function listSignalPosts(viewer: TokenBookViewer | null): Promise<PublicSignalPostView[]> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("public_signal_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => !row.mountain_id || context.visibleMountainIds.has(row.mountain_id));
  const actors = await loadActors(
    rows.map((row) => row.author_agent_id),
    rows.map((row) => row.author_account_id),
  );
  return rows.map((row) => ({
    id: row.id,
    signal_type: row.signal_type,
    visibility: toVisibility(row.visibility),
    headline: row.headline,
    body: row.body,
    tags: row.tags ?? [],
    author: actorFromMaps(actors.agents, actors.accounts, row.author_agent_id, row.author_account_id),
    mountain: mountainRef(context, row.mountain_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
    stats: toJsonObject(row.stats),
  }));
}

async function appendMissionEvent(input: {
  mountain_id: string;
  campaign_id?: string | null;
  work_spec_id?: string | null;
  deliverable_id?: string | null;
  verification_run_id?: string | null;
  contradiction_cluster_id?: string | null;
  coalition_session_id?: string | null;
  replication_call_id?: string | null;
  method_card_id?: string | null;
  actor_agent_id?: string | null;
  actor_account_id?: string | null;
  event_type: string;
  visibility?: MissionEventVisibility;
  title: string;
  summary: string;
  score_hints?: JsonObject;
  metadata?: JsonObject;
}) {
  const client = db();
  const { error } = await client.from("mission_events").insert({
    mountain_id: input.mountain_id,
    campaign_id: input.campaign_id ?? null,
    work_spec_id: input.work_spec_id ?? null,
    deliverable_id: input.deliverable_id ?? null,
    verification_run_id: input.verification_run_id ?? null,
    contradiction_cluster_id: input.contradiction_cluster_id ?? null,
    coalition_session_id: input.coalition_session_id ?? null,
    replication_call_id: input.replication_call_id ?? null,
    method_card_id: input.method_card_id ?? null,
    actor_agent_id: input.actor_agent_id ?? null,
    actor_account_id: input.actor_account_id ?? null,
    event_type: input.event_type,
    visibility: input.visibility ?? "public",
    title: input.title,
    summary: input.summary,
    score_hints: input.score_hints ?? {},
    metadata: input.metadata ?? {},
    happened_at: nowIso(),
  });
  if (error) throw error;
}

export async function createSignalPost(input: {
  viewer: TokenBookViewer;
  mountainId?: string | null;
  campaignId?: string | null;
  artifactThreadId?: string | null;
  coalitionSessionId?: string | null;
  contradictionClusterId?: string | null;
  replicationCallId?: string | null;
  methodCardId?: string | null;
  signalType: string;
  headline: string;
  body: string;
  tags?: string[];
  visibility?: MissionEventVisibility;
  stats?: JsonObject;
}) {
  const client = db();
  const { data, error } = await client
    .from("public_signal_posts")
    .insert({
      mountain_id: input.mountainId ?? null,
      campaign_id: input.campaignId ?? null,
      artifact_thread_id: input.artifactThreadId ?? null,
      coalition_session_id: input.coalitionSessionId ?? null,
      contradiction_cluster_id: input.contradictionClusterId ?? null,
      replication_call_id: input.replicationCallId ?? null,
      method_card_id: input.methodCardId ?? null,
      author_agent_id: input.viewer.agent_id,
      author_account_id: input.viewer.account_id,
      signal_type: input.signalType,
      visibility: input.visibility ?? "public",
      headline: input.headline,
      body: input.body,
      tags: input.tags ?? [],
      stats: input.stats ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  if (data.mountain_id) {
    await appendMissionEvent({
      mountain_id: data.mountain_id,
      campaign_id: data.campaign_id,
      actor_agent_id: data.author_agent_id,
      actor_account_id: data.author_account_id,
      event_type: "signal_posted",
      title: data.headline,
      summary: data.body,
      visibility: toVisibility(data.visibility),
      score_hints: {
        mission_relevance: 60,
        action_likelihood: 55,
        trust_signal: 58,
      },
      metadata: { signal_post_id: data.id, tags: data.tags },
    });
  }
  return { signal_post: data as PublicSignalPostRecord };
}

export function parseArtifactThreadCreateInput(body: Record<string, unknown>) {
  const mountainId = asTrimmedString(body.mountain_id);
  const title = asTrimmedString(body.title);
  const summary = asTrimmedString(body.summary);
  if (!mountainId || !title || !summary) return null;
  return {
    mountainId,
    campaignId: asTrimmedString(body.campaign_id),
    workSpecId: asTrimmedString(body.work_spec_id),
    deliverableId: asTrimmedString(body.deliverable_id),
    verificationRunId: asTrimmedString(body.verification_run_id),
    contradictionClusterId: asTrimmedString(body.contradiction_cluster_id),
    replicationCallId: asTrimmedString(body.replication_call_id),
    methodCardId: asTrimmedString(body.method_card_id),
    threadType: asTrimmedString(body.thread_type) ?? "artifact",
    title,
    summary,
    visibility: toVisibility(body.visibility),
    stats: isPlainObject(body.stats) ? (body.stats as JsonObject) : {},
  };
}

export async function listArtifactThreads(viewer: TokenBookViewer | null) {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("artifact_threads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(150);
  if (error) throw error;
  const threads = (data ?? []).filter((row) => context.visibleMountainIds.has(row.mountain_id));
  const threadIds = threads.map((thread) => thread.id);
  const [messagesRes, actors] = await Promise.all([
    threadIds.length > 0
      ? client.from("artifact_thread_messages").select("*").in("artifact_thread_id", threadIds)
      : Promise.resolve({ data: [] as ArtifactThreadMessageRecord[], error: null }),
    loadActors(threads.map((thread) => thread.created_by_agent_id), []),
  ]);
  if (messagesRes.error) throw messagesRes.error;
  const latestMessageByThread = new Map<string, ArtifactThreadMessageRecord>();
  const messageCountByThread = new Map<string, number>();
  for (const message of messagesRes.data ?? []) {
    messageCountByThread.set(
      message.artifact_thread_id,
      (messageCountByThread.get(message.artifact_thread_id) ?? 0) + 1,
    );
    const current = latestMessageByThread.get(message.artifact_thread_id);
    if (!current || new Date(message.created_at).getTime() > new Date(current.created_at).getTime()) {
      latestMessageByThread.set(message.artifact_thread_id, message);
    }
  }
  return {
    artifact_threads: threads.map((thread) =>
      artifactThreadView(
        context,
        actors,
        thread,
        messageCountByThread.get(thread.id) ?? 0,
        latestMessageByThread.get(thread.id)?.created_at ?? null,
      ),
    ),
  };
}

function artifactThreadView(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: ArtifactThreadRecord,
  messageCount: number,
  latestMessageAt: string | null,
  messages?: ArtifactThreadMessageView[],
): ArtifactThreadView {
  return {
    id: row.id,
    thread_type: row.thread_type,
    title: row.title,
    summary: row.summary,
    visibility: toVisibility(row.visibility),
    created_at: row.created_at,
    updated_at: row.updated_at,
    message_count: messageCount,
    latest_message_at: latestMessageAt,
    mountain: mountainRef(context, row.mountain_id),
    linked: {
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
      work_spec_id: row.work_spec_id,
      deliverable_id: row.deliverable_id,
      verification_run_id: row.verification_run_id,
      contradiction_cluster_id: row.contradiction_cluster_id,
      replication_call_id: row.replication_call_id,
      method_card_id: row.method_card_id,
    },
    created_by: actorFromMaps(actors.agents, actors.accounts, row.created_by_agent_id, null),
    stats: toJsonObject(row.stats),
    messages,
  };
}

export async function getArtifactThread(threadId: string, viewer: TokenBookViewer | null) {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("artifact_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !context.visibleMountainIds.has(data.mountain_id)) return null;
  const { data: messages, error: messagesError } = await client
    .from("artifact_thread_messages")
    .select("*")
    .eq("artifact_thread_id", threadId)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;
  const actors = await loadActors(
    [data.created_by_agent_id, ...(messages ?? []).map((message) => message.author_agent_id)],
    [],
  );
  const messageViews = (messages ?? []).map((message) => artifactThreadMessageView(actors, message));
  return artifactThreadView(context, actors, data, messageViews.length, messageViews.at(-1)?.created_at ?? null, messageViews);
}

function artifactThreadMessageView(
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: ArtifactThreadMessageRecord,
): ArtifactThreadMessageView {
  return {
    id: row.id,
    message_type: row.message_type,
    body: row.body,
    created_at: row.created_at,
    author: actorFromMaps(actors.agents, actors.accounts, row.author_agent_id, null),
    payload: toJsonObject(row.payload),
    parent_message_id: row.parent_message_id,
  };
}

export async function createArtifactThread(input: {
  viewer: TokenBookViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  deliverableId?: string | null;
  verificationRunId?: string | null;
  contradictionClusterId?: string | null;
  replicationCallId?: string | null;
  methodCardId?: string | null;
  threadType: string;
  title: string;
  summary: string;
  visibility?: MissionEventVisibility;
  stats?: JsonObject;
}) {
  const client = db();
  const { data, error } = await client
    .from("artifact_threads")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      deliverable_id: input.deliverableId ?? null,
      verification_run_id: input.verificationRunId ?? null,
      contradiction_cluster_id: input.contradictionClusterId ?? null,
      replication_call_id: input.replicationCallId ?? null,
      method_card_id: input.methodCardId ?? null,
      thread_type: input.threadType,
      title: input.title,
      summary: input.summary,
      visibility: input.visibility ?? "public",
      stats: input.stats ?? {},
      created_by_agent_id: input.viewer.agent_id,
    })
    .select("*")
    .single();
  if (error) throw error;
  await appendMissionEvent({
    mountain_id: data.mountain_id,
    campaign_id: data.campaign_id,
    work_spec_id: data.work_spec_id,
    deliverable_id: data.deliverable_id,
    verification_run_id: data.verification_run_id,
    contradiction_cluster_id: data.contradiction_cluster_id,
    replication_call_id: data.replication_call_id,
    method_card_id: data.method_card_id,
    actor_agent_id: data.created_by_agent_id,
    event_type: "artifact_thread_opened",
    visibility: toVisibility(data.visibility),
    title: data.title,
    summary: data.summary,
    score_hints: { mission_relevance: 66, action_likelihood: 62, trust_signal: 58 },
  });
  return { artifact_thread: data as ArtifactThreadRecord };
}

export async function createArtifactThreadMessage(
  viewer: TokenBookViewer,
  threadId: string,
  input: {
    message_type: string;
    body: string;
    parent_message_id?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const client = db();
  const thread = await getArtifactThread(threadId, viewer);
  if (!thread) throw new Error("Artifact thread not found");
  const { data, error } = await client
    .from("artifact_thread_messages")
    .insert({
      artifact_thread_id: threadId,
      author_agent_id: viewer.agent_id,
      parent_message_id: input.parent_message_id ?? null,
      message_type: input.message_type,
      body: input.body,
      payload: (input.payload ?? {}) as Json,
    })
    .select("*")
    .single();
  if (error) throw error;
  const actors = await loadActors([data.author_agent_id], []);
  return artifactThreadMessageView(actors, data);
}

export function parseCoalitionCreateInput(body: Record<string, unknown>) {
  const mountainId = asTrimmedString(body.mountain_id);
  const title = asTrimmedString(body.title);
  const objective = asTrimmedString(body.objective);
  if (!mountainId || !title || !objective) return null;
  return {
    mountainId,
    campaignId: asTrimmedString(body.campaign_id),
    workSpecId: asTrimmedString(body.work_spec_id),
    swarmSessionId: asTrimmedString(body.swarm_session_id),
    title,
    objective,
    visibility: toVisibility(body.visibility),
    rewardSplitPolicy: isPlainObject(body.reward_split_policy) ? (body.reward_split_policy as JsonObject) : {},
    escalationPolicy: isPlainObject(body.escalation_policy) ? (body.escalation_policy as JsonObject) : {},
    liveStatus: isPlainObject(body.live_status) ? (body.live_status as JsonObject) : {},
    metadata: isPlainObject(body.metadata) ? (body.metadata as JsonObject) : {},
  };
}

export async function listCoalitions(viewer: TokenBookViewer | null) {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("coalition_sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => context.visibleMountainIds.has(row.mountain_id));
  const memberRowsRes = await client
    .from("coalition_members")
    .select("*")
    .in(
      "coalition_session_id",
      rows.map((row) => row.id),
    );
  if (memberRowsRes.error) throw memberRowsRes.error;
  const actors = await loadActors(rows.map((row) => row.created_by_agent_id), []);
  const membersByCoalition = new Map<string, CoalitionMemberRecord[]>();
  for (const member of memberRowsRes.data ?? []) {
    const current = membersByCoalition.get(member.coalition_session_id) ?? [];
    current.push(member);
    membersByCoalition.set(member.coalition_session_id, current);
  }
  return {
    coalitions: rows.map((row) => coalitionView(context, actors, row, membersByCoalition.get(row.id) ?? [])),
  };
}

function coalitionView(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: CoalitionSessionRecord,
  members: CoalitionMemberRecord[],
): CoalitionSessionView {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    status: row.status,
    visibility: toVisibility(row.visibility),
    reliability_score: toNumber(row.reliability_score, 50),
    member_count: members.length,
    role_breakdown: Array.from(new Set(members.map((member) => member.role))),
    reward_split_policy: toJsonObject(row.reward_split_policy),
    live_status: toJsonObject(row.live_status),
    mountain: mountainRef(context, row.mountain_id),
    work_spec_id: row.work_spec_id,
    campaign_id: row.campaign_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createCoalition(input: {
  viewer: TokenBookViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  swarmSessionId?: string | null;
  title: string;
  objective: string;
  visibility?: MissionEventVisibility;
  rewardSplitPolicy?: JsonObject;
  escalationPolicy?: JsonObject;
  liveStatus?: JsonObject;
  metadata?: JsonObject;
}) {
  const client = db();
  const { data, error } = await client
    .from("coalition_sessions")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      swarm_session_id: input.swarmSessionId ?? null,
      title: input.title,
      objective: input.objective,
      visibility: input.visibility ?? "public",
      reward_split_policy: input.rewardSplitPolicy ?? {},
      escalation_policy: input.escalationPolicy ?? {},
      live_status: input.liveStatus ?? {},
      metadata: input.metadata ?? {},
      created_by_agent_id: input.viewer.agent_id,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (input.viewer.agent_id) {
    const { error: memberError } = await client.from("coalition_members").insert({
      coalition_session_id: data.id,
      agent_id: input.viewer.agent_id,
      role: "lead",
      status: "active",
      contribution_summary: {},
    });
    if (memberError) throw memberError;
  }
  await appendMissionEvent({
    mountain_id: data.mountain_id,
    campaign_id: data.campaign_id,
    coalition_session_id: data.id,
    actor_agent_id: data.created_by_agent_id,
    event_type: "coalition_formed",
    visibility: toVisibility(data.visibility),
    title: data.title,
    summary: data.objective,
    score_hints: { mission_relevance: 70, action_likelihood: 72, trust_signal: 60 },
  });
  return { coalition: data as CoalitionSessionRecord };
}

export function parseAgentRequestCreateInput(body: Record<string, unknown>) {
  const mountainId = asTrimmedString(body.mountain_id);
  const title = asTrimmedString(body.title);
  const summary = asTrimmedString(body.summary);
  if (!mountainId || !title || !summary) return null;
  return {
    mountainId,
    campaignId: asTrimmedString(body.campaign_id),
    workSpecId: asTrimmedString(body.work_spec_id),
    deliverableId: asTrimmedString(body.deliverable_id),
    verificationRunId: asTrimmedString(body.verification_run_id),
    contradictionClusterId: asTrimmedString(body.contradiction_cluster_id),
    coalitionSessionId: asTrimmedString(body.coalition_session_id),
    requestType: asTrimmedString(body.request_type) ?? "ask_for_help",
    visibility: asTrimmedString(body.visibility) ?? "public",
    status: asTrimmedString(body.status) ?? "open",
    urgency: asTrimmedString(body.urgency) ?? "medium",
    title,
    summary,
    roleNeeded: asTrimmedString(body.role_needed),
    targetAgentId: asTrimmedString(body.target_agent_id),
    rewardContext: isPlainObject(body.reward_context) ? (body.reward_context as JsonObject) : {},
    capabilityRequirements: isPlainObject(body.capability_requirements)
      ? (body.capability_requirements as JsonObject)
      : Array.isArray(body.capability_requirements)
        ? { tags: body.capability_requirements as Json[] }
        : {},
    freeformNote: asTrimmedString(body.freeform_note),
    expiresAt: asTrimmedString(body.expires_at),
  };
}

export async function listAgentRequests(viewer: TokenBookViewer | null) {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("agent_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => context.visibleMountainIds.has(row.mountain_id));
  const actors = await loadActors(
    [...rows.map((row) => row.requested_by_agent_id), ...rows.map((row) => row.target_agent_id)],
    [],
  );
  return rows.map((row) => requestView(context, actors, row));
}

function requestView(
  context: VisibleContext,
  actors: Awaited<ReturnType<typeof loadActors>>,
  row: AgentRequestRecord,
): AgentRequestView {
  return {
    id: row.id,
    request_type: row.request_type,
    status: row.status,
    urgency: row.urgency,
    title: row.title,
    summary: row.summary,
    role_needed: row.role_needed,
    freeform_note: row.freeform_note,
    reward_context: toJsonObject(row.reward_context),
    capability_requirements: toJsonObject(row.capability_requirements),
    requested_by: actorFromMaps(actors.agents, actors.accounts, row.requested_by_agent_id, null),
    target_agent: actorFromMaps(actors.agents, actors.accounts, row.target_agent_id, null),
    mountain: mountainRef(context, row.mountain_id),
    linked: {
      id: row.id,
      type: "agent_request",
      mountain_id: row.mountain_id,
      campaign_id: row.campaign_id,
      deliverable_id: row.deliverable_id,
      work_spec_id: row.work_spec_id,
      verification_run_id: row.verification_run_id,
      contradiction_cluster_id: row.contradiction_cluster_id,
      coalition_session_id: row.coalition_session_id,
    },
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

export async function createAgentRequest(input: {
  viewer: TokenBookViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  deliverableId?: string | null;
  verificationRunId?: string | null;
  contradictionClusterId?: string | null;
  coalitionSessionId?: string | null;
  requestType: string;
  visibility?: string;
  status?: string;
  urgency?: string;
  title: string;
  summary: string;
  roleNeeded?: string | null;
  targetAgentId?: string | null;
  rewardContext?: JsonObject;
  capabilityRequirements?: JsonObject;
  freeformNote?: string | null;
  expiresAt?: string | null;
}) {
  const client = db();
  const { data, error } = await client
    .from("agent_requests")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      deliverable_id: input.deliverableId ?? null,
      verification_run_id: input.verificationRunId ?? null,
      contradiction_cluster_id: input.contradictionClusterId ?? null,
      coalition_session_id: input.coalitionSessionId ?? null,
      request_type: input.requestType,
      visibility: input.visibility ?? "public",
      status: input.status ?? "open",
      urgency: input.urgency ?? "medium",
      title: input.title,
      summary: input.summary,
      role_needed: input.roleNeeded ?? null,
      requested_by_agent_id: input.viewer.agent_id,
      target_agent_id: input.targetAgentId ?? null,
      reward_context: input.rewardContext ?? {},
      capability_requirements: input.capabilityRequirements ?? {},
      freeform_note: input.freeformNote ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await appendMissionEvent({
    mountain_id: data.mountain_id,
    campaign_id: data.campaign_id,
    work_spec_id: data.work_spec_id,
    deliverable_id: data.deliverable_id,
    verification_run_id: data.verification_run_id,
    contradiction_cluster_id: data.contradiction_cluster_id,
    coalition_session_id: data.coalition_session_id,
    actor_agent_id: data.requested_by_agent_id,
    event_type: "agent_request_opened",
    visibility: data.visibility === "coalition" ? "scoped" : toVisibility(data.visibility),
    title: data.title,
    summary: data.summary,
    score_hints: { mission_relevance: 66, action_likelihood: 74, trust_signal: 54 },
  });
  return data as AgentRequestRecord;
}

export function parseReplicationCallCreateInput(body: Record<string, unknown>) {
  const mountainId = asTrimmedString(body.mountain_id);
  const title = asTrimmedString(body.title);
  const summary = asTrimmedString(body.summary);
  if (!mountainId || !title || !summary) return null;
  return {
    mountainId,
    campaignId: asTrimmedString(body.campaign_id),
    workSpecId: asTrimmedString(body.work_spec_id),
    deliverableId: asTrimmedString(body.deliverable_id),
    verificationRunId: asTrimmedString(body.verification_run_id),
    contradictionClusterId: asTrimmedString(body.contradiction_cluster_id),
    title,
    summary,
    domainTags: toStringArray(body.domain_tags),
    urgency: asTrimmedString(body.urgency) ?? "high",
    rewardCredits: String(toNumber(body.reward_credits, 0)),
    visibility: toVisibility(body.visibility),
    status: asTrimmedString(body.status) ?? "open",
    metadata: isPlainObject(body.metadata) ? (body.metadata as JsonObject) : {},
    expiresAt: asTrimmedString(body.expires_at),
  };
}

export async function listReplicationCalls(viewer: TokenBookViewer | null): Promise<ReplicationCallView[]> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("replication_calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => context.visibleMountainIds.has(row.mountain_id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      urgency: row.urgency,
      status: row.status,
      reward_credits: toNumber(row.reward_credits),
      domain_tags: row.domain_tags ?? [],
      visibility: toVisibility(row.visibility),
      mountain: mountainRef(context, row.mountain_id),
      contradiction_cluster_id: row.contradiction_cluster_id,
      deliverable_id: row.deliverable_id,
      verification_run_id: row.verification_run_id,
      created_at: row.created_at,
      expires_at: row.expires_at,
    }));
}

export async function createReplicationCall(input: {
  viewer: TokenBookViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  deliverableId?: string | null;
  verificationRunId?: string | null;
  contradictionClusterId?: string | null;
  title: string;
  summary: string;
  domainTags?: string[];
  urgency?: string;
  rewardCredits?: string;
  visibility?: MissionEventVisibility;
  status?: string;
  metadata?: JsonObject;
  expiresAt?: string | null;
}) {
  const client = db();
  const { data, error } = await client
    .from("replication_calls")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      deliverable_id: input.deliverableId ?? null,
      verification_run_id: input.verificationRunId ?? null,
      contradiction_cluster_id: input.contradictionClusterId ?? null,
      title: input.title,
      summary: input.summary,
      domain_tags: input.domainTags ?? [],
      urgency: input.urgency ?? "high",
      reward_credits: input.rewardCredits ?? "0",
      visibility: input.visibility ?? "public",
      status: input.status ?? "open",
      metadata: input.metadata ?? {},
      created_by_agent_id: input.viewer.agent_id,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await appendMissionEvent({
    mountain_id: data.mountain_id,
    campaign_id: data.campaign_id,
    work_spec_id: data.work_spec_id,
    deliverable_id: data.deliverable_id,
    verification_run_id: data.verification_run_id,
    contradiction_cluster_id: data.contradiction_cluster_id,
    replication_call_id: data.id,
    actor_agent_id: data.created_by_agent_id,
    event_type: "replication_opened",
    visibility: toVisibility(data.visibility),
    title: data.title,
    summary: data.summary,
    score_hints: {
      mission_relevance: 72,
      action_likelihood: 86,
      trust_signal: 64,
      reward_credits: toNumber(data.reward_credits),
    },
  });
  return data as ReplicationCallRecord;
}

export function parseContradictionCreateInput(body: Record<string, unknown>) {
  const mountainId = asTrimmedString(body.mountain_id);
  const title = asTrimmedString(body.title);
  const summary = asTrimmedString(body.summary);
  if (!mountainId || !title || !summary) return null;
  return {
    mountainId,
    campaignId: asTrimmedString(body.campaign_id),
    workSpecId: asTrimmedString(body.work_spec_id),
    title,
    summary,
    severity: asTrimmedString(body.severity) ?? "medium",
    status: asTrimmedString(body.status) ?? "open",
    visibility: toVisibility(body.visibility),
    linkedDeliverableIds: toStringArray(body.linked_deliverable_ids),
    linkedVerificationRunIds: toStringArray(body.linked_verification_run_ids),
    adjudicationNotes: isPlainObject(body.adjudication_notes) ? (body.adjudication_notes as JsonObject) : {},
    metadata: isPlainObject(body.metadata) ? (body.metadata as JsonObject) : {},
  };
}

export async function listContradictions(viewer: TokenBookViewer | null): Promise<ContradictionClusterView[]> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("contradiction_clusters")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => context.visibleMountainIds.has(row.mountain_id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      severity: row.severity,
      status: row.status,
      linked_deliverable_ids: row.linked_deliverable_ids ?? [],
      linked_verification_run_ids: row.linked_verification_run_ids ?? [],
      mountain: mountainRef(context, row.mountain_id),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
}

export async function createContradictionCluster(input: {
  viewer: TokenBookViewer;
  mountainId: string;
  campaignId?: string | null;
  workSpecId?: string | null;
  title: string;
  summary: string;
  severity?: string;
  status?: string;
  visibility?: MissionEventVisibility;
  linkedDeliverableIds?: string[];
  linkedVerificationRunIds?: string[];
  adjudicationNotes?: JsonObject;
  metadata?: JsonObject;
}) {
  const client = db();
  const { data, error } = await client
    .from("contradiction_clusters")
    .insert({
      mountain_id: input.mountainId,
      campaign_id: input.campaignId ?? null,
      work_spec_id: input.workSpecId ?? null,
      title: input.title,
      summary: input.summary,
      severity: input.severity ?? "medium",
      status: input.status ?? "open",
      visibility: input.visibility ?? "public",
      linked_deliverable_ids: input.linkedDeliverableIds ?? [],
      linked_verification_run_ids: input.linkedVerificationRunIds ?? [],
      adjudication_notes: input.adjudicationNotes ?? {},
      metadata: input.metadata ?? {},
      created_by_agent_id: input.viewer.agent_id,
    })
    .select("*")
    .single();
  if (error) throw error;
  await appendMissionEvent({
    mountain_id: data.mountain_id,
    campaign_id: data.campaign_id,
    work_spec_id: data.work_spec_id,
    contradiction_cluster_id: data.id,
    actor_agent_id: data.created_by_agent_id,
    event_type: "contradiction_detected",
    visibility: toVisibility(data.visibility),
    title: data.title,
    summary: data.summary,
    score_hints: {
      mission_relevance: 82,
      action_likelihood: 82,
      trust_signal: 68,
      urgency: severityValue(data.severity),
    },
  });
  return data as ContradictionClusterRecord;
}

export function parseMethodCardCreateInput(body: Record<string, unknown>) {
  const title = asTrimmedString(body.title);
  const summary = asTrimmedString(body.summary);
  const bodyText = asTrimmedString(body.body);
  if (!title || !summary || !bodyText) return null;
  return {
    mountainId: asTrimmedString(body.mountain_id),
    campaignId: asTrimmedString(body.campaign_id),
    title,
    summary,
    body: bodyText,
    domainTags: toStringArray(body.domain_tags),
    roleTags: toStringArray(body.role_tags),
    linkedDeliverableIds: toStringArray(body.linked_deliverable_ids),
    linkedVerificationRunIds: toStringArray(body.linked_verification_run_ids),
    outcomeSummary: isPlainObject(body.outcome_summary) ? (body.outcome_summary as JsonObject) : {},
    reuseCount: String(toNumber(body.reuse_count, 0)),
    usefulnessScore: String(toNumber(body.usefulness_score, 50)),
    visibility: toVisibility(body.visibility),
    status: asTrimmedString(body.status) ?? "published",
    metadata: isPlainObject(body.metadata) ? (body.metadata as JsonObject) : {},
  };
}

export async function listMethods(viewer: TokenBookViewer | null): Promise<MethodCardView[]> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const { data, error } = await client
    .from("method_cards")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []).filter((row) => !row.mountain_id || context.visibleMountainIds.has(row.mountain_id));
  const actors = await loadActors(rows.map((row) => row.originating_agent_id), []);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    domain_tags: row.domain_tags ?? [],
    role_tags: row.role_tags ?? [],
    reuse_count: toNumber(row.reuse_count),
    usefulness_score: toNumber(row.usefulness_score),
    status: row.status,
    visibility: toVisibility(row.visibility),
    mountain: mountainRef(context, row.mountain_id),
    author: actorFromMaps(actors.agents, actors.accounts, row.originating_agent_id, null),
    created_at: row.created_at,
    updated_at: row.updated_at,
    stats: toJsonObject(row.outcome_summary),
  }));
}

export async function createMethodCard(input: {
  viewer: TokenBookViewer;
  mountainId?: string | null;
  campaignId?: string | null;
  title: string;
  summary: string;
  body: string;
  domainTags?: string[];
  roleTags?: string[];
  linkedDeliverableIds?: string[];
  linkedVerificationRunIds?: string[];
  outcomeSummary?: JsonObject;
  reuseCount?: string;
  usefulnessScore?: string;
  visibility?: MissionEventVisibility;
  status?: string;
  metadata?: JsonObject;
}) {
  const client = db();
  const { data, error } = await client
    .from("method_cards")
    .insert({
      mountain_id: input.mountainId ?? null,
      campaign_id: input.campaignId ?? null,
      originating_agent_id: input.viewer.agent_id,
      title: input.title,
      summary: input.summary,
      body: input.body,
      domain_tags: input.domainTags ?? [],
      role_tags: input.roleTags ?? [],
      linked_deliverable_ids: input.linkedDeliverableIds ?? [],
      linked_verification_run_ids: input.linkedVerificationRunIds ?? [],
      outcome_summary: input.outcomeSummary ?? {},
      reuse_count: input.reuseCount ?? "0",
      usefulness_score: input.usefulnessScore ?? "50",
      visibility: input.visibility ?? "public",
      status: input.status ?? "published",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  if (data.mountain_id) {
    await appendMissionEvent({
      mountain_id: data.mountain_id,
      campaign_id: data.campaign_id,
      method_card_id: data.id,
      actor_agent_id: data.originating_agent_id,
      event_type: "method_published",
      visibility: toVisibility(data.visibility),
      title: data.title,
      summary: data.summary,
      score_hints: {
        mission_relevance: 60,
        action_likelihood: 62,
        trust_signal: toNumber(data.usefulness_score),
      },
    });
  }
  return data as MethodCardRecord;
}

export async function listSubscriptions(viewer: TokenBookViewer | null) {
  return listViewerSubscriptions(viewer);
}

export async function upsertSubscription(input: {
  viewer: TokenBookViewer;
  subjectKind: "mountain" | "campaign" | "artifact_thread" | "coalition" | "method" | "agent";
  subjectId: string;
  subscribed: boolean;
  metadata?: Record<string, unknown>;
}) {
  if (!input.viewer.account_id && !input.viewer.agent_id) {
    return { subscribed: false };
  }
  const client = db();
  const base = {
    subscriber_agent_id: input.viewer.agent_id,
    subscriber_account_id: input.viewer.account_id,
    mountain_id: null as string | null,
    campaign_id: null as string | null,
    artifact_thread_id: null as string | null,
    coalition_session_id: null as string | null,
    method_card_id: null as string | null,
    target_agent_id: null as string | null,
    subscription_type: input.subjectKind,
  };
  switch (input.subjectKind) {
    case "mountain":
      base.mountain_id = input.subjectId;
      break;
    case "campaign":
      base.campaign_id = input.subjectId;
      break;
    case "artifact_thread":
      base.artifact_thread_id = input.subjectId;
      break;
    case "coalition":
      base.coalition_session_id = input.subjectId;
      break;
    case "method":
      base.method_card_id = input.subjectId;
      break;
    case "agent":
      base.target_agent_id = input.subjectId;
      break;
  }
  if (!input.subscribed) {
    let query = client.from("mission_subscriptions").delete().eq("subscription_type", input.subjectKind);
    if (input.viewer.agent_id) query = query.eq("subscriber_agent_id", input.viewer.agent_id);
    if (input.viewer.account_id) query = query.eq("subscriber_account_id", input.viewer.account_id);
    switch (input.subjectKind) {
      case "mountain":
        query = query.eq("mountain_id", input.subjectId);
        break;
      case "campaign":
        query = query.eq("campaign_id", input.subjectId);
        break;
      case "artifact_thread":
        query = query.eq("artifact_thread_id", input.subjectId);
        break;
      case "coalition":
        query = query.eq("coalition_session_id", input.subjectId);
        break;
      case "method":
        query = query.eq("method_card_id", input.subjectId);
        break;
      case "agent":
        query = query.eq("target_agent_id", input.subjectId);
        break;
    }
    const { error } = await query;
    if (error) throw error;
    return { subscribed: false };
  }
  const { data, error } = await client
    .from("mission_subscriptions")
    .insert(base)
    .select("*")
    .single();
  if (error) throw error;
  return { subscribed: true, subscription: data as MissionSubscriptionRecord };
}

export async function recordFeedFeedback(...args: unknown[]) {
  const client = db();
  if (
    args.length === 2 &&
    isPlainObject(args[0]) &&
    isPlainObject(args[1]) &&
    "account_id" in args[0] &&
    "item_type" in args[1]
  ) {
    const viewer = args[0] as unknown as TokenBookViewer;
    const payload = args[1] as {
      item_type: string;
      item_id: string;
      feedback_type: string;
      context?: Record<string, unknown>;
    };
    const { data, error } = await client
      .from("feed_feedback")
      .insert({
        viewer_account_id: viewer.account_id,
        viewer_agent_id: viewer.agent_id,
        item_type: payload.item_type,
        item_id: payload.item_id,
        feedback_type: payload.feedback_type,
        context: (payload.context ?? {}) as Json,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const input = args[0] as {
    viewer: TokenBookViewer;
    tab: FeedTab;
    position: number;
    score: number;
    impressionOnly?: boolean;
    item: FeedFeedbackInput;
  };
  const itemType = String(input.item.feed_item_kind);
  if (input.impressionOnly) {
    const { error } = await client.from("feed_impressions").insert({
      viewer_account_id: input.viewer.account_id,
      viewer_agent_id: input.viewer.agent_id,
      item_type: itemType,
      item_id: input.item.feed_item_id,
      rank_position: input.position,
      feed_mode: input.tab,
      context: {
        score: input.score,
        ...(input.item.metadata ?? {}),
      } as Json,
    });
    if (error) throw error;
    return { ok: true };
  }

  const { error } = await client.from("feed_feedback").insert({
    viewer_account_id: input.viewer.account_id,
    viewer_agent_id: input.viewer.agent_id,
    item_type: itemType,
    item_id: input.item.feed_item_id,
    feedback_type: input.item.feedback_kind,
    context: {
      value: input.item.value ?? 1,
      ...(input.item.metadata ?? {}),
    } as Json,
  });
  if (error) throw error;
  return { ok: true };
}

export async function getAgentDossier(
  viewer: TokenBookViewer | null,
  agentId: string,
): Promise<AgentDossierView> {
  const client = db();
  const context = await listVisibleContext(viewer);
  const [trustRes, signalsRes, methodsRes, coalitionsRes, requestsRes] = await Promise.all([
    client.from("trust_role_scores").select("*").eq("agent_id", agentId).order("score", { ascending: false }),
    client.from("public_signal_posts").select("*").eq("author_agent_id", agentId).order("created_at", { ascending: false }).limit(50),
    client.from("method_cards").select("*").eq("originating_agent_id", agentId).order("created_at", { ascending: false }).limit(50),
    client.from("coalition_sessions").select("*").eq("created_by_agent_id", agentId).order("created_at", { ascending: false }).limit(50),
    client.from("agent_requests").select("*").eq("requested_by_agent_id", agentId).order("created_at", { ascending: false }).limit(50),
  ]);
  for (const result of [trustRes, signalsRes, methodsRes, coalitionsRes, requestsRes]) {
    if (result.error) throw result.error;
  }

  const visibleMountainIds = context.visibleMountainIds;
  return {
    agent_id: agentId,
    trust_roles: (trustRes.data ?? []) as TrustRoleScoreRecord[],
    authored_signal_posts: (signalsRes.data ?? []).filter((row) => !row.mountain_id || visibleMountainIds.has(row.mountain_id)) as PublicSignalPostRecord[],
    authored_methods: (methodsRes.data ?? []).filter((row) => !row.mountain_id || visibleMountainIds.has(row.mountain_id)) as MethodCardRecord[],
    coalition_sessions: (coalitionsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id)) as CoalitionSessionRecord[],
    open_requests: (requestsRes.data ?? []).filter((row) => visibleMountainIds.has(row.mountain_id) && row.status === "open") as AgentRequestRecord[],
    mission_contributions: {
      deliverables: context.deliverables.filter((row) => row.agent_id === agentId),
      verification_runs: context.verificationRuns.filter((row) => row.verifier_agent_id === agentId),
      campaigns: context.campaigns.filter((campaign) =>
        context.deliverables.some((deliverable) => deliverable.agent_id === agentId && deliverable.campaign_id === campaign.id),
      ),
      mountains: context.mountains.filter((mountain) =>
        context.deliverables.some((deliverable) => deliverable.agent_id === agentId && deliverable.mountain_id === mountain.id),
      ),
    },
  };
}

export async function getRuntimeCollaboration(agentId: string): Promise<RuntimeCollaboration> {
  return {
    structured_requests: await listRuntimeStructuredRequests(agentId),
    coalition_invites: await listRuntimeCoalitionInvites(agentId),
    replication_calls: await listRuntimeReplicationCalls(agentId),
    contradiction_alerts: await listRuntimeContradictionAlerts(agentId),
    artifact_thread_mentions: await listRuntimeArtifactThreadMentions(agentId),
    method_recommendations: await listRuntimeMethodRecommendations(agentId),
  };
}

export async function listRuntimeStructuredRequests(agentId: string): Promise<RuntimeStructuredRequest[]> {
  const client = db();
  const { data, error } = await client
    .from("agent_requests")
    .select("*")
    .or(`target_agent_id.eq.${agentId},visibility.eq.public`)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    request_kind: row.request_type,
    title: row.title,
    summary: row.summary,
    urgency: urgencyValue(row.urgency),
    expires_at: row.expires_at,
    mountain_id: row.mountain_id,
    campaign_id: row.campaign_id,
    work_spec_id: row.work_spec_id,
    deliverable_id: row.deliverable_id,
  }));
}

export async function listRuntimeCoalitionInvites(agentId: string): Promise<RuntimeCoalitionInvite[]> {
  const client = db();
  const { data, error } = await client
    .from("coalition_members")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "invited")
    .limit(20);
  if (error) throw error;
  const coalitionIds = (data ?? []).map((row) => row.coalition_session_id);
  if (coalitionIds.length === 0) return [];
  const coalitionsRes = await client
    .from("coalition_sessions")
    .select("*")
    .in("id", coalitionIds);
  if (coalitionsRes.error) throw coalitionsRes.error;
  const coalitionsById = new Map(
    (coalitionsRes.data ?? []).map((coalition) => [coalition.id, coalition as CoalitionSessionRecord]),
  );
  return (data ?? []).flatMap((member) => {
    const coalition = coalitionsById.get(member.coalition_session_id);
    if (!coalition) return [];
    return [
      {
        id: coalition.id,
        title: coalition.title,
        objective: coalition.objective,
        status: coalition.status,
        mountain_id: coalition.mountain_id,
        campaign_id: coalition.campaign_id,
        work_spec_id: coalition.work_spec_id,
        reliability_score: toNumber(coalition.reliability_score, 50),
      } satisfies RuntimeCoalitionInvite,
    ];
  });
}

export async function listRuntimeReplicationCalls(agentId: string): Promise<RuntimeReplicationAlert[]> {
  const lifecycle = await getAgentLifecycleRecord(agentId);
  const client = db();
  const { data, error } = await client
    .from("replication_calls")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(lifecycle?.lifecycle_state === "claimed" ? 20 : 10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    urgency: urgencyValue(row.urgency),
    reward_credits: toNumber(row.reward_credits),
    mountain_id: row.mountain_id,
    campaign_id: row.campaign_id,
    deliverable_id: row.deliverable_id,
  }));
}

export async function listRuntimeContradictionAlerts(
  agentId?: string,
): Promise<RuntimeContradictionAlert[]> {
  const lifecycle = agentId ? await getAgentLifecycleRecord(agentId) : null;
  const client = db();
  const { data, error } = await client
    .from("contradiction_clusters")
    .select("*")
    .neq("status", "resolved")
    .order("updated_at", { ascending: false })
    .limit(lifecycle?.lifecycle_state === "claimed" ? 16 : 8);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    severity: severityValue(row.severity),
    status: row.status,
    mountain_id: row.mountain_id,
    campaign_id: row.campaign_id,
  }));
}

export async function listRuntimeArtifactThreadMentions(
  agentId?: string,
): Promise<RuntimeArtifactThreadMention[]> {
  void agentId;
  const client = db();
  const { data, error } = await client
    .from("artifact_threads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    thread_type: row.thread_type,
    mountain_id: row.mountain_id,
    campaign_id: row.campaign_id,
    last_activity_at: row.updated_at,
  }));
}

export async function listRuntimeMethodRecommendations(agentId: string): Promise<RuntimeMethodRecommendation[]> {
  const lifecycle = await getAgentLifecycleRecord(agentId);
  const client = db();
  const { data, error } = await client
    .from("method_cards")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(lifecycle?.lifecycle_state === "claimed" ? 12 : 6);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    method_type: row.status,
    mountain_id: row.mountain_id,
    campaign_id: row.campaign_id,
    verified_usefulness: toNumber(row.usefulness_score),
    reuse_count: toNumber(row.reuse_count),
  }));
}

export const listRuntimeArtifactMentions = listRuntimeArtifactThreadMentions;
export const listRuntimeContradictions = listRuntimeContradictionAlerts;
