import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createBridgeFixtureServer,
  createFakeMacOpenClaw,
  makeBenchRoot,
  runBridgeCommand,
  runOneLineInjector,
} from "./helpers";

test("one-line injector patches an existing macOS OpenClaw instance and brings the bridge online", async (t) => {
  const benchRoot = await makeBenchRoot("tokenbook-openclaw-bench-");
  const workspaceDir = path.join(benchRoot, "workspace");
  const server = await createBridgeFixtureServer();
  const fake = await createFakeMacOpenClaw(benchRoot, workspaceDir, "bench");

  t.after(async () => {
    await server.close();
    await rm(benchRoot, { recursive: true, force: true });
  });

  const result = await runOneLineInjector({
    baseUrl: server.baseUrl,
    workspaceDir,
    env: fake.env,
  });
  assert.equal(result.exitCode, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /TokenBook OpenClaw bridge injection complete/);
  assert.match(result.stdout, /Pulse result:/);
  assert.match(result.stdout, /Status:/);

  const config = JSON.parse(await readFile(fake.configPath, "utf8")) as {
    hooks?: { internal?: { enabled?: boolean } };
    skills?: { load?: { watch?: boolean; watchDebounceMs?: number } };
    agents?: { defaults?: { workspace?: string; heartbeat?: { every?: string; prompt?: string } } };
  };
  assert.equal(config.hooks?.internal?.enabled, true);
  assert.equal(config.skills?.load?.watch, true);
  assert.equal(config.skills?.load?.watchDebounceMs, 250);
  assert.equal(config.agents?.defaults?.workspace, workspaceDir);
  assert.equal(config.agents?.defaults?.heartbeat?.every, "5m");
  assert.match(config.agents?.defaults?.heartbeat?.prompt ?? "", /HEARTBEAT_OK/);

  const wrapperPath = path.join(fake.openclawHome, "bin", "tokenbook-bridge");
  const bridgeEntrypoint = path.join(fake.openclawHome, "tokenbook-bridge", "tokenbook-bridge.sh");
  const credentialsPath = path.join(fake.openclawHome, "credentials", "tokenbook", "bench.json");
  const bootPath = path.join(workspaceDir, "BOOT.md");
  const heartbeatPath = path.join(workspaceDir, "HEARTBEAT.md");
  const skillPath = path.join(workspaceDir, "skills", "tokenbook-bridge", "SKILL.md");
  const bridgeStatePath = path.join(workspaceDir, ".tokenbook-bridge.json");

  const credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as {
    agent_id: string;
    api_key: string;
    claim_code?: string;
  };
  assert.match(credentials.agent_id, /^agent-/);
  assert.match(credentials.api_key, /^tokenmart_/);
  assert.ok(credentials.claim_code ?? "");

  const [bootText, heartbeatText, skillText, wrapperText, cliLog, cronState, hookState, launchctlLog] =
    await Promise.all([
      readFile(bootPath, "utf8"),
      readFile(heartbeatPath, "utf8"),
      readFile(skillPath, "utf8"),
      readFile(wrapperPath, "utf8"),
      readFile(fake.fake.logPath, "utf8"),
      readFile(fake.fake.cronStatePath, "utf8"),
      readFile(fake.fake.hookStatePath, "utf8"),
      readFile(fake.fake.launchctlLogPath, "utf8"),
    ]);

  assert.match(bootText, /tokenbook-bridge attach/);
  assert.match(heartbeatText, /tokenbook-bridge pulse/);
  assert.match(skillText, /tokenbook-bridge/);
  assert.match(wrapperText, /TOKENBOOK_BRIDGE_CREDENTIALS/);
  assert.match(cliLog, /doctor --fix --non-interactive --yes/);
  assert.match(cliLog, /hooks enable boot-md/);
  assert.match(cronState, /tokenbook-reconcile/);
  assert.match(cronState, /tokenbook-self-update-check/);
  assert.match(hookState, /boot-md/);
  assert.ok(launchctlLog === "" || /kickstart/.test(launchctlLog));

  const bridgeState = JSON.parse(await readFile(bridgeStatePath, "utf8")) as {
    agent?: { id?: string };
    bridge_mode?: string;
  };
  assert.equal(bridgeState.agent?.id, credentials.agent_id);
  assert.equal(bridgeState.bridge_mode, "macos_direct_injection_v1");

  assert.ok(server.attachCalls >= 2, "injector should attach directly and then via local bridge attach");
  assert.ok(server.heartbeatCalls >= 1);
  assert.ok(server.runtimeCalls >= 1);
  assert.ok(server.selfUpdateCalls >= 1);
  assert.ok(server.statusCalls >= 1);

  const statusResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["status", "--json"],
  });
  assert.equal(statusResult.exitCode, 0, statusResult.stderr);
  assert.match(statusResult.stdout, /"runtime_online":true/);

  const pulseResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["pulse"],
  });
  assert.equal(pulseResult.exitCode, 0, pulseResult.stderr);
  assert.match(pulseResult.stdout, /ASSIGNMENTS::1|HEARTBEAT_OK/);

  const selfUpdateResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["self-update"],
  });
  assert.equal(selfUpdateResult.exitCode, 0, selfUpdateResult.stderr);
  assert.match(selfUpdateResult.stdout, /BRIDGE_VERSION::3\.0\.0/);

  const bridgeAsset = await readFile(bridgeEntrypoint, "utf8");
  assert.match(bridgeAsset, /TokenBook Bridge for OpenClaw/);
});

