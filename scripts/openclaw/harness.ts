import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenClawKeepArtifacts, OpenClawScenario, OpenClawSuiteConfig } from "./config";

type Json = Record<string, unknown>;

interface StepResult {
  scenario: OpenClawScenario;
  name: string;
  ok: boolean;
  details?: string;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string;
  timedOut: boolean;
}

interface ManagedServer {
  baseUrl: string;
  child: ReturnType<typeof spawn> | null;
  mode: "reuse" | "spawn-dev" | "spawn-start";
}

interface ScenarioEnvironment {
  scenario: OpenClawScenario;
  tmpRoot: string;
  homeDir: string;
  openclawHome: string;
  configPath: string;
  workspaceDir: string;
  installPath: string;
  profile: string;
  childEnv: NodeJS.ProcessEnv;
  openclawBin: string;
  baseUrl: string;
}

interface IdentityPayload {
  agent_id: string;
  api_key: string;
}

class Reporter {
  readonly results: StepResult[] = [];

  constructor(private readonly logProgress: boolean) {}

  record(scenario: OpenClawScenario, name: string, ok: boolean, details?: string) {
    this.results.push({ scenario, name, ok, details });
    if (this.logProgress) {
      const prefix = `[${scenario}]`;
      console.log(`${prefix} [${ok ? "pass" : "fail"}] ${name}${details ? ` :: ${details}` : ""}`);
    }
  }

  printSummary() {
    console.log("\nOpenClaw live harness summary:");
    for (const result of this.results) {
      console.log(
        `- ${result.ok ? "PASS" : "FAIL"} :: ${result.scenario} :: ${result.name}${result.details ? ` :: ${result.details}` : ""}`,
      );
    }
  }

  failures() {
    return this.results.filter((result) => !result.ok);
  }
}

