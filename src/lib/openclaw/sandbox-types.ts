export type OpenClawSandboxScenario =
  | "fresh_install"
  | "wipe_and_reinstall_same_fingerprint"
  | "wipe_and_reinstall_new_fingerprint"
  | "gateway_wake"
  | "strict_provider_turn";

export type OpenClawSandboxServerMode = "auto" | "reuse" | "spawn-dev" | "spawn-start";
export type OpenClawSandboxKeepArtifacts = "fail" | "always" | "never";
export type OpenClawSandboxStatus = "idle" | "queued" | "running" | "passed" | "failed" | "partial";

export const OPENCLAW_SANDBOX_SCENARIOS: OpenClawSandboxScenario[] = [
  "fresh_install",
  "wipe_and_reinstall_same_fingerprint",
  "wipe_and_reinstall_new_fingerprint",
  "gateway_wake",
  "strict_provider_turn",
];

export interface OpenClawSandboxCapabilities {
  can_run_destructive: boolean;
  can_view_artifacts: boolean;
  is_local_environment: boolean;
  strict_turn_available: boolean;
  execution_mode: "local" | "read-only";
  reason: string | null;
}

export interface OpenClawSandboxDefaults {
  baseUrl: string;
  serverMode: OpenClawSandboxServerMode;
  cliVersion: string;
  keepArtifacts: OpenClawSandboxKeepArtifacts;
  requireTurnSuccess: boolean;
  scenarios: OpenClawSandboxScenario[];
}

export interface OpenClawSandboxCliCache {
  cacheRoot: string;
  availableVersions: string[];
  activeVersion: string | null;
  binaryPath: string | null;
}

export interface OpenClawSandboxArtifact {
  key: string;
  label: string;
  path: string;
  kind: string;
  scenario?: OpenClawSandboxScenario;
  retained: boolean;
  exists?: boolean;
  sizeBytes?: number | null;
}

export interface OpenClawSandboxStepResult {
  scenario: OpenClawSandboxScenario;
  name: string;
  ok: boolean;
  status: "pass" | "fail";
  details?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
}

export interface OpenClawSandboxScenarioRecord {
  scenario: OpenClawSandboxScenario;
  status: OpenClawSandboxStatus;
  summary?: string | null;
  workspacePath?: string | null;
  openclawHome?: string | null;
  configPath?: string | null;
  downloadedInstallerPath?: string | null;
  identityPath?: string | null;
  previousAgentId?: string | null;
  agentId?: string | null;
  reusedIdentity?: boolean | null;
  warnings?: string[];
  steps?: OpenClawSandboxStepResult[];
  artifacts?: OpenClawSandboxArtifact[];
}

export interface OpenClawSandboxRunRecord {
  id: string;
  status: OpenClawSandboxStatus;
  startedAt: string;
  finishedAt?: string | null;
  baseUrl: string;
  serverMode: OpenClawSandboxServerMode;
  cliVersion: string;
  keepArtifacts: OpenClawSandboxKeepArtifacts;
  requireTurnSuccess: boolean;
  scenarios: OpenClawSandboxScenario[];
  summary?: string | null;
  warnings: string[];
  steps: OpenClawSandboxStepResult[];
  scenariosDetail: OpenClawSandboxScenarioRecord[];
  retainedArtifacts: OpenClawSandboxArtifact[];
}

export interface OpenClawSandboxSnapshot {
  status: OpenClawSandboxStatus;
  capabilities: OpenClawSandboxCapabilities;
  defaults: OpenClawSandboxDefaults;
  cliCache: OpenClawSandboxCliCache;
  latestRun: OpenClawSandboxRunRecord | null;
  recentRuns: OpenClawSandboxRunRecord[];
  retainedArtifacts: OpenClawSandboxArtifact[];
}

export interface OpenClawSandboxRunStartInput {
  scenarios: OpenClawSandboxScenario[];
  baseUrl?: string;
  serverMode?: OpenClawSandboxServerMode;
  cliVersion?: string;
  keepArtifacts?: OpenClawSandboxKeepArtifacts;
  requireTurnSuccess?: boolean;
}
