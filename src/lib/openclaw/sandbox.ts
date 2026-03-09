import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { loadOpenClawSuiteConfig, OPENCLAW_SCENARIOS } from "../../../scripts/openclaw/config";
import {
  collectRetainedArtifacts,
  deriveSnapshotStatus,
  getOpenClawSandboxCliCacheRoot,
  getOpenClawSandboxRunLogPath,
  listOpenClawSandboxRuns,
  readOpenClawSandboxRun,
  writeOpenClawSandboxRun,
} from "./sandbox-state";
import type {
  OpenClawSandboxCapabilities,
  OpenClawSandboxCliCache,
  OpenClawSandboxDefaults,
  OpenClawSandboxKeepArtifacts,
  OpenClawSandboxRunRecord,
  OpenClawSandboxRunStartInput,
  OpenClawSandboxScenario,
  OpenClawSandboxServerMode,
  OpenClawSandboxSnapshot,
} from "./sandbox-types";

function hasProviderCredentials() {
  return [
    process.env.OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].some((value) => Boolean(value?.trim()));
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}

export function getOpenClawSandboxCapabilities(): OpenClawSandboxCapabilities {
  const forceLocal = process.env.OPENCLAW_SANDBOX_FORCE_LOCAL === "true";
  const forceReadOnly = process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY === "true";
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let appUrlLooksLocal = false;

  if (configuredAppUrl) {
    try {
      appUrlLooksLocal = isLocalHostname(new URL(configuredAppUrl).hostname);
    } catch {
      appUrlLooksLocal = false;
    }
  } else {
    appUrlLooksLocal = process.env.NODE_ENV !== "production";
  }

  const isLocalEnvironment = !forceReadOnly && (forceLocal || appUrlLooksLocal || process.env.NODE_ENV !== "production");
  const canRunDestructive = isLocalEnvironment;

  return {
    can_run_destructive: canRunDestructive,
    can_view_artifacts: true,
    is_local_environment: isLocalEnvironment,
    strict_turn_available: hasProviderCredentials(),
    execution_mode: canRunDestructive ? "local" : "read-only",
    reason: canRunDestructive
      ? null
      : "OpenClaw destructive sandbox controls are disabled outside local/dev environments. This surface remains read-only here.",
  };
}

export function getOpenClawSandboxDefaults(): OpenClawSandboxDefaults {
  const config = loadOpenClawSuiteConfig([]);
  return {
    baseUrl: config.baseUrl,
    serverMode: config.serverMode,
    cliVersion: config.cliVersion,
    keepArtifacts: config.keepArtifacts,
    requireTurnSuccess: config.requireTurnSuccess,
    scenarios: config.scenarios,
  };
}

export async function getOpenClawSandboxCliCache(defaults: OpenClawSandboxDefaults): Promise<OpenClawSandboxCliCache> {
  const cacheRoot = getOpenClawSandboxCliCacheRoot();
  let availableVersions: string[] = [];

  try {
    const entries = await readdir(cacheRoot, { withFileTypes: true });
    availableVersions = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    availableVersions = [];
  }

  const binName = process.platform === "win32" ? "openclaw.cmd" : "openclaw";
  const activeVersion = availableVersions.includes(defaults.cliVersion)
    ? defaults.cliVersion
    : availableVersions.at(-1) ?? null;
  const binaryPath = activeVersion
    ? path.join(cacheRoot, activeVersion, "node_modules", ".bin", binName)
    : null;

  return {
    cacheRoot,
    availableVersions,
    activeVersion,
    binaryPath,
  };
}

export async function readOpenClawSandboxSnapshot(): Promise<OpenClawSandboxSnapshot> {
  const defaults = getOpenClawSandboxDefaults();
  const [recentRuns, cliCache] = await Promise.all([
    listOpenClawSandboxRuns(),
    getOpenClawSandboxCliCache(defaults),
  ]);
  const latestRun = recentRuns[0] ?? null;
  const retainedArtifacts = await collectRetainedArtifacts(recentRuns);

  const snapshot: OpenClawSandboxSnapshot = {
    status: "idle",
    capabilities: getOpenClawSandboxCapabilities(),
    defaults,
    cliCache,
    latestRun,
    recentRuns,
    retainedArtifacts,
  };

  snapshot.status = deriveSnapshotStatus(snapshot);
  return snapshot;
}

function parseScenarioList(input: OpenClawSandboxRunStartInput["scenarios"]): OpenClawSandboxScenario[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("At least one OpenClaw scenario is required");
  }

  const unique = [...new Set(input)];
  for (const scenario of unique) {
    if (!(OPENCLAW_SCENARIOS as string[]).includes(scenario)) {
      throw new Error(`Unsupported OpenClaw scenario: ${scenario}`);
    }
  }

  return unique;
}