function buildPathEnv(binPath: string) {
  const binDir = path.dirname(binPath);
  return [binDir, process.env.PATH ?? ""].filter(Boolean).join(path.delimiter);
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function requestText(url: string, timeoutMs = 30_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

async function requestJson(
  reporter: Reporter,
  scenario: OpenClawScenario,
  name: string,
  url: string,
  init: RequestInit,
  expectedStatus = 200,
  timeoutMs = 30_000,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  const ok = response.status === expectedStatus;
  reporter.record(
    scenario,
    name,
    ok,
    `${response.status}${typeof data === "string" ? ` :: ${data.slice(0, 240)}` : ""}`,
  );
  if (!ok) {
    throw new Error(`${name} failed (${response.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function asObject(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected JSON object");
  }
  return value as Json;
}

async function runCommand(
  reporter: Reporter,
  scenario: OpenClawScenario,
  name: string,
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    allowFailure?: boolean;
    stdinText?: string;
    timeoutMs?: number;
  } = {},
): Promise<CommandResult> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  if (options.stdinText) {
    child.stdin.write(options.stdinText);
  }
  child.stdin.end();

  let timedOut = false;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, timeoutMs);

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });
  clearTimeout(timeout);

  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  const detail = `${timedOut ? `timed out after ${timeoutMs}ms\n` : ""}${output}`.trim();
  const ok = (exitCode === 0 && !timedOut) || Boolean(options.allowFailure);
  reporter.record(scenario, name, ok, detail.slice(0, 500));

  if ((exitCode !== 0 || timedOut) && !options.allowFailure) {
    throw new Error(`${name} failed (${timedOut ? "timeout" : exitCode}): ${detail}`);
  }

  return { exitCode, stdout, stderr, output, timedOut };
}

async function waitFor(
  reporter: Reporter,
  scenario: OpenClawScenario,
  name: string,
  check: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs = 1_000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) {
      reporter.record(scenario, name, true);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  reporter.record(scenario, name, false, `timed out after ${timeoutMs}ms`);
  throw new Error(`${name} timed out`);
}

function resolvePort() {
  return 19_000 + Math.floor(Math.random() * 1_000);
}

async function isInstallRouteHealthy(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/openclaw/install.sh`, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer(config: OpenClawSuiteConfig, reporter: Reporter): Promise<ManagedServer> {
  const healthy = await isInstallRouteHealthy(config.baseUrl);
  if (config.serverMode === "reuse") {
    if (!healthy) {
      throw new Error(`Expected an already running app at ${config.baseUrl}, but /openclaw/install.sh was unavailable`);
    }
    return { baseUrl: config.baseUrl, child: null, mode: "reuse" };
  }

  if (config.serverMode === "auto" && healthy) {
    reporter.record("fresh_install", "reuse existing app server", true, config.baseUrl);
    return { baseUrl: config.baseUrl, child: null, mode: "reuse" };
  }

  const port = 3_100 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}`;
  const spawnStart = config.serverMode === "spawn-start";

  if (spawnStart) {
    await runCommand(reporter, "fresh_install", "build managed app server", "npm", ["run", "build"], {
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 600_000,
    });
  }

  const args = spawnStart
    ? ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)]
    : ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];

  const child = spawn("npm", args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs: string[] = [];
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  await waitFor(
    reporter,
    "fresh_install",
    "managed app server ready",
    () => isInstallRouteHealthy(baseUrl),
    180_000,
    2_000,
  );

  reporter.record(
    "fresh_install",
    "managed app server mode",
    true,
    `${spawnStart ? "spawn-start" : "spawn-dev"} :: ${baseUrl}`,
  );

  return {
    baseUrl,
    child,
    mode: spawnStart ? "spawn-start" : "spawn-dev",
  };
}

async function stopServer(server: ManagedServer) {
  if (!server.child) return;
  server.child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

async function ensureOpenClawCli(config: OpenClawSuiteConfig, reporter: Reporter) {
  const cacheRoot = path.join(process.cwd(), ".cache", "openclaw-cli", sanitizeSegment(config.cliVersion));
  const binName = process.platform === "win32" ? "openclaw.cmd" : "openclaw";
  const binPath = path.join(cacheRoot, "node_modules", ".bin", binName);

  if (existsSync(binPath)) {
    reporter.record("fresh_install", "reuse cached openclaw cli", true, binPath);
    return binPath;
  }

  await mkdir(cacheRoot, { recursive: true });
  await runCommand(
    reporter,
    "fresh_install",
    "download openclaw cli into cache",
    "npm",
    ["install", "--no-save", "--prefix", cacheRoot, `openclaw@${config.cliVersion}`],
    {
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 600_000,
    },
  );

  if (!existsSync(binPath)) {
    throw new Error(`OpenClaw CLI cache did not produce a binary at ${binPath}`);
  }

  await runCommand(reporter, "fresh_install", "verify cached openclaw cli", binPath, ["--version"], {
    cwd: process.cwd(),
    env: { ...process.env, PATH: buildPathEnv(binPath) },
  });

  return binPath;
}

async function createScenarioEnvironment(
  scenario: OpenClawScenario,
  openclawBin: string,
  baseUrl: string,
): Promise<ScenarioEnvironment> {
  const tmpRoot = path.join(process.cwd(), ".tmp", "openclaw-suite", scenario);
  await rm(tmpRoot, { recursive: true, force: true });
  const homeDir = path.join(tmpRoot, "home");
  const profile = `tm-${sanitizeSegment(scenario)}`;
  const openclawHome = path.join(homeDir, `.openclaw-${profile}`);
  const configPath = path.join(openclawHome, "openclaw.json");
  const workspaceDir = path.join(tmpRoot, "workspace");
  const installPath = path.join(tmpRoot, "install.sh");

  await mkdir(homeDir, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });

  return {
    scenario,
    tmpRoot,
    homeDir,
    openclawHome,
    configPath,
    workspaceDir,
    installPath,
    profile,
    openclawBin,
    baseUrl,
    childEnv: {
      ...process.env,
      HOME: homeDir,
      OPENCLAW_HOME: openclawHome,
      OPENCLAW_CONFIG_PATH: configPath,
      OPENCLAW_BIN: openclawBin,
      PATH: buildPathEnv(openclawBin),
    },
  };
}

function hasProviderCredentials() {
  return [
    process.env.OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].some((value) => value?.trim());
}

async function cleanupScenarioEnvironment(
  env: ScenarioEnvironment,
  keepArtifacts: OpenClawKeepArtifacts,
  scenarioFailed: boolean,
  reporter: Reporter,
) {
  const shouldKeep =
    keepArtifacts === "always" || (keepArtifacts === "fail" && scenarioFailed);

  if (shouldKeep) {
    reporter.record(env.scenario, "artifact retention", true, `kept ${env.tmpRoot}`);
    return;
  }

  await rm(env.tmpRoot, { recursive: true, force: true });
  reporter.record(env.scenario, "artifact retention", true, "cleaned");
}

async function downloadInstaller(env: ScenarioEnvironment, reporter: Reporter) {
  const response = await requestText(`${env.baseUrl}/openclaw/install.sh`);
  reporter.record(env.scenario, "download install.sh", response.ok, String(response.status));
  if (!response.ok) {
    throw new Error(`Failed to download install.sh from ${env.baseUrl}`);
  }
  await writeFile(env.installPath, response.text, "utf8");
}

async function runInstall(env: ScenarioEnvironment, reporter: Reporter, workspaceDir = env.workspaceDir) {
  await runCommand(
    reporter,
    env.scenario,
    "run install.sh",
    "bash",
    [env.installPath, "--workspace", workspaceDir, "--host", env.baseUrl, "--profile", env.profile],
    {
      cwd: process.cwd(),
      env: env.childEnv,
      timeoutMs: 180_000,
    },
  );
}

async function readIdentity(env: ScenarioEnvironment, workspaceDir = env.workspaceDir): Promise<IdentityPayload> {
  const identityPath = path.join(workspaceDir, "skills", "tokenmart", "tokenbook-agent.json");
  return JSON.parse(await readFile(identityPath, "utf8")) as IdentityPayload;
}

async function verifyInstallArtifacts(env: ScenarioEnvironment, reporter: Reporter, workspaceDir = env.workspaceDir) {
  const identityPath = path.join(workspaceDir, "skills", "tokenmart", "tokenbook-agent.json");
  const heartbeatPath = path.join(workspaceDir, "HEARTBEAT.md");
  const skillPath = path.join(workspaceDir, "skills", "tokenmart", "SKILL.md");

  assert.ok(existsSync(identityPath), "identity file missing");
  assert.ok(existsSync(heartbeatPath), "workspace heartbeat missing");
  assert.ok(existsSync(skillPath), "skill file missing");
  assert.ok(existsSync(env.configPath), "OpenClaw config missing");
  reporter.record(env.scenario, "installer created expected files", true);

  const identity = await readIdentity(env, workspaceDir);
  assert.ok(identity.api_key.startsWith("tokenmart_"), "installer did not persist tokenmart api key");
  reporter.record(env.scenario, "identity contains api key", true);

  const heartbeatText = await readFile(heartbeatPath, "utf8");
  const skillText = await readFile(skillPath, "utf8");
  if (env.baseUrl !== "https://www.tokenmart.net") {
    assert.ok(heartbeatText.includes(env.baseUrl), "heartbeat.md was not rewritten to local host");
    assert.ok(skillText.includes(env.baseUrl), "SKILL.md was not rewritten to local host");
  }
  reporter.record(env.scenario, "local host rewrite", true);

  const config = JSON.parse(await readFile(env.configPath, "utf8")) as Json;
  const configuredWorkspace = (config.agents as Json)?.defaults && ((config.agents as Json).defaults as Json).workspace;
  assert.equal(await realpath(String(configuredWorkspace)), await realpath(workspaceDir));
  const extraDirs = ((((config.skills as Json)?.load as Json)?.extraDirs) as unknown[]) ?? [];
  const canonicalExtraDirs = await Promise.all(
    extraDirs
      .filter((dir): dir is string => typeof dir === "string")
      .map((dir) => realpath(dir).catch(() => dir)),
  );
  assert.ok(canonicalExtraDirs.includes(path.join(await realpath(workspaceDir), "skills")));
  reporter.record(env.scenario, "installer config shape", true);

  return identity;
}

async function verifyConnectedStatus(env: ScenarioEnvironment, reporter: Reporter, identity: IdentityPayload) {
  const status = asObject(
    await requestJson(
      reporter,
      env.scenario,
      "tokenmart status after bootstrap",
      `${env.baseUrl}/api/v2/openclaw/status`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${identity.api_key}` },
      },
    ),
  );

  assert.equal(status.connected, true);
  assert.equal(status.runtime_online, true);
  reporter.record(env.scenario, "bootstrap connected tokenmart", true);
}

