import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { PassThrough } from "node:stream";
import { NextRequest } from "next/server";
import { GET as getSandbox, POST as postSandbox } from "./route";
import { GET as getSandboxRun } from "./runs/[runId]/route";
import { setOpenClawSandboxSpawnerForTests } from "@/lib/openclaw/sandbox";
import { writeOpenClawSandboxRun } from "@/lib/openclaw/sandbox-state";
import type { OpenClawSandboxRunRecord } from "@/lib/openclaw/sandbox-types";

async function withSandboxEnv<T>(
  fn: (paths: { root: string; runsRoot: string; cacheRoot: string }) => Promise<T>,
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "tokenmart-openclaw-sandbox-route-"));
  const runsRoot = path.join(root, "runs");
  const cacheRoot = path.join(root, "cache");
  const previous = {
    OPENCLAW_SANDBOX_ROOT: process.env.OPENCLAW_SANDBOX_ROOT,
    OPENCLAW_SANDBOX_RUNS_ROOT: process.env.OPENCLAW_SANDBOX_RUNS_ROOT,
    OPENCLAW_SANDBOX_CACHE_ROOT: process.env.OPENCLAW_SANDBOX_CACHE_ROOT,
    OPENCLAW_SANDBOX_FORCE_LOCAL: process.env.OPENCLAW_SANDBOX_FORCE_LOCAL,
    OPENCLAW_SANDBOX_FORCE_READ_ONLY: process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY,
    OPENCLAW_TEST_BASE_URL: process.env.OPENCLAW_TEST_BASE_URL,
    OPENCLAW_TEST_CLI_VERSION: process.env.OPENCLAW_TEST_CLI_VERSION,
  };

  process.env.OPENCLAW_SANDBOX_ROOT = root;
  process.env.OPENCLAW_SANDBOX_RUNS_ROOT = runsRoot;
  process.env.OPENCLAW_SANDBOX_CACHE_ROOT = cacheRoot;
  process.env.OPENCLAW_TEST_BASE_URL = "http://127.0.0.1:4555";
  process.env.OPENCLAW_TEST_CLI_VERSION = "2026.3.9";

  try {
    await mkdir(runsRoot, { recursive: true });
    await mkdir(path.join(cacheRoot, "2026.3.9"), { recursive: true });
    return await fn({ root, runsRoot, cacheRoot });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await rm(root, { recursive: true, force: true });
  }
}

function sampleRunRecord(): OpenClawSandboxRunRecord {
  return {
    id: "oclw-route-sample",
    status: "passed",
    startedAt: "2026-03-09T12:00:00.000Z",
    finishedAt: "2026-03-09T12:01:00.000Z",
    baseUrl: "http://127.0.0.1:4555",
    serverMode: "spawn-dev",
    cliVersion: "2026.3.9",
    keepArtifacts: "fail",
    requireTurnSuccess: false,
    scenarios: ["fresh_install"],
    summary: "Snapshot fixture run.",
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
    ],
    retainedArtifacts: [],
  };
}

test("GET /api/v3/openclaw/sandbox returns the preferred single-snapshot payload", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";
    await writeOpenClawSandboxRun(sampleRunRecord());

    const response = await getSandbox(new NextRequest("http://localhost/api/v3/openclaw/sandbox"));
    const data = (await response.json()) as {
      status: string;
      capabilities: { can_run_destructive: boolean };
      defaults: { cliVersion: string };
      cliCache: { activeVersion: string | null };
      latestRun: { id: string } | null;
      recentRuns: Array<{ id: string }>;
      retainedArtifacts: Array<unknown>;
    };

    assert.equal(response.status, 200);
    assert.equal(data.status, "passed");
    assert.equal(data.capabilities.can_run_destructive, true);
    assert.equal(data.defaults.cliVersion, "2026.3.9");
    assert.equal(data.cliCache.activeVersion, "2026.3.9");
    assert.equal(data.latestRun?.id, "oclw-route-sample");
    assert.equal(data.recentRuns.length, 1);
    assert.equal(Array.isArray(data.retainedArtifacts), true);
  });
});

