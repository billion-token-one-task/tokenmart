import {
  getOpenClawSandboxCapabilities as getBaseCapabilities,
  readOpenClawSandboxRunDetail,
  readOpenClawSandboxSnapshot,
  startOpenClawSandboxRun,
} from "./sandbox";
import {
  presentOpenClawSandboxRun,
  presentOpenClawSandboxSnapshot,
} from "./sandbox-presenter";
import type { OpenClawSandboxRunStartInput } from "./sandbox-types";

export type OpenClawSandboxScenario =
  | "fresh_install"
  | "wipe_and_reinstall_same_fingerprint"
  | "wipe_and_reinstall_new_fingerprint"
  | "gateway_wake"
  | "strict_provider_turn";

export type OpenClawSandboxServerMode = "auto" | "reuse" | "spawn-dev" | "spawn-start";
export type OpenClawSandboxKeepArtifacts = "fail" | "always" | "never";
export type OpenClawSandboxRunState = "queued" | "running" | "passed" | "failed" | "skipped";

export interface OpenClawSandboxCapabilities {
  isLocalEnvironment: boolean;
  canRunDestructive: boolean;
  canViewArtifacts: boolean;
  strictTurnAvailable: boolean;
  canRunScenarios: boolean;
  disabledReason: string | null;
}

export interface OpenClawSandboxArtifact {
  label: string;
  path: string;
  kind?: string | null;
  exists?: boolean;
  retained?: boolean;
  scenario?: OpenClawSandboxScenario | null;
}

export interface OpenClawSandboxIdentityTransition {
  scenario: OpenClawSandboxScenario;
  previousAgentId?: string | null;
  currentAgentId?: string | null;
  reused?: boolean | null;
  note?: string | null;
}

export interface OpenClawSandboxRunStep {
  scenario: OpenClawSandboxScenario;
  name: string;
  status: OpenClawSandboxRunState;
  ok?: boolean;
  details?: string;
  startedAt: string | null;
  finishedAt?: string | null;
}

export type OpenClawSandboxRunRecord = ReturnType<typeof presentOpenClawSandboxRun>;
export type OpenClawSandboxControlState = ReturnType<typeof presentOpenClawSandboxSnapshot>;

export function getOpenClawSandboxCapabilities(): OpenClawSandboxCapabilities {
  const capabilities = getBaseCapabilities();
  return {
    isLocalEnvironment: capabilities.is_local_environment,
    canRunDestructive: capabilities.can_run_destructive,
    canViewArtifacts: capabilities.can_view_artifacts,
    strictTurnAvailable: capabilities.strict_turn_available,
    canRunScenarios: capabilities.can_run_destructive,
    disabledReason: capabilities.reason,
  };
}

export async function readOpenClawSandboxControlState(): Promise<OpenClawSandboxControlState> {
  return presentOpenClawSandboxSnapshot(await readOpenClawSandboxSnapshot());
}

export async function readOpenClawSandboxRun(runId: string): Promise<OpenClawSandboxRunRecord | null> {
  const run = await readOpenClawSandboxRunDetail(runId);
  return run ? presentOpenClawSandboxRun(run) : null;
}

export async function launchOpenClawSandboxRun(input: OpenClawSandboxRunStartInput) {
  const run = await startOpenClawSandboxRun(input);
  return {
    runId: run.id,
    run: presentOpenClawSandboxRun(run),
    state: await readOpenClawSandboxControlState(),
  };
}
