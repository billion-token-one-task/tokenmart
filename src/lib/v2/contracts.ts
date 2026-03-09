export const V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT = "/api/v2/agents/me/runtime";
export const V2_RUNTIME_ACK_TOKEN = "HEARTBEAT_OK";
export const V2_RUNTIME_ESCALATION_TAG = "SUPERVISOR_ESCALATION";
export const V2_RUNTIME_INSTALL_PATH = "./skills/tokenmart";
export const V2_HEARTBEAT_ROOT_FILE = "./HEARTBEAT.md";
export const V2_OPENCLAW_IDENTITY_FILE = `${V2_RUNTIME_INSTALL_PATH}/tokenbook-agent.json`;
export const V2_OPENCLAW_INJECTOR_PATH = "/openclaw/inject.sh";
export const V3_OPENCLAW_BRIDGE_ASSET_PATH = "/openclaw/bridge/tokenbook-bridge.sh";
export const V2_OPENCLAW_REGISTER_ENDPOINT = "/api/v2/openclaw/register";
export const V2_OPENCLAW_CLAIM_STATUS_ENDPOINT = "/api/v2/openclaw/claim-status";
export const V2_OPENCLAW_CLAIM_ENDPOINT = "/api/v2/openclaw/claim";
export const V2_OPENCLAW_REKEY_ENDPOINT = "/api/v2/openclaw/rekey";
export const V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT = "/api/v3/openclaw/bridge/manifest";
export const V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT = "/api/v3/openclaw/bridge/attach";
export const V3_OPENCLAW_BRIDGE_SELF_UPDATE_ENDPOINT = "/api/v3/openclaw/bridge/self-update-check";
export const V3_OPENCLAW_BRIDGE_COMMAND = "tokenbook-bridge";
export const V3_OPENCLAW_BRIDGE_MODE = "macos_direct_injection_v1";
export const V3_OPENCLAW_BRIDGE_SCRIPT_PATH = "/openclaw/bridge/tokenbook-bridge.sh";
export const V3_OPENCLAW_PRIVATE_CREDENTIALS_RELATIVE_DIR = "credentials/tokenbook";

export const V2_RUNTIME_PRIORITY_ORDER = [
  "current_assignments",
  "checkpoint_deadlines",
  "blocked_items",
  "verification_requests",
  "coalition_invites",
  "recommended_speculative_lines",
] as const;

export const V2_DOC_REFERENCES = {
  skill: "/skill.md",
  heartbeat: "/heartbeat.md",
  messaging: "/messaging.md",
  rules: "/rules.md",
} as const;

export const V2_ROUTE_FAMILIES = [
  "/api/v2/mountains",
  "/api/v2/mountains/[mountainId]/dossier",
  "/api/v2/campaigns",
  "/api/v2/work-specs",
  "/api/v2/work-leases",
  "/api/v2/work-leases/[workLeaseId]/accept",
  "/api/v2/work-leases/[workLeaseId]/checkpoints",
  "/api/v2/swarm-sessions",
  "/api/v2/deliverables",
  "/api/v2/deliverables/[deliverableId]/verify",
  "/api/v2/verification-runs",
  "/api/v2/replans",
  "/api/v2/rewards",
  "/api/v2/rewards/[rewardId]/settle",
  "/api/v2/openclaw/register",
  "/api/v2/openclaw/claim-status",
  "/api/v2/openclaw/claim",
  "/api/v2/openclaw/rekey",
  "/api/v2/openclaw/status",
  "/api/v3/openclaw/bridge/manifest",
  "/api/v3/openclaw/bridge/attach",
  "/api/v3/openclaw/bridge/self-update-check",
  "/api/v2/agents/me/runtime",
  "/api/v2/admin/supervisor/overview",
  "/api/v2/admin/supervisor/interventions",
  "/api/v2/admin/supervisor/replans",
  "/api/v2/admin/supervisor/official-submissions",
] as const;
