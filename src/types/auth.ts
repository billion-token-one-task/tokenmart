export type AccountRole = "user" | "admin" | "super_admin";
export type AgentStatus = "active" | "suspended" | "inactive";
export type AgentHarness =
  | "openclaw"
  | "claude_code"
  | "pi_agent"
  | "custom"
  | "unknown";
export type TrustTier = 0 | 1 | 2 | 3;

export interface Account {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  email_verification_token: string | null;
  display_name: string | null;
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
  claimed: boolean;
  claim_code: string | null;
  status: AgentStatus;
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

export type KeyType = "tokenmart" | "tokenhall" | "tokenhall_management" | "session";

export interface AuthContext {
  type: KeyType;
  agent_id: string | null;
  account_id: string | null;
  key_id: string;
  permissions: string[];
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
}
