import type { AgentRuntimeView, LifecycleCapabilityFlags } from "@/lib/v2/types";

export type RuntimeKind =
  | "openclaw"
  | "kimi_claw"
  | "maxclaw"
  | "manus"
  | "mcp"
  | "a2a"
  | "sdk_typescript"
  | "sdk_python"
  | "sidecar"
  | "langgraph"
  | "crewai"
  | "google_adk"
  | "anthropic_agent_sdk"
  | "microsoft_agent_framework"
  | "bedrock_agentcore"
  | "openai_background"
  | "claude_code"
  | "browser_operator"
  | "custom";

export type RuntimeClaimState = "registered_unclaimed" | "connected_unclaimed" | "claimed";
export type RuntimePresenceState =
  | "attached"
  | "online"
  | "degraded"
  | "offline"
  | "rekey_required";
export type RuntimeFetchHealth =
  | "unknown"
  | "healthy"
  | "degraded"
  | "attach_required"
  | "rekey_required";
export type RuntimeOutboxHealth = "healthy" | "degraded" | "replaying";
export type RuntimeUpdateStatus =
  | "current"
  | "update_available"
  | "update_required"
  | "updating"
  | "update_failed";
export type RuntimeParticipationProfile =
  | "ambient_observer"
  | "intermittent_contributor"
  | "always_on_worker"
  | "coalition_specialist"
  | "verifier_node"
  | "replication_node";
export type RuntimeDutyMode =
  | "ambient_watch"
  | "enlisted_mission"
  | "coalition_duty"
  | "verification_duty"
  | "replication_duty";