async function prepareGatewayConfig(env: ScenarioEnvironment, reporter: Reporter) {
  const gatewayConfig = JSON.parse(await readFile(env.configPath, "utf8")) as Json;
  const gatewaySettings = (gatewayConfig.gateway as Json | undefined) ?? {};
  const auth = (gatewaySettings.auth as Json | undefined) ?? {};
  const remote = (gatewaySettings.remote as Json | undefined) ?? {};
  const port = resolvePort();
  const token = `token-${sanitizeSegment(env.profile)}`;

  gatewaySettings.port = port;
  auth.token = token;
  remote.url = `ws://127.0.0.1:${port}`;
  remote.token = token;
  gatewaySettings.auth = auth;
  gatewaySettings.remote = remote;
  gatewayConfig.gateway = gatewaySettings;

  await writeFile(env.configPath, JSON.stringify(gatewayConfig, null, 2) + "\n", "utf8");
  reporter.record(env.scenario, "gateway config updated", true);

  return { port, token };
}

async function runGatewayWake(
  env: ScenarioEnvironment,
  reporter: Reporter,
  requireTurnSuccess: boolean,
) {
  const { port, token } = await prepareGatewayConfig(env, reporter);
  const gatewayLogs: string[] = [];
  const gateway = spawn(
    env.openclawBin,
    ["--profile", env.profile, "gateway", "run", "--allow-unconfigured", "--port", String(port), "--token", token],
    {
      cwd: process.cwd(),
      env: env.childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  gateway.stdout.on("data", (chunk) => gatewayLogs.push(String(chunk)));
  gateway.stderr.on("data", (chunk) => gatewayLogs.push(String(chunk)));

  try {
    await waitFor(
      reporter,
      env.scenario,
      "gateway health ready",
      async () => {
        const result = await runCommand(
          reporter,
          env.scenario,
          "gateway health probe",
          env.openclawBin,
          ["--profile", env.profile, "gateway", "health", "--url", `ws://127.0.0.1:${port}`, "--token", token, "--json"],
          { cwd: process.cwd(), env: env.childEnv, allowFailure: true, timeoutMs: 30_000 },
        );
        return result.exitCode === 0 && result.stdout.includes("\"ok\": true");
      },
      45_000,
      2_000,
    );

    await runCommand(
      reporter,
      env.scenario,
      "enable system heartbeat",
      env.openclawBin,
      ["--profile", env.profile, "system", "heartbeat", "enable", "--url", `ws://127.0.0.1:${port}`, "--token", token, "--json"],
      { cwd: process.cwd(), env: env.childEnv, timeoutMs: 60_000 },
    );

    await runCommand(
      reporter,
      env.scenario,
      "emit system event",
      env.openclawBin,
      [
        "--profile",
        env.profile,
        "system",
        "event",
        "--mode",
        "now",
        "--text",
        "OpenClaw live harness wake for TokenMart bootstrap verification",
        "--url",
        `ws://127.0.0.1:${port}`,
        "--token",
        token,
        "--json",
      ],
      { cwd: process.cwd(), env: env.childEnv, timeoutMs: 60_000 },
    );

    await waitFor(
      reporter,
      env.scenario,
      "openclaw heartbeat attempted",
      async () => {
        const heartbeatLast = await runCommand(
          reporter,
          env.scenario,
          "read last heartbeat result",
          env.openclawBin,
          ["--profile", env.profile, "system", "heartbeat", "last", "--url", `ws://127.0.0.1:${port}`, "--token", token, "--json"],
          { cwd: process.cwd(), env: env.childEnv, allowFailure: true, timeoutMs: 30_000 },
        );
        const joinedLogs = gatewayLogs.join("\n");
        return (
          joinedLogs.includes("[agent/embedded] embedded run agent end") ||
          (heartbeatLast.stdout.trim().length > 0 && heartbeatLast.stdout.trim() !== "null")
        );
      },
      60_000,
      2_000,
    );

    const joinedLogs = gatewayLogs.join("\n");
    const providerAuthFailure =
      joinedLogs.includes("authentication_error") ||
      joinedLogs.includes("No API key found for provider");

    if (providerAuthFailure) {
      reporter.record(
        env.scenario,
        "openclaw provider auth",
        !requireTurnSuccess,
        "OpenClaw heartbeat turn attempted, but provider auth blocked model execution",
      );
      if (requireTurnSuccess) {
        throw new Error("OpenClaw turn was attempted but model provider auth failed");
      }
    } else {
      reporter.record(env.scenario, "openclaw provider auth", true);
    }
  } finally {
    gateway.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

async function freshInstallScenario(env: ScenarioEnvironment, reporter: Reporter) {
  await downloadInstaller(env, reporter);
  await runInstall(env, reporter);
  const identity = await verifyInstallArtifacts(env, reporter);
  await verifyConnectedStatus(env, reporter, identity);
  return identity;
}

async function wipeAndReinstallSameFingerprint(env: ScenarioEnvironment, reporter: Reporter) {
  const firstIdentity = await freshInstallScenario(env, reporter);
  await rm(env.homeDir, { recursive: true, force: true });
  await rm(env.workspaceDir, { recursive: true, force: true });
  await mkdir(env.homeDir, { recursive: true });
  await mkdir(env.workspaceDir, { recursive: true });
  reporter.record(env.scenario, "wipe local runtime state", true);

  await downloadInstaller(env, reporter);
  await runInstall(env, reporter);
  const secondIdentity = await verifyInstallArtifacts(env, reporter);
  await verifyConnectedStatus(env, reporter, secondIdentity);
  assert.equal(secondIdentity.agent_id, firstIdentity.agent_id, "same fingerprint should reuse the same agent");
  reporter.record(env.scenario, "same fingerprint reuses agent id", true, secondIdentity.agent_id);
}

async function wipeAndReinstallNewFingerprint(env: ScenarioEnvironment, reporter: Reporter) {
  const workspaceA = path.join(env.tmpRoot, "workspace-a");
  const workspaceB = path.join(env.tmpRoot, "workspace-b");
  await mkdir(workspaceA, { recursive: true });
  await mkdir(workspaceB, { recursive: true });

  await downloadInstaller(env, reporter);
  await runInstall(env, reporter, workspaceA);
  const firstIdentity = await verifyInstallArtifacts(env, reporter, workspaceA);
  await verifyConnectedStatus(env, reporter, firstIdentity);

  await rm(env.homeDir, { recursive: true, force: true });
  await mkdir(env.homeDir, { recursive: true });
  reporter.record(env.scenario, "wipe local runtime state", true);

  await downloadInstaller(env, reporter);
  await runInstall(env, reporter, workspaceB);
  const secondIdentity = await verifyInstallArtifacts(env, reporter, workspaceB);
  await verifyConnectedStatus(env, reporter, secondIdentity);

  assert.notEqual(secondIdentity.agent_id, firstIdentity.agent_id, "new fingerprint should create a new agent");
  reporter.record(
    env.scenario,
    "new fingerprint creates a distinct agent",
    true,
    `${firstIdentity.agent_id} -> ${secondIdentity.agent_id}`,
  );
}

async function runScenario(
  scenario: OpenClawScenario,
  config: OpenClawSuiteConfig,
  reporter: Reporter,
  openclawBin: string,
  baseUrl: string,
) {
  const env = await createScenarioEnvironment(scenario, openclawBin, baseUrl);
  let failed = false;
  try {
    if (scenario === "fresh_install") {
      await freshInstallScenario(env, reporter);
      return;
    }
    if (scenario === "wipe_and_reinstall_same_fingerprint") {
      await wipeAndReinstallSameFingerprint(env, reporter);
      return;
    }
    if (scenario === "wipe_and_reinstall_new_fingerprint") {
      await wipeAndReinstallNewFingerprint(env, reporter);
      return;
    }
    if (scenario === "gateway_wake") {
      await freshInstallScenario(env, reporter);
      await runGatewayWake(env, reporter, config.requireTurnSuccess);
      return;
    }
    if (scenario === "strict_provider_turn") {
      if (!hasProviderCredentials()) {
        reporter.record(
          env.scenario,
          "strict provider turn",
          true,
          "skipped because no provider credentials are configured",
        );
        return;
      }
      await freshInstallScenario(env, reporter);
      await runGatewayWake(env, reporter, true);
      return;
    }
    throw new Error(`Unhandled OpenClaw scenario: ${scenario}`);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    await cleanupScenarioEnvironment(env, config.keepArtifacts, failed, reporter);
  }
}

export async function runOpenClawSuite(config: OpenClawSuiteConfig) {
  const reporter = new Reporter(config.logProgress);
  const server = await ensureServer(config, reporter);
  const openclawBin = await ensureOpenClawCli(config, reporter);

  try {
    for (const scenario of config.scenarios) {
      await runScenario(scenario, config, reporter, openclawBin, server.baseUrl);
    }
  } finally {
    await stopServer(server);
    reporter.printSummary();
  }

  const failures = reporter.failures();
  if (failures.length > 0) {
    throw new Error(`${failures.length} OpenClaw live harness step(s) failed`);
  }
}