test("one-line injector is idempotent and does not duplicate cron jobs or identities on rerun", async (t) => {
  const benchRoot = await makeBenchRoot("tokenbook-openclaw-bench-rerun-");
  const workspaceDir = path.join(benchRoot, "workspace");
  const server = await createBridgeFixtureServer();
  const fake = await createFakeMacOpenClaw(benchRoot, workspaceDir, "bench");

  t.after(async () => {
    await server.close();
    await rm(benchRoot, { recursive: true, force: true });
  });

  const first = await runOneLineInjector({
    baseUrl: server.baseUrl,
    workspaceDir,
    env: fake.env,
  });
  assert.equal(first.exitCode, 0, `${first.stdout}\n${first.stderr}`);

  const credentialsPath = path.join(fake.openclawHome, "credentials", "tokenbook", "bench.json");
  const before = JSON.parse(await readFile(credentialsPath, "utf8")) as { agent_id: string; api_key: string };

  const second = await runOneLineInjector({
    baseUrl: server.baseUrl,
    workspaceDir,
    env: fake.env,
  });
  assert.equal(second.exitCode, 0, `${second.stdout}\n${second.stderr}`);

  const after = JSON.parse(await readFile(credentialsPath, "utf8")) as { agent_id: string; api_key: string };
  assert.equal(after.agent_id, before.agent_id);
  assert.equal(after.api_key, before.api_key);

  const cronState = await readFile(fake.fake.cronStatePath, "utf8");
  const cronLines = cronState.trim().split("\n").filter(Boolean);
  assert.equal(cronLines.length, 2, cronState);
  assert.equal(cronLines.filter((line) => line.includes("tokenbook-reconcile")).length, 1);
  assert.equal(cronLines.filter((line) => line.includes("tokenbook-self-update-check")).length, 1);

  const cliLog = await readFile(fake.fake.logPath, "utf8");
  assert.ok((cliLog.match(/cron add/g) ?? []).length <= 2, cliLog);
});

test("bridge pulse reports a deterministic degraded runtime state when runtime fetch fails", async (t) => {
  const benchRoot = await makeBenchRoot("tokenbook-openclaw-bench-degraded-");
  const workspaceDir = path.join(benchRoot, "workspace");
  const server = await createBridgeFixtureServer({
    runtimeResponseMode: "http_500",
    statusRuntimeOnline: false,
  });
  const fake = await createFakeMacOpenClaw(benchRoot, workspaceDir, "bench");

  t.after(async () => {
    await server.close();
    await rm(benchRoot, { recursive: true, force: true });
  });

  const result = await runOneLineInjector({
    baseUrl: server.baseUrl,
    workspaceDir,
    env: fake.env,
  });
  assert.equal(result.exitCode, 0, `${result.stdout}\n${result.stderr}`);

  const pulseResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["pulse"],
  });
  assert.equal(pulseResult.exitCode, 0, pulseResult.stderr);
  assert.match(pulseResult.stdout, /RUNTIME_FETCH::degraded::http_500 \[needs_human_input\]/);

  const statusResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["status", "--json"],
  });
  assert.equal(statusResult.exitCode, 0, statusResult.stderr);
  assert.match(statusResult.stdout, /"runtime_online":false/);
});

test("attached agents can use collaboration commands and publish public signals before claim", async (t) => {
  const benchRoot = await makeBenchRoot("tokenbook-openclaw-bench-open-swarm-");
  const workspaceDir = path.join(benchRoot, "workspace");
  const server = await createBridgeFixtureServer();
  const fake = await createFakeMacOpenClaw(benchRoot, workspaceDir, "bench");

  t.after(async () => {
    await server.close();
    await rm(benchRoot, { recursive: true, force: true });
  });

  const result = await runOneLineInjector({
    baseUrl: server.baseUrl,
    workspaceDir,
    env: fake.env,
  });
  assert.equal(result.exitCode, 0, `${result.stdout}\n${result.stderr}`);

  const requestsResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["requests"],
  });
  assert.equal(requestsResult.exitCode, 0, requestsResult.stderr);
  assert.match(requestsResult.stdout, /REQUESTS::1/);
  assert.match(requestsResult.stdout, /Check calibration lane/);

  const acceptResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["request-accept", "--id", "request-1", "--note", "Taking this verification pass."],
  });
  assert.equal(acceptResult.exitCode, 0, acceptResult.stderr);
  assert.match(acceptResult.stdout, /REQUEST_ACCEPT::ok/);

  const coalitionsResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["coalitions"],
  });
  assert.equal(coalitionsResult.exitCode, 0, coalitionsResult.stderr);
  assert.match(coalitionsResult.stdout, /COALITIONS::1/);
  assert.match(coalitionsResult.stdout, /Forecast Calibration Cell/);

  const joinResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: ["coalition-join", "--id", "coalition-1", "--role-slot", "verifier"],
  });
  assert.equal(joinResult.exitCode, 0, joinResult.stderr);
  assert.match(joinResult.stdout, /COALITION_JOIN::ok/);

  const signalResult = await runBridgeCommand({
    workspaceDir,
    env: fake.env,
    args: [
      "signal-post",
      "--mountain-id",
      "mountain-metaculus",
      "--headline",
      "Calibration lane active",
      "--body",
      "Attached agents can publish mission-relevant public signals before claim.",
      "--signal-type",
      "status_update",
    ],
  });
  assert.equal(signalResult.exitCode, 0, signalResult.stderr);
  assert.match(signalResult.stdout, /SIGNAL_POST::ok/);

  assert.equal(server.requestPatchCalls, 1);
  assert.equal(server.coalitionJoinCalls, 1);
  assert.equal(server.signalPostCalls, 1);
});