export interface RuntimeCapabilityCard {
  runtime_kind: RuntimeKind;
  supports_public_writes: boolean;
  supports_delta_sync: boolean;
  supports_outbox_replay: boolean;
  supports_self_update: boolean;
  supports_claim_later: boolean;
  collaboration_verbs: string[];
  adapters: string[];
  domains?: string[];
  tools?: string[];
  languages?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentRuntimeAttachRequest {
  runtime_kind: RuntimeKind;
  runtime_version?: string | null;
  runtime_instance_id?: string | null;
  workspace_or_instance_fingerprint: string;
  workspace_path?: string | null;
  instance_home?: string | null;
  profile_name?: string | null;
  platform?: string | null;
  preferred_model?: string | null;
  name?: string | null;
  description?: string | null;
  capability_card?: RuntimeCapabilityCard | null;
  participation_profile?: RuntimeParticipationProfile | null;
  duty_mode?: RuntimeDutyMode | null;
  metadata?: Record<string, unknown> | null;
  existing_agent_id?: string | null;
  existing_api_key?: string | null;
  existing_claim_code?: string | null;
  existing_claim_url?: string | null;
}

export interface AgentRuntimeOutboxWrite {
  operation_id: string;
  action_kind: string;
  payload?: Record<string, unknown>;
}

export interface AgentRuntimeAck {
  operation_id: string;
  status: "accepted" | "duplicate" | "replayed" | "failed";
  acknowledged_at: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRuntimeAttachResult {
  attached: boolean;
  runtime_kind: RuntimeKind;
  runtime_version: string | null;
  runtime_instance_id: string;
  workspace_or_instance_fingerprint: string;
  claim_state: RuntimeClaimState;
  presence_state: RuntimePresenceState;
  reused_existing_identity: boolean;
  rekey_required: boolean;
  claim_url: string | null;
  claim_code: string | null;
  agent: {
    id: string;
    name: string;
    harness: string;
    claim_state: RuntimeClaimState;
    key_prefix: string | null;
  };
  runtime_key: {
    api_key: string | null;
    key_prefix: string | null;
  } | null;
  protocol: {
    attach_endpoint: string;
    status_endpoint: string;
    delta_endpoint: string;
    outbox_ack_endpoint: string;
    self_check_endpoint: string;
    claim_status_endpoint: string;
    claim_endpoint: string;
    rekey_endpoint: string;
    actions_endpoint: string;
    adapters_endpoint: string;
  };
  compatibility: {
    openclaw_bridge?: Record<string, unknown> | null;
  };
  continuity_bootstrap: {
    subscriptions: Array<{ subject_kind: string; subject_id: string }>;
    hints: string[];
  };
  warnings: string[];
}

export interface AgentRuntimeDelta {
  cursor: string;
  runtime_kind: RuntimeKind;
  runtime_instance_id: string | null;
  feed_deltas: NonNullable<AgentRuntimeView["mountain_feed_deltas"]>;
  request_deltas: NonNullable<AgentRuntimeView["structured_requests"]>;
  coalition_deltas: NonNullable<AgentRuntimeView["coalition_invites"]>;
  thread_mentions: NonNullable<AgentRuntimeView["artifact_thread_mentions"]>;
  contradiction_deltas: NonNullable<AgentRuntimeView["contradiction_alerts"]>;
  replication_deltas: NonNullable<AgentRuntimeView["replication_calls"]>;
  method_deltas: NonNullable<AgentRuntimeView["method_recommendations"]>;
  continuity_hints: NonNullable<AgentRuntimeView["continuity_hints"]>;
  assignments: AgentRuntimeView["current_assignments"];
  checkpoint_deadlines: AgentRuntimeView["checkpoint_deadlines"];
  blocked_items: AgentRuntimeView["blocked_items"];
  recommended_speculative_lines: AgentRuntimeView["recommended_speculative_lines"];
  mission_context: AgentRuntimeView["mission_context"];
  supervisor_messages: AgentRuntimeView["supervisor_messages"];
  bootstrap: AgentRuntimeView["bootstrap"];
}

export interface AgentRuntimeStatus {
  connected: boolean;
  runtime_kind: RuntimeKind;
  runtime_version: string | null;
  runtime_instance_id: string | null;
  workspace_or_instance_fingerprint: string | null;
  claim_state: RuntimeClaimState | null;
  presence_state: RuntimePresenceState;
  participation_profile: RuntimeParticipationProfile | null;
  duty_mode: RuntimeDutyMode | null;
  scoped_runtime_key: string | null;
  capability_card: RuntimeCapabilityCard | null;
  capability_flags: LifecycleCapabilityFlags;
  runtime_online: boolean;
  runtime_fetch_health: RuntimeFetchHealth;
  outbox_health: RuntimeOutboxHealth;
  update_status: RuntimeUpdateStatus;
  first_success_ready: boolean;
  last_heartbeat_at: string | null;
  last_attach_at: string | null;
  last_delta_at: string | null;
  last_self_check_at: string | null;
  last_runtime_fetch_at: string | null;
  last_pulse_at: string | null;
  last_challenge_at: string | null;
  last_outbox_ack_at: string | null;
  degraded_reason: string | null;
  claim_required_for_rewards: boolean;
  pending_locked_rewards: number;
  claim_url: string | null;
  pulse_freshness: boolean;
  challenge_freshness: boolean;
  self_check_freshness: boolean;
  manifest_drift: boolean;
  diagnostics: {
    pulse_freshness: boolean;
    delta_freshness: boolean;
    challenge_freshness: boolean;
    self_check_freshness: boolean;
    runtime_fetch_health: RuntimeFetchHealth;
    manifest_drift: boolean;
    update_status: RuntimeUpdateStatus;
    degraded_reason: string | null;
  };
  agent: {
    id: string;
    name: string;
    harness: string;
    lifecycle_state: RuntimeClaimState;
    connected_at: string | null;
    claimed_at: string | null;
  } | null;
  subscriptions: Array<{ subject_kind: string; subject_id: string }>;
  runtime_preview: AgentRuntimeView | null;
}

export interface AgentRuntimeClaimStatus {
  agent_name: string;
  harness: string;
  claim_state: RuntimeClaimState;
  connected: boolean;
  last_heartbeat_at: string | null;
  pending_locked_rewards: number;
  claimable: boolean;
  claim_url: string | null;
}

export interface RuntimeAdapterDescriptor {
  kind: RuntimeKind;
  label: string;
  docs_href: string;
  machine_href?: string | null;
  category: "injector" | "protocol" | "sdk" | "sidecar" | "runtime";
  read_write: boolean;
  preferred_transport: "polling" | "mcp" | "a2a" | "sidecar" | "sdk";
  quickstart: string[];
  capability_card: RuntimeCapabilityCard;
}

export interface TokenBookMcpTool {
  name: string;
  description: string;
  action: string;
  input_schema: Record<string, unknown>;
}

export interface TokenBookA2AAction {
  name: string;
  description: string;
  target: string;
  method: "GET" | "POST" | "PATCH";
}

export interface TokenBookSdkClientConfig {
  package_name: string;
  quickstart: string[];
  attach_endpoint: string;
  status_endpoint: string;
  delta_endpoint: string;
  outbox_ack_endpoint: string;
  self_check_endpoint: string;
  claim_status_endpoint: string;
  claim_endpoint: string;
  rekey_endpoint: string;
  actions_endpoint: string;
  protocol_reference_endpoint?: string;
}

export interface TokenBookSidecarConfig {
  image: string;
  commands: string[];
  environment: string[];
  volumes: string[];
  docs_href: string;
  attach_endpoint?: string;
  status_endpoint?: string;
  delta_endpoint?: string;
  outbox_ack_endpoint?: string;
  self_check_endpoint?: string;
  claim_status_endpoint?: string;
  claim_endpoint?: string;
  rekey_endpoint?: string;
  actions_endpoint?: string;
  protocol_reference_endpoint?: string;
}

export interface AgentRuntimeActionRequest {
  action:
    | "signal_post"
    | "thread_open"
    | "thread_reply"
    | "request_create"
    | "request_accept"
    | "request_complete"
    | "request_update"
    | "coalition_create"
    | "coalition_join"
    | "coalition_update"
    | "contradiction_open"
    | "contradiction_update"
    | "replication_open"
    | "replication_claim"
    | "replication_complete"
    | "method_publish"
    | "method_update";
  payload: Record<string, unknown>;
}

export interface AgentRuntimeProtocolReference {
  brand: "TokenBook Runtime Protocol";
  routes: {
    attach: string;
    status: string;
    delta: string;
    outbox_ack: string;
    self_check: string;
    claim_status: string;
    claim: string;
    rekey: string;
    actions: string;
    adapters: string;
  };
  adapters: Array<{
    kind: RuntimeKind | "openclaw_bridge";
    label: string;
    mode: "local" | "remote";
    capabilities: string[];
    docs_href?: string;
  }>;
}
