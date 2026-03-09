import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readOpenClawSandboxControlState } from "./sandbox-control";
import { writeOpenClawSandboxRun } from "./sandbox-state";
import type { OpenClawSandboxRunRecord } from "./sandbox-types";

async function withSandboxEnv(fn: (cwd: string) => Promise<void>) {
  const cwd = await mkdtemp(path.join(tmpdir(), "tokenmart-sandbox-control-"));
  const previous = {
    OPENCLAW_SANDBOX_ROOT: process.env.OPENCLAW_SANDBOX_ROOT,
    OPENCLAW_SANDBOX_RUNS_ROOT: process.env.OPENCLAW_SANDBOX_RUNS_ROOT,
    OPENCLAW_SANDBOX_CACHE_ROOT: process.env.OPENCLAW_SANDBOX_CACHE_ROOT,
    OPENCLAW_SANDBOX_FORCE_LOCAL: process.env.OPENCLAW_SANDBOX_FORCE_LOCAL,
    OPENCLAW_SANDBOX_FORCE_READ_ONLY: process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY,
    OPENCLAW_TEST_BASE_URL: process.env.OPENCLAW_TEST_BASE_URL,
    OPENCLAW_TEST_CLI_VERSION: process.env.OPENCLAW_TEST_CLI_VERSION,
  };
  process.env.OPENCLAW_SANDBOX_ROOT = cwd;
  process.env.OPENCLAW_SANDBOX_RUNS_ROOT = path.join(cwd, "runs");
  process.env.OPENCLAW_SANDBOX_CACHE_ROOT = path.join(cwd, "cache");
  process.env.OPENCLAW_TEST_BASE_URL = "http://127.0.0.1:4555";
  process.env.OPENCLAW_TEST_CLI_VERSION = "2026.3.9";

  try {
    await mkdir(process.env.OPENCLAW_SANDBOX_RUNS_ROOT, { recursive: true });
    await mkdir(path.join(process.env.OPENCLAW_SANDBOX_CACHE_ROOT, "2026.3.9"), { recursive: true });
    await fn(cwd);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function sampleRun(): OpenClawSandboxRunRecord {
  return {
    id: "oclw-control-sample",
    status: "passed",
    startedAt: "2026-03-09T12:00:00.000Z",
    finishedAt: "2026-03-09T12:01:00.000Z",
    baseUrl: "http://127.0.0.1:4555",
    serverMode: "spawn-dev",
    cliVersion: "2026.3.9",
    keepArtifacts: "fail",
    requireTurnSuccess: false,
    scenarios: ["fresh_install", "wipe_and_reinstall_same_fingerprint"],
    summary: "Presenter adapter fixture.",
    warnings: [],
    steps: [
      {
        scenario: "fresh_install",
        name: "bootstrap connected tokenmart",
        ok: true,
        status: "pass",
        details: "healthy",
        startedAt: "2026-03-09T12:00:00.000Z",
        finishedAt: "2026-03-09T12:00:10.000Z",
        durationMs: 10000,
      },
    ],
    scenariosDetail: [
      {
        scenario: "fresh_install",
        status: "passed",
        summary: "Fresh install passed.",
        warnings: [],
        steps: [],
        artifacts: [],
      },
      {
        scenario: "wipe_and_reinstall_same_fingerprint",
        status: "passed",
        summary: "The destructive rerun reused the previous remote identity because the workspace fingerprint remained stable.",
        previousAgentId: "agent-old",
        agentId: "agent-old",
        reusedIdentity: true,
        warnings: [],
        steps: [],
        artifacts: [],
      },
    ],
    retainedArtifacts: [
      {
        key: "identity-file",
        label: "Identity file",
        path: "/tmp/openclaw-suite/identity.json",
        kind: "identity",
        retained: true,
      },
    ],
  };
}

test("sandbox-control presents the normalized mission-control state", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";
    await writeOpenClawSandboxRun(sampleRun());

    const state = await readOpenClawSandboxControlState();
    assert.equal(state.capabilities.canRunDestructive, true);
    assert.equal(state.cache.selectedVersion, "2026.3.9");
    assert.equal(state.latestRun?.runId, "oclw-control-sample");
    assert.equal(state.latestRun?.selectedScenarios[1], "wipe_and_reinstall_same_fingerprint");
    assert.equal(state.latestRun?.identityTransitions[0]?.reused, true);
  });
});
