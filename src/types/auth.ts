export type AccountRole = "user" | "admin" | "super_admin";
export type AgentStatus = "active" | "suspended" | "inactive";
export type AgentLifecycleState =
  | "registered_unclaimed"
  | "connected_unclaimed"
  | "claimed";
export type AgentHarness =
  | "openclaw"
  | "kimi_claw"
  | "maxclaw"
  | "manus"
  | "claude_code"
  | "pi_agent"
  | "custom"
  | "unknown"
  | "mcp"
  | "a2a"
  | "sidecar"
  | "sdk_ts"
  | "sdk_python"
  | "langgraph"
  | "crewai"
  | "google_adk"
  | "anthropic_agent_sdk"
  | "microsoft_agent_framework"
  | "bedrock_agentcore"
  | "openai_background"
  | "browser_operator";
export type TrustTier = 0 | 1 | 2 | 3;

export interface ScoreComponent {
  value: number;
  max: number;
  label: string;
}

export interface ServiceHealthSnapshot {
  score_version: string;
  runtime_mode: string;
  declared_interval_seconds: number | null;
  score: number;
  confidence: number;
  heartbeat_sample_count: number;
  challenge_sample_count: number;
  components: {
    cadence: ScoreComponent;
    challenge_reliability: ScoreComponent;
    latency: ScoreComponent;
    chain_continuity: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

export interface OrchestrationCapabilitySnapshot {
  score_version: string;
  score: number;
  confidence: number;
  components: {
    delivery: ScoreComponent;
    review: ScoreComponent;
    collaboration: ScoreComponent;
    planning: ScoreComponent;
    decomposition_quality: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

export interface MarketTrustSnapshot {
  trust_score: number;
  karma: number;
  trust_tier: number;
  recent_event_count?: number;
}

export interface Account {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  email_verification_token: string | null;
  display_name: string | null;
  supabase_auth_user_id?: string | null;
  auth_provider?: "legacy" | "google" | "magic_link" | "email_password" | "email_otp" | "unknown";
  last_login_at?: string | null;
  role: AccountRole;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  harness: AgentHarness;
  owner_account_id: string | null;
  bootstrap_account_id?: string | null;
  claimed: boolean;
  claim_code: string | null;
  status: AgentStatus;
  lifecycle_state: AgentLifecycleState;
  bootstrap_expires_at?: string | null;
  connected_at?: string | null;
  claimed_at?: string | null;
  trust_tier: TrustTier;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuthApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  label: string | null;
  agent_id: string | null;
  account_id: string | null;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface IdentityToken {
  id: string;
  agent_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface DaemonScore {
  agent_id: string;
  score: number;
  heartbeat_regularity: number;
  challenge_response_rate: number;
  challenge_median_latency_ms: number | null;
  circadian_score: number;
  last_chain_length: number;
  score_version: string;
  runtime_mode: string;
  declared_interval_seconds: number | null;
  heartbeat_sample_count: number;
  challenge_sample_count: number;
  cadence_score: number;
  challenge_reliability_score: number;
  latency_score: number;
  chain_score: number;
  service_health_score: number;
  orchestration_score: number;
  decomposition_quality_score: number;
  score_confidence: number;
  metrics: Record<string, unknown>;
  service_health?: ServiceHealthSnapshot | null;
  orchestration_capability?: OrchestrationCapabilitySnapshot | null;
  market_trust?: MarketTrustSnapshot | null;
  updated_at: string;
}

export interface Heartbeat {
  id: string;
  agent_id: string;
  nonce: string;
  prev_nonce: string | null;
  chain_length: number;
  timestamp: string;
}

export interface MicroChallenge {
  id: string;
  agent_id: string;
  challenge_id: string;
  issued_at: string;
  deadline_seconds: number;
  responded_at: string | null;
  latency_ms: number | null;
}

export type KeyType =
  | "tokenmart"
  | "tokenhall"
  | "tokenhall_management"
  | "session"
  | "supabase_session";

export interface AuthContext {
  type: KeyType;
  agent_id: string | null;
  account_id: string | null;
  key_id: string;
  permissions: string[];
  rate_limit_rpm?: number | null;
}

export interface AgentRegistrationRequest {
  name: string;
  harness?: AgentHarness;
  description?: string;
}

export interface AgentRegistrationResponse {
  agent_id: string;
  api_key: string;
  key_prefix: string;
  claim_url: string;
  claim_code: string;
  wallet_address: string;
  wallet_type: "sub_wallet";
}
