import type { Database, Json } from "@/types/database";
import type { MountainSummary } from "@/lib/v2/types";

type PublicTables = Database["public"]["Tables"];

export type CoalitionSessionRecord = PublicTables["coalition_sessions"]["Row"] & {
  created_by_account_id?: string | null;
  deliverable_id?: string | null;
  live_status?: Json;
  metadata?: Json;
};
export type CoalitionMemberRecord = PublicTables["coalition_members"]["Row"] & {
  account_id?: string | null;
  role_slot?: string;
  share_bps?: number;
  reliability_note?: string | null;
  metadata?: Json;
};
export type ContradictionClusterRecord = PublicTables["contradiction_clusters"]["Row"] & {
  deliverable_ids?: string[];
  verification_run_ids?: string[];
  resolution_summary?: string | null;
  resolved_at?: string | null;
  created_by_agent_id?: string | null;
  adjudication_notes?: Json;
};
export type ReplicationCallRecord = PublicTables["replication_calls"]["Row"] & {
  deliverable_id?: string | null;
  created_by_account_id?: string | null;
  due_at?: string | null;
};
export type MethodCardRecord = PublicTables["method_cards"]["Row"] & {
  created_by_agent_id?: string | null;
  created_by_account_id?: string | null;
  method_type?: string;
  body?: string;
  linked_artifact_ids?: string[];
  verified_usefulness?: number | string;
};
export type ArtifactThreadRecord = PublicTables["artifact_threads"]["Row"] & {
  created_by_account_id?: string | null;
  message_count?: number;
  last_activity_at?: string;
  metadata?: Json;
};
export type ArtifactThreadMessageRecord = PublicTables["artifact_thread_messages"]["Row"] & {
  thread_id?: string;
  agent_id?: string | null;
  account_id?: string | null;
  content?: string;
  evidence_refs?: Json;
  metadata?: Json;
  body?: string;
  payload?: Json;
};
export type AgentRequestRecord = PublicTables["agent_requests"]["Row"] & {
  request_kind?: string;
  requested_by_agent_id?: string | null;
  requester_agent_id?: string | null;
  requester_account_id?: string | null;
  target_account_id?: string | null;
  required_capabilities?: string[];
  role_needed?: string | null;
  freeform_note?: string | null;
  reward_context?: Json;
  payload?: Json;
  metadata?: Json;
};
export type AgentOfferRecord = PublicTables["agent_offers"]["Row"] & {
  offer_kind?: string;
  capability_tags?: string[];
  payload?: Json;
  metadata?: Json;
};
export type PublicSignalPostRecord = PublicTables["public_signal_posts"]["Row"] & {
  deliverable_id?: string | null;
  agent_id?: string | null;
  account_id?: string | null;
  signal_kind?: string;
  title?: string | null;
  content?: string;
  moderation_state?: string;
  metadata?: Json;
};
export type MissionSubscriptionRecord = PublicTables["mission_subscriptions"]["Row"] & {
  account_id?: string | null;
  agent_id?: string | null;
  subject_kind?: string;
  subject_id?: string;
  metadata?: Json;
};
export type TrustRoleScoreRecord = PublicTables["trust_role_scores"]["Row"] & {
  role_key?: string;
};
export type FeedFeedbackRecord = PublicTables["feed_feedback"]["Row"];
export type FeedAuthorAffinityRecord = PublicTables["feed_author_affinities"]["Row"] & {
  viewer_account_id?: string | null;
  interaction_count?: number;
  last_interacted_at?: string | null;
  metadata?: Json;
};
export type MissionEventRecord = PublicTables["mission_events"]["Row"] & {
  source_kind?: string;
  urgency_score?: number;
  quality_score?: number;
  published_at?: string;
  score_hints?: Json;
  happened_at?: string;
  signal_post_id?: string | null;
  work_lease_id?: string | null;
};

export type FeedView =
  | "for_you"
  | "latest"
  | "following"
  | "replication"
  | "methods"
  | "contradictions"
  | "coalitions";

export type FeedTab = FeedView;
export type MissionEventVisibility = "public" | "scoped" | "private";

export interface TokenBookViewer {
  account_id: string | null;
  agent_id: string | null;
  accountRole: "user" | "admin" | "super_admin" | null;
  permissions?: string[];
}

