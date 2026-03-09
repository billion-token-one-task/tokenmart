import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { GET, POST } from "./route";
import { writeOpenClawSandboxRun } from "@/lib/openclaw/sandbox-state";
import type { OpenClawSandboxRunRecord } from "@/lib/openclaw/sandbox-types";

async function withSandboxEnv(fn: () => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "tokenmart-sandbox-runs-route-"));
  const previous = {
    OPENCLAW_SANDBOX_ROOT: process.env.OPENCLAW_SANDBOX_ROOT,
    OPENCLAW_SANDBOX_RUNS_ROOT: process.env.OPENCLAW_SANDBOX_RUNS_ROOT,
    OPENCLAW_SANDBOX_CACHE_ROOT: process.env.OPENCLAW_SANDBOX_CACHE_ROOT,
    OPENCLAW_SANDBOX_FORCE_LOCAL: process.env.OPENCLAW_SANDBOX_FORCE_LOCAL,
    OPENCLAW_SANDBOX_FORCE_READ_ONLY: process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY,
    OPENCLAW_TEST_BASE_URL: process.env.OPENCLAW_TEST_BASE_URL,
  };

  process.env.OPENCLAW_SANDBOX_ROOT = root;
  process.env.OPENCLAW_SANDBOX_RUNS_ROOT = path.join(root, "runs");
  process.env.OPENCLAW_SANDBOX_CACHE_ROOT = path.join(root, "cache");
  process.env.OPENCLAW_TEST_BASE_URL = "http://127.0.0.1:4555";

  try {
    await mkdir(process.env.OPENCLAW_SANDBOX_RUNS_ROOT, { recursive: true });
    await mkdir(path.join(process.env.OPENCLAW_SANDBOX_CACHE_ROOT, "latest"), { recursive: true });
    await fn();
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
    id: "oclw-runs-route-sample",
    status: "running",
    startedAt: "2026-03-09T12:00:00.000Z",
    finishedAt: null,
    baseUrl: "http://127.0.0.1:4555",
    serverMode: "spawn-dev",
    cliVersion: "latest",
    keepArtifacts: "fail",
    requireTurnSuccess: false,
    scenarios: ["fresh_install"],
    summary: "Route fixture run.",
    warnings: [],
    steps: [],
    scenariosDetail: [],
    retainedArtifacts: [],
  };
}

test("sandbox runs route GET returns the current and latest run rail", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";
    await writeOpenClawSandboxRun(sampleRun());

    const response = await GET();
    assert.equal(response.status, 200);
    const json = (await response.json()) as {
      currentRun: { runId: string } | null;
      latestRun: { runId: string } | null;
      runs: Array<{ runId: string }>;
    };
    assert.equal(json.currentRun?.runId, "oclw-runs-route-sample");
    assert.equal(json.latestRun?.runId, "oclw-runs-route-sample");
    assert.equal(json.runs[0]?.runId, "oclw-runs-route-sample");
  });
});

test("sandbox runs route POST rejects empty scenario lists before launch", async () => {
  const response = await POST(
    new Request("http://localhost/api/v3/openclaw/sandbox/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarios: [] }),
    }),
  );

  assert.equal(response.status, 400);
  const json = (await response.json()) as { error: { message: string } };
  assert.match(json.error.message, /Select at least one/i);
});

test("sandbox runs route POST respects read-only gating", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY = "true";
    delete process.env.OPENCLAW_SANDBOX_FORCE_LOCAL;

    const response = await POST(
      new Request("http://localhost/api/v3/openclaw/sandbox/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: ["fresh_install"] }),
      }),
    );

    assert.equal(response.status, 403);
    const json = (await response.json()) as { error: { message: string } };
    assert.match(json.error.message, /disabled|read-only/i);
  });
});