test("POST /api/v3/openclaw/sandbox refuses destructive runs in read-only mode", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_READ_ONLY = "true";
    delete process.env.OPENCLAW_SANDBOX_FORCE_LOCAL;

    const response = await postSandbox(
      new NextRequest("http://localhost/api/v3/openclaw/sandbox", {
        method: "POST",
        body: JSON.stringify({
          scenarios: ["fresh_install"],
          serverMode: "reuse",
          cliVersion: "latest",
          keepArtifacts: "fail",
          requireTurnSuccess: false,
        }),
      }),
    );
    const data = (await response.json()) as { error?: { message?: string } };

    assert.equal(response.status, 403);
    assert.match(data.error?.message ?? "", /disabled/i);
  });
});

test("POST /api/v3/openclaw/sandbox returns a queued raw run record and location header", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";

    setOpenClawSandboxSpawnerForTests(() => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
        unref(): void;
      };
      child.stdout = stdout;
      child.stderr = stderr;
      child.unref = () => {};
      queueMicrotask(() => {
        stdout.end("queued\n");
        stderr.end();
        child.emit("close", 0);
      });
      return child;
    });

    try {
      const response = await postSandbox(
        new NextRequest("http://localhost/api/v3/openclaw/sandbox", {
          method: "POST",
          body: JSON.stringify({
            scenarios: ["fresh_install", "gateway_wake"],
            serverMode: "reuse",
            cliVersion: "2026.3.9",
            keepArtifacts: "always",
            requireTurnSuccess: true,
          }),
        }),
      );
      const data = (await response.json()) as {
        id: string;
        status: string;
        scenarios: string[];
        serverMode: string;
        cliVersion: string;
        keepArtifacts: string;
        requireTurnSuccess: boolean;
      };

      assert.equal(response.status, 202);
      assert.equal(data.status, "queued");
      assert.equal(data.serverMode, "reuse");
      assert.equal(data.cliVersion, "2026.3.9");
      assert.equal(data.keepArtifacts, "always");
      assert.equal(data.requireTurnSuccess, true);
      assert.deepEqual(data.scenarios, ["fresh_install", "gateway_wake"]);
      assert.equal(response.headers.get("location"), `/api/v3/openclaw/sandbox/runs/${data.id}`);
    } finally {
      setOpenClawSandboxSpawnerForTests(null);
    }
  });
});

test("POST /api/v3/openclaw/sandbox validates scenario input before launch", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";

    const response = await postSandbox(
      new NextRequest("http://localhost/api/v3/openclaw/sandbox", {
        method: "POST",
        body: JSON.stringify({
          scenarios: ["definitely_not_real"],
        }),
      }),
    );
    const data = (await response.json()) as { error?: { message?: string } };

    assert.equal(response.status, 400);
    assert.match(data.error?.message ?? "", /Unsupported OpenClaw scenario/i);
  });
});

test("GET /api/v3/openclaw/sandbox/runs/[runId] returns detailed run ledgers", async () => {
  await withSandboxEnv(async () => {
    process.env.OPENCLAW_SANDBOX_FORCE_LOCAL = "true";
    await writeOpenClawSandboxRun(sampleRunRecord());

    const response = await getSandboxRun(
      new NextRequest("http://localhost/api/v3/openclaw/sandbox/runs/oclw-route-sample"),
      { params: Promise.resolve({ runId: "oclw-route-sample" }) },
    );
    const data = (await response.json()) as {
      id: string;
      status: string;
      steps: Array<{ name: string }>;
      scenarios: string[];
    };

    assert.equal(response.status, 200);
    assert.equal(data.id, "oclw-route-sample");
    assert.equal(data.status, "passed");
    assert.equal(data.steps[0]?.name, "bootstrap connected tokenmart");
    assert.equal(data.scenarios[0], "fresh_install");
  });
});