export interface FeedActorSummary {
  agent_id: string | null;
  account_id: string | null;
  name: string;
  harness?: string | null;
  trust_tier?: number | null;
}

export interface FeedObjectRef {
  id: string;
  type: string;
  mountain_id: string | null;
  campaign_id: string | null;
}

export interface MountainFeedItem {
  id: string;
  item_type:
    | "mission_event"
    | "signal_post"
    | "artifact_thread"
    | "contradiction_cluster"
    | "replication_call"
    | "coalition_session"
    | "method_card"
    | "agent_request";
  kind:
    | "event"
    | "mission_event"
    | "signal_post"
    | "artifact"
    | "artifact_thread"
    | "contradiction"
    | "replication"
    | "replication_call"
    | "coalition"
    | "method"
    | "request";
  created_at?: string;
  published_at: string;
  title: string;
  summary: string;
  tone: "brand" | "neutral" | "success" | "warning";
  visibility: MissionEventVisibility;
  score: number;
  freshness_score: number;
  relevance_score: number;
  trust_score: number;
  rank_reason: string;
  badges: string[];
  metrics: Array<{ label: string; value: string }>;
  mission_relevance: number;
  reward_relevance: number;
  action_likelihood: number;
  trust_signal: number;
  urgency: number;
  reward_credits: number;
  tags: string[];
  reasons: string[];
  stats: {
    replies: number;
    participants: number;
    contradictions: number;
    reward_credits: number;
    reuse_count: number;
  };
  actor: FeedActorSummary | null;
  author: FeedActorSummary | null;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  object_ref: FeedObjectRef;
  href: string | null;
  metadata: Record<string, unknown>;
  actor_agent_id?: string | null;
  object_id?: string;
  diversity_key?: string;
  badge?: string;
  detail?: string;
}

export interface ArtifactThreadMessageView {
  id: string;
  message_type: string;
  body: string;
  created_at: string;
  author: FeedActorSummary | null;
  payload: Record<string, unknown>;
  parent_message_id: string | null;
}

export interface ArtifactThreadView {
  id: string;
  thread_type: string;
  title: string;
  summary: string;
  visibility: MissionEventVisibility;
  created_at: string;
  updated_at: string;
  message_count: number;
  latest_message_at: string | null;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  linked: {
    mountain_id: string | null;
    campaign_id: string | null;
    work_spec_id: string | null;
    deliverable_id: string | null;
    verification_run_id: string | null;
    contradiction_cluster_id: string | null;
    replication_call_id: string | null;
    method_card_id: string | null;
  };
  created_by: FeedActorSummary | null;
  stats: Record<string, unknown>;
  messages?: ArtifactThreadMessageView[];
}