function parseServerMode(value: unknown, fallback: OpenClawSandboxServerMode): OpenClawSandboxServerMode {
  return value === "auto" || value === "reuse" || value === "spawn-dev" || value === "spawn-start"
    ? value
    : fallback;
}

function parseKeepArtifacts(value: unknown, fallback: OpenClawSandboxKeepArtifacts): OpenClawSandboxKeepArtifacts {
  return value === "fail" || value === "always" || value === "never" ? value : fallback;
}

function normalizeRunConfig(input: OpenClawSandboxRunStartInput) {
  const defaults = getOpenClawSandboxDefaults();
  return {
    baseUrl: typeof input.baseUrl === "string" && input.baseUrl.trim() ? input.baseUrl.trim().replace(/\/$/, "") : defaults.baseUrl,
    serverMode: parseServerMode(input.serverMode, defaults.serverMode),
    cliVersion: typeof input.cliVersion === "string" && input.cliVersion.trim() ? input.cliVersion.trim() : defaults.cliVersion,
    keepArtifacts: parseKeepArtifacts(input.keepArtifacts, defaults.keepArtifacts),
    requireTurnSuccess:
      typeof input.requireTurnSuccess === "boolean" ? input.requireTurnSuccess : defaults.requireTurnSuccess,
    scenarios: parseScenarioList(input.scenarios),
  };
}

function buildQueuedRunRecord(input: ReturnType<typeof normalizeRunConfig>): OpenClawSandboxRunRecord {
  const runId = `oclw_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  return {
    id: runId,
    status: "queued",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    baseUrl: input.baseUrl,
    serverMode: input.serverMode,
    cliVersion: input.cliVersion,
    keepArtifacts: input.keepArtifacts,
    requireTurnSuccess: input.requireTurnSuccess,
    scenarios: input.scenarios,
    summary: "Run accepted by Mission Control and waiting for the local harness process to begin.",
    warnings: [],
    steps: [],
    scenariosDetail: input.scenarios.map((scenario) => ({
      scenario,
      status: "queued",
      summary: "Scenario is queued and waiting for the harness worker to start.",
      warnings: [],
      steps: [],
      artifacts: [],
    })),
    retainedArtifacts: [
      {
        key: "run-log",
        label: "Harness log",
        path: getOpenClawSandboxRunLogPath(runId),
        kind: "run-log",
        retained: true,
      },
    ],
  };
}

function buildHarnessArgs(run: OpenClawSandboxRunRecord) {
  return run.scenarios.flatMap((scenario) => ["--scenario", scenario]);
}

export async function readOpenClawSandboxRunDetail(runId: string) {
  return readOpenClawSandboxRun(runId);
}

export async function startOpenClawSandboxRun(input: OpenClawSandboxRunStartInput) {
  const capabilities = getOpenClawSandboxCapabilities();
  if (!capabilities.can_run_destructive) {
    throw new Error(capabilities.reason ?? "Sandbox execution is disabled in this environment");
  }

  const snapshot = await readOpenClawSandboxSnapshot();
  if (snapshot.latestRun?.status === "running" || snapshot.latestRun?.status === "queued") {
    throw new Error("A sandbox run is already in progress. Wait for it to finish before starting another.");
  }

  const normalized = normalizeRunConfig(input);
  const queuedRun = buildQueuedRunRecord(normalized);
  await writeOpenClawSandboxRun(queuedRun);

  const logStream = createWriteStream(getOpenClawSandboxRunLogPath(queuedRun.id), { flags: "a" });
  const child = spawn(
    "npx",
    ["tsx", "scripts/openclaw/run-local-suite.ts", ...buildHarnessArgs(queuedRun)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        OPENCLAW_TEST_RUN_ID: queuedRun.id,
        OPENCLAW_TEST_BASE_URL: queuedRun.baseUrl,
        OPENCLAW_TEST_SERVER_MODE: queuedRun.serverMode,
        OPENCLAW_TEST_CLI_VERSION: queuedRun.cliVersion,
        OPENCLAW_TEST_KEEP_ARTIFACTS: queuedRun.keepArtifacts,
        OPENCLAW_TEST_REQUIRE_TURN_SUCCESS: queuedRun.requireTurnSuccess ? "true" : "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );

  child.stdout.on("data", (chunk) => logStream.write(chunk));
  child.stderr.on("data", (chunk) => logStream.write(chunk));
  child.on("close", () => {
    logStream.end();
  });
  child.unref();

  return queuedRun;
}
