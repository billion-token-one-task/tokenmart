import type {
  OpenClawSandboxRunRecord,
  OpenClawSandboxScenario,
  OpenClawSandboxSnapshot,
  OpenClawSandboxStatus,
} from "./sandbox-types";

type MissionRunState = "queued" | "running" | "passed" | "failed" | "skipped";

const SCENARIO_METADATA: Record<
  OpenClawSandboxScenario,
  { label: string; code: string; description: string; destructive: boolean; providerBound: boolean }
> = {
  fresh_install: {
    label: "Fresh Install",
    code: "FSH-01",
    description:
      "Provision a clean local OpenClaw home, download the live installer, and verify the first heartbeat plus runtime attach.",
    destructive: false,
    providerBound: false,
  },
  gateway_wake: {
    label: "Gateway Wake",
    code: "GWK-02",
    description:
      "Start the gateway, probe health, emit a wake event, and inspect whether the heartbeat lane responds.",
    destructive: false,
    providerBound: false,
  },
  wipe_and_reinstall_same_fingerprint: {
    label: "Wipe / Same Fingerprint",
    code: "RPL-03",
    description:
      "Destroy local runtime state and verify the same workspace fingerprint reuses the existing remote agent identity.",
    destructive: true,
    providerBound: false,
  },
  wipe_and_reinstall_new_fingerprint: {
    label: "Wipe / New Fingerprint",
    code: "RPL-04",
    description:
      "Destroy local runtime state and move to a different workspace so the reinstall must create a distinct remote identity.",
    destructive: true,
    providerBound: false,
  },
  strict_provider_turn: {
    label: "Strict Provider Turn",
    code: "STR-05",
    description:
      "Require a successful provider-backed model turn rather than only verifying heartbeat and wake attempts.",
    destructive: false,
    providerBound: true,
  },
};

function mapStatus(status: OpenClawSandboxStatus): MissionRunState {
  if (status === "queued") return "queued";
  if (status === "running") return "running";
  if (status === "passed") return "passed";
  if (status === "failed" || status === "partial") return "failed";
  return "skipped";
}

export function presentOpenClawSandboxRun(run: OpenClawSandboxRunRecord) {
  return {
    runId: run.id,
    status: mapStatus(run.status),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt ?? null,
    selectedScenarios: run.scenarios,
    serverMode: run.serverMode,
    cliVersion: run.cliVersion,
    keepArtifacts: run.keepArtifacts,
    requireTurnSuccess: run.requireTurnSuccess,
    baseUrl: run.baseUrl,
    summary: run.summary ?? null,
    warnings: run.warnings ?? [],
    steps: (run.steps ?? []).map((step) => ({
      scenario: step.scenario,
      name: step.name,
      ok: step.ok,
      status: step.status === "pass" ? "passed" : "failed",
      details: step.details,
      startedAt: step.startedAt ?? null,
      finishedAt: step.finishedAt ?? null,
    })),
    artifacts: (run.retainedArtifacts ?? []).map((artifact) => ({
      label: artifact.label,
      path: artifact.path,
      kind: artifact.kind,
      scenario: artifact.scenario ?? null,
      retained: artifact.retained,
      exists: artifact.exists,
    })),
    identityTransitions: (run.scenariosDetail ?? [])
      .filter(
        (detail) =>
          detail.previousAgentId ||
          detail.agentId ||
          detail.reusedIdentity !== undefined,
      )
      .map((detail) => ({
        scenario: detail.scenario,
        previousAgentId: detail.previousAgentId ?? null,
        currentAgentId: detail.agentId ?? null,
        reused: detail.reusedIdentity ?? null,
        note: detail.summary ?? null,
      })),
  };
}

export function presentOpenClawSandboxSnapshot(snapshot: OpenClawSandboxSnapshot) {
  const currentSource =
    snapshot.recentRuns.find((run) => run.status === "queued" || run.status === "running") ?? null;

  return {
    capabilities: {
      isLocalEnvironment: snapshot.capabilities.is_local_environment,
      canRunDestructive: snapshot.capabilities.can_run_destructive,
      canViewArtifacts: snapshot.capabilities.can_view_artifacts,
      strictTurnAvailable: snapshot.capabilities.strict_turn_available,
      canRunScenarios: snapshot.capabilities.can_run_destructive,
      disabledReason: snapshot.capabilities.reason,
    },
    defaults: {
      baseUrl: snapshot.defaults.baseUrl,
      cliVersion: snapshot.defaults.cliVersion,
      serverMode: snapshot.defaults.serverMode,
      keepArtifacts: snapshot.defaults.keepArtifacts,
      requireTurnSuccess: snapshot.defaults.requireTurnSuccess,
    },
    environment: {
      cwd: process.cwd(),
      baseUrl: snapshot.defaults.baseUrl,
      updatedAt: new Date().toISOString(),
    },
    cache: {
      root: snapshot.cliCache.cacheRoot,
      availableVersions: snapshot.cliCache.availableVersions,
      selectedVersion: snapshot.cliCache.activeVersion,
    },
    scenarios: (Object.keys(SCENARIO_METADATA) as OpenClawSandboxScenario[]).map((scenario) => ({
      id: scenario,
      ...SCENARIO_METADATA[scenario],
    })),
    latestRun: snapshot.latestRun ? presentOpenClawSandboxRun(snapshot.latestRun) : null,
    currentRun: currentSource ? presentOpenClawSandboxRun(currentSource) : null,
    runs: snapshot.recentRuns.map(presentOpenClawSandboxRun),
    warnings: [],
  };
}