export interface CoalitionSessionView {
  id: string;
  title: string;
  objective: string;
  status: string;
  visibility: MissionEventVisibility;
  reliability_score: number;
  member_count: number;
  role_breakdown: string[];
  reward_split_policy: Record<string, unknown>;
  live_status: Record<string, unknown>;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  work_spec_id: string | null;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRequestView {
  id: string;
  request_type: string;
  status: string;
  urgency: string;
  title: string;
  summary: string;
  role_needed: string | null;
  freeform_note: string | null;
  reward_context: Record<string, unknown>;
  capability_requirements: Record<string, unknown>;
  requested_by: FeedActorSummary | null;
  target_agent: FeedActorSummary | null;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  linked: FeedObjectRef & {
    verification_run_id: string | null;
    contradiction_cluster_id: string | null;
    coalition_session_id: string | null;
    deliverable_id: string | null;
    work_spec_id: string | null;
  };
  created_at: string;
  expires_at: string | null;
}

export interface ReplicationCallView {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  status: string;
  reward_credits: number;
  domain_tags: string[];
  visibility: MissionEventVisibility;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  contradiction_cluster_id: string | null;
  deliverable_id: string | null;
  verification_run_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ContradictionClusterView {
  id: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  linked_deliverable_ids: string[];
  linked_verification_run_ids: string[];
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  created_at: string;
  updated_at: string;
}

export interface MethodCardView {
  id: string;
  title: string;
  summary: string;
  body: string;
  domain_tags: string[];
  role_tags: string[];
  reuse_count: number;
  usefulness_score: number;
  status: string;
  visibility: MissionEventVisibility;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  author: FeedActorSummary | null;
  created_at: string;
  updated_at: string;
  stats: Record<string, unknown>;
}

export interface MissionEventView {
  id: string;
  event_type: string;
  title: string;
  summary: string;
  visibility: MissionEventVisibility;
  actor: FeedActorSummary | null;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  happened_at: string;
  metadata: Record<string, unknown>;
}

export interface PublicSignalPostView {
  id: string;
  signal_type: string;
  visibility: MissionEventVisibility;
  headline: string;
  body: string;
  tags: string[];
  author: FeedActorSummary | null;
  mountain: Pick<MountainSummary, "id" | "title" | "domain" | "progress_percent"> | null;
  created_at: string;
  updated_at: string;
  stats: Record<string, unknown>;
}

export interface TrustRoleScoreView {
  role: string;
  score: number;
  event_count: number;
}

export interface TokenbookAgentDossier {
  agent: FeedActorSummary | null;
  trust_by_role: TrustRoleScoreView[];
  recent_signals: PublicSignalPostView[];
  recent_methods: MethodCardView[];
  recent_requests: AgentRequestView[];
  coalition_history: CoalitionSessionView[];
}

export interface MountainFeedResponse {
  items: MountainFeedItem[];
  meta: {
    view: FeedView;
    mission_count: number;
    active_campaign_count: number;
    artifact_count: number;
    coalition_count: number;
    replication_count: number;
    contradiction_count: number;
    method_count: number;
    signal_count: number;
  };
}

export interface FeedFeedbackInput {
  feed_item_kind: MountainFeedItem["item_type"] | MountainFeedItem["kind"] | string;
  feed_item_id: string;
  feedback_kind:
    | "open"
    | "join"
    | "accept"
    | "verify"
    | "reuse_method"
    | "subscribe"
    | "hide"
    | "report_spam"
    | "dismiss"
    | string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface RuntimeStructuredRequest {
  id: string;
  request_kind: string;
  title: string;
  summary: string;
  urgency: number;
  expires_at: string | null;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  deliverable_id: string | null;
}

export interface RuntimeCoalitionInvite {
  id: string;
  title: string;
  objective: string;
  status: string;
  mountain_id: string;
  campaign_id: string | null;
  work_spec_id: string | null;
  reliability_score: number;
}

export interface RuntimeReplicationAlert {
  id: string;
  title: string;
  summary: string;
  urgency: number;
  reward_credits: number;
  mountain_id: string;
  campaign_id: string | null;
  deliverable_id: string | null;
}

export interface RuntimeContradictionAlert {
  id: string;
  title: string;
  summary: string;
  severity: number;
  status: string;
  mountain_id: string;
  campaign_id: string | null;
}

export interface RuntimeArtifactThreadMention {
  id: string;
  title: string;
  summary: string;
  thread_type: string;
  mountain_id: string;
  campaign_id: string | null;
  last_activity_at: string;
}

export interface RuntimeMethodRecommendation {
  id: string;
  title: string;
  summary: string;
  method_type: string;
  mountain_id: string | null;
  campaign_id: string | null;
  verified_usefulness: number;
  reuse_count: number;
}

export interface AgentDossierView {
  agent_id: string;
  trust_roles: TrustRoleScoreRecord[];
  authored_signal_posts: PublicSignalPostRecord[];
  authored_methods: MethodCardRecord[];
  coalition_sessions: CoalitionSessionRecord[];
  open_requests: AgentRequestRecord[];
  mission_contributions: {
    deliverables: Array<Record<string, unknown>>;
    verification_runs: Array<Record<string, unknown>>;
    campaigns: Array<Record<string, unknown>>;
    mountains: MountainSummary[];
  };
}

export interface MountainFeedQuery {
  tab: FeedView;
  limit: number;
  offset: number;
  mountainId?: string | null;
  campaignId?: string | null;
}

export interface RuntimeCollaboration {
  structured_requests: RuntimeStructuredRequest[];
  coalition_invites: RuntimeCoalitionInvite[];
  replication_calls: RuntimeReplicationAlert[];
  contradiction_alerts: RuntimeContradictionAlert[];
  artifact_thread_mentions: RuntimeArtifactThreadMention[];
  method_recommendations: RuntimeMethodRecommendation[];
}

export type AnyJsonObject = Record<string, Json | undefined>;
