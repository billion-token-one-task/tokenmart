import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
  getOpenClawSandboxCapabilities,
  readOpenClawSandboxSnapshot,
  setOpenClawSandboxSpawnerForTests,
  startOpenClawSandboxRun,
} from "./sandbox";
import { writeOpenClawSandboxRun } from "./sandbox-state";
import type { OpenClawSandboxRunRecord } from "./sandbox-types";

function rememberEnv(keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test("getOpenClawSandboxCapabilities falls back to read-only outside local mode", () => {
  const env = rememberEnv([
    "OPENCLAW_SANDBOX_FORCE_READ_ONLY",
    "OPENCLAW_SANDBOX_FORCE_LOCAL",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
  ]);

  try {
    Object.assign(process.env, {
      OPENCLAW_SANDBOX_FORCE_READ_ONLY: "true",
      OPENCLAW_SANDBOX_FORCE_LOCAL: "false",
      NEXT_PUBLIC_APP_URL: "https://www.tokenmart.net",
      NODE_ENV: "production",
    });

    const capabilities = getOpenClawSandboxCapabilities();
    assert.equal(capabilities.can_run_destructive, false);
    assert.equal(capabilities.execution_mode, "read-only");
    assert.match(
      capabilities.reason ?? "",
      /read-only|disabled/i,
    );
  } finally {
    restoreEnv(env);
  }
});

test("readOpenClawSandboxSnapshot loads persisted runs from sandbox state roots", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-"));
  const env = rememberEnv([
    "OPENCLAW_SANDBOX_ROOT",
    "OPENCLAW_SANDBOX_RUNS_ROOT",
    "OPENCLAW_SANDBOX_CACHE_ROOT",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
  ]);

  try {
    Object.assign(process.env, {
      OPENCLAW_SANDBOX_ROOT: tempRoot,
      OPENCLAW_SANDBOX_RUNS_ROOT: path.join(tempRoot, "runs"),
      OPENCLAW_SANDBOX_CACHE_ROOT: path.join(tempRoot, "cache"),
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      NODE_ENV: "development",
    });

    const run: OpenClawSandboxRunRecord = {
      id: "run-seeded",
      status: "passed",
      startedAt: "2026-03-09T12:00:00.000Z",
      finishedAt: "2026-03-09T12:01:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      serverMode: "auto",
      cliVersion: "latest",
      keepArtifacts: "fail",
      requireTurnSuccess: false,
      scenarios: ["fresh_install"],
      summary: "Seeded snapshot run",
      warnings: [],
      steps: [],
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

    await writeOpenClawSandboxRun(run);

    const snapshot = await readOpenClawSandboxSnapshot();
    assert.equal(snapshot.latestRun?.id, "run-seeded");
    assert.equal(snapshot.recentRuns[0]?.summary, "Seeded snapshot run");
    assert.equal(snapshot.capabilities.can_run_destructive, true);
  } finally {
    restoreEnv(env);
  }
});

test("startOpenClawSandboxRun refuses execution when the sandbox is read-only", async () => {
  const env = rememberEnv([
    "OPENCLAW_SANDBOX_FORCE_READ_ONLY",
    "OPENCLAW_SANDBOX_FORCE_LOCAL",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
  ]);

  try {
    Object.assign(process.env, {
      OPENCLAW_SANDBOX_FORCE_READ_ONLY: "true",
      OPENCLAW_SANDBOX_FORCE_LOCAL: "false",
      NEXT_PUBLIC_APP_URL: "https://www.tokenmart.net",
      NODE_ENV: "production",
    });

    await assert.rejects(
      () =>
        startOpenClawSandboxRun({
          scenarios: ["fresh_install"],
        }),
      /disabled|read-only/i,
    );
  } finally {
    restoreEnv(env);
  }
});

test("startOpenClawSandboxRun persists and returns a queued raw run record", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-run-"));
  const env = rememberEnv([
    "OPENCLAW_SANDBOX_ROOT",
    "OPENCLAW_SANDBOX_RUNS_ROOT",
    "OPENCLAW_SANDBOX_CACHE_ROOT",
    "OPENCLAW_SANDBOX_FORCE_LOCAL",
    "OPENCLAW_SANDBOX_FORCE_READ_ONLY",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
    "OPENCLAW_TEST_BASE_URL",
    "OPENCLAW_TEST_CLI_VERSION",
  ]);

  const spawnCalls: Array<{ command: string; args: string[]; envRunId?: string }> = [];

  try {
    Object.assign(process.env, {
      OPENCLAW_SANDBOX_ROOT: tempRoot,
      OPENCLAW_SANDBOX_RUNS_ROOT: path.join(tempRoot, "runs"),
      OPENCLAW_SANDBOX_CACHE_ROOT: path.join(tempRoot, "cache"),
      OPENCLAW_SANDBOX_FORCE_LOCAL: "true",
      OPENCLAW_SANDBOX_FORCE_READ_ONLY: "false",
      OPENCLAW_TEST_BASE_URL: "http://127.0.0.1:3000",
      OPENCLAW_TEST_CLI_VERSION: "2026.3.9",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      NODE_ENV: "development",
    });

    setOpenClawSandboxSpawnerForTests((command, args, options) => {
      spawnCalls.push({
        command,
        args,
        envRunId: options?.env?.OPENCLAW_TEST_RUN_ID,
      });
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

    const run = await startOpenClawSandboxRun({
      scenarios: ["fresh_install", "gateway_wake"],
      serverMode: "reuse",
      keepArtifacts: "always",
      requireTurnSuccess: true,
      cliVersion: "2026.3.9",
    });

    assert.equal(run.status, "queued");
    assert.equal(run.serverMode, "reuse");
    assert.equal(run.keepArtifacts, "always");
    assert.equal(run.requireTurnSuccess, true);
    assert.deepEqual(run.scenarios, ["fresh_install", "gateway_wake"]);
    assert.match(run.retainedArtifacts[0]?.path ?? "", /\.log$/);
    assert.equal(spawnCalls.length, 1);
    assert.equal(spawnCalls[0]?.command, "npx");
    assert.deepEqual(spawnCalls[0]?.args, [
      "tsx",
      "scripts/openclaw/run-local-suite.ts",
      "--scenario",
      "fresh_install",
      "--scenario",
      "gateway_wake",
    ]);
    assert.equal(spawnCalls[0]?.envRunId, run.id);
  } finally {
    setOpenClawSandboxSpawnerForTests(null);
    restoreEnv(env);
  }
});
