import assert from "node:assert/strict";
import test from "node:test";
import {
  presentOpenClawSandboxRun,
  presentOpenClawSandboxSnapshot,
} from "./sandbox-presenter";
import type { OpenClawSandboxSnapshot } from "./sandbox-types";

function buildSnapshot(): OpenClawSandboxSnapshot {
  return {
    status: "running",
    capabilities: {
      can_run_destructive: true,
      can_view_artifacts: true,
      is_local_environment: true,
      strict_turn_available: false,
      execution_mode: "local",
      reason: null,
    },
    defaults: {
      baseUrl: "http://127.0.0.1:3000",
      serverMode: "auto",
      cliVersion: "latest",
      keepArtifacts: "fail",
      requireTurnSuccess: false,
      scenarios: [
        "fresh_install",
        "wipe_and_reinstall_same_fingerprint",
        "strict_provider_turn",
      ],
    },
    cliCache: {
      cacheRoot: "/tmp/cache",
      availableVersions: ["2026.03.09", "latest"],
      activeVersion: "latest",
      binaryPath: "/tmp/cache/latest/node_modules/.bin/openclaw",
    },
    latestRun: {
      id: "run-123",
      status: "running",
      startedAt: "2026-03-09T12:00:00.000Z",
      finishedAt: null,
      baseUrl: "http://127.0.0.1:3000",
      serverMode: "auto",
      cliVersion: "latest",
      keepArtifacts: "fail",
      requireTurnSuccess: false,
      scenarios: ["fresh_install", "wipe_and_reinstall_same_fingerprint"],
      summary: "Run in progress.",
      warnings: ["provider auth unavailable"],
      steps: [
        {
          scenario: "fresh_install",
          name: "download install.sh",
          ok: true,
          status: "pass",
          details: "200",
          startedAt: "2026-03-09T12:00:01.000Z",
          finishedAt: "2026-03-09T12:00:02.000Z",
          durationMs: 1000,
        },
      ],
      scenariosDetail: [
        {
          scenario: "fresh_install",
          status: "passed",
          summary: "Fresh install connected cleanly.",
          agentId: "agent-1",
          warnings: [],
          steps: [],
          artifacts: [],
        },
        {
          scenario: "wipe_and_reinstall_same_fingerprint",
          status: "passed",
          summary: "Same fingerprint reused the remote agent identity agent-1.",
          previousAgentId: "agent-1",
          agentId: "agent-1",
          reusedIdentity: true,
          warnings: [],
          steps: [],
          artifacts: [],
        },
      ],
      retainedArtifacts: [
        {
          key: "installer",
          label: "Downloaded installer",
          path: "/tmp/run-123/install.sh",
          kind: "installer",
          scenario: "fresh_install",
          retained: true,
          exists: true,
          sizeBytes: 1024,
        },
      ],
    },
    recentRuns: [],
    retainedArtifacts: [],
  };
}

test("presentOpenClawSandboxRun normalizes step and identity data for mission control", () => {
  const snapshot = buildSnapshot();
  const presented = presentOpenClawSandboxRun(snapshot.latestRun!);

  assert.equal(presented.runId, "run-123");
  assert.equal(presented.status, "running");
  assert.equal(presented.steps[0]?.status, "passed");
  assert.equal(presented.artifacts[0]?.kind, "installer");
  assert.equal(presented.identityTransitions[0]?.currentAgentId, "agent-1");
});

test("presentOpenClawSandboxSnapshot exposes mission-control friendly capability and scenario metadata", () => {
  const snapshot = buildSnapshot();
  snapshot.recentRuns = [snapshot.latestRun!];
  const presented = presentOpenClawSandboxSnapshot(snapshot);

  assert.equal(presented.capabilities.isLocalEnvironment, true);
  assert.equal(presented.capabilities.canRunDestructive, true);
  assert.equal(presented.cache.root, "/tmp/cache");
  assert.equal(presented.currentRun?.runId, "run-123");
  assert.equal(
    presented.scenarios.find((scenario) => scenario.id === "wipe_and_reinstall_same_fingerprint")
      ?.destructive,
    true,
  );
  assert.equal(
    presented.scenarios.find((scenario) => scenario.id === "strict_provider_turn")
      ?.providerBound,
    true,
  );
});
