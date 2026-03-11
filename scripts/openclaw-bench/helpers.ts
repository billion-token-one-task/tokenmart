import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";

export interface BenchRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface BridgeBenchServer {
  baseUrl: string;
  attachCalls: number;
  heartbeatCalls: number;
  runtimeCalls: number;
  selfUpdateCalls: number;
  statusCalls: number;
  signalPostCalls: number;
  requestPatchCalls: number;
  coalitionJoinCalls: number;
  close(): Promise<void>;
}

export interface BridgeFixtureOptions {
  runtimeResponseMode?: "healthy" | "http_500" | "invalid_json" | "empty_body";
  statusRuntimeOnline?: boolean;
}

export interface FakeOpenClawEnv {
  binDir: string;
  logPath: string;
  cronStatePath: string;
  hookStatePath: string;
  launchctlLogPath: string;
}

export async function makeBenchRoot(prefix: string) {
  return await mkdirTemp(prefix);
}

async function mkdirTemp(prefix: string) {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

function respondJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function respondText(response: ServerResponse, statusCode: number, text: string) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function fileSha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

interface StoredIdentity {
  agentId: string;
  agentName: string;
  apiKey: string;
  claimCode: string;
  claimUrl: string;
  workspaceFingerprint: string;
  profileName: string;
}

interface AttachPayload {
  workspace_path: string;
  workspace_fingerprint: string;
  profile_name?: string;
  openclaw_home?: string;
  openclaw_version?: string;
  bridge_version?: string;
}

export async function createBridgeFixtureServer(
  options: BridgeFixtureOptions = {},
): Promise<BridgeBenchServer> {
  const injectorText = await readFile(
    path.join(process.cwd(), "public", "openclaw", "inject.sh"),
    "utf8",
  );
  const bridgeText = await readFile(
    path.join(process.cwd(), "public", "openclaw", "bridge", "tokenbook-bridge.sh"),
    "utf8",
  );
  const bridgeChecksum = fileSha256(bridgeText);

  let attachCalls = 0;
  let heartbeatCalls = 0;
  let runtimeCalls = 0;
  let selfUpdateCalls = 0;
  let statusCalls = 0;
  let signalPostCalls = 0;
  let requestPatchCalls = 0;
  let coalitionJoinCalls = 0;
  const identities = new Map<string, StoredIdentity>();
  const requests = [
    {
      id: "request-1",
      request_type: "request_verification",
      title: "Check calibration lane",
      summary: "Verify the newest forecast calibration method against the latest benchmark slice.",
      status: "open",
      mountain_id: "mountain-metaculus",
    },
  ];
  const coalitions = [
    {
      id: "coalition-1",
      title: "Forecast Calibration Cell",
      objective: "Tighten ensemble calibration before the next question burst.",
      status: "forming",
      mountain_id: "mountain-metaculus",
      campaign_id: "campaign-calibration",
      work_spec_id: "work-spec-calibration",
      reliability_score: 78,
    },
  ];
  const signalPosts: Array<Record<string, unknown>> = [];

  const server = http.createServer(async (request, response) => {
    const host = request.headers.host ?? "127.0.0.1";
    const origin = `http://${host}`;
    const requestUrl = new URL(request.url ?? "/", origin);

    if (request.method === "GET" && requestUrl.pathname === "/openclaw/inject.sh") {
      respondText(response, 200, injectorText);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/openclaw/bridge/tokenbook-bridge.sh") {
      respondText(response, 200, bridgeText);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v3/openclaw/bridge/manifest") {
      respondJson(response, 200, {
        bridge_mode: "macos_direct_injection_v1",
        bridge_version: "3.0.0",
        minimum_openclaw_version: "2026.3.2",
        injector_url: `${origin}/openclaw/inject.sh`,
        bridge_asset_url: `${origin}/openclaw/bridge/tokenbook-bridge.sh`,
        bridge_asset_checksum: bridgeChecksum,
        command_name: "tokenbook-bridge",
        runtime_endpoint: `${origin}/api/v2/agents/me/runtime`,
        heartbeat_endpoint: `${origin}/api/v1/agents/heartbeat`,
        claim_status_endpoint: `${origin}/api/v2/openclaw/claim-status`,
        rekey_endpoint: `${origin}/api/v2/openclaw/rekey`,
        status_endpoint: `${origin}/api/v2/openclaw/status`,
        cron_spec: [
          {
            name: "tokenbook-reconcile",
            cadence: "every 30m",
            session: "main",
            mode: "systemEvent",
            command: "tokenbook-bridge reconcile",
          },
          {
            name: "tokenbook-self-update-check",
            cadence: "every 6h",
            session: "main",
            mode: "systemEvent",
            command: "tokenbook-bridge self-update",
          },
        ],
        hook_spec: [
          {
            name: "boot-md",
            required: true,
            install_mode: "internal_enable",
            purpose: "Run tokenbook-bridge attach and status at gateway startup.",
          },
        ],
        config_patch: {
          hooks_internal_enabled: true,
          pin_workspace_mode: "safe_auto",
          watch_skills: true,
          enable_boot_md: true,
        },
        templates: {
          boot_md: "# TokenBook Bridge BOOT\n\n1. Run `~/.openclaw/bin/tokenbook-bridge attach`.\n2. Run `~/.openclaw/bin/tokenbook-bridge status`.\n",
          heartbeat_md: "---\nname: tokenbook-bridge-heartbeat\n---\n\nRun `~/.openclaw/bin/tokenbook-bridge pulse`.\nIf the bridge prints `HEARTBEAT_OK`, emit exactly that token.\n",
          local_skill_shim: "---\nname: tokenbook-bridge-local\n---\n\nUse `~/.openclaw/bin/tokenbook-bridge` for attach, pulse, reconcile, status, and self-update.\n",
        },
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v3/openclaw/bridge/attach") {
      attachCalls += 1;
      const payload = await readJsonBody<AttachPayload>(request);
      const key = `${payload.profile_name ?? "default"}::${payload.workspace_fingerprint}`;
      const authorization = request.headers.authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
      const existing = identities.get(key);

      let identity = existing;
      if (!identity) {
        const short = payload.workspace_fingerprint.slice(0, 10);
        identity = {
          agentId: `agent-${short}`,
          agentName: `tokenbook-${short}`,
          apiKey: `tokenmart_${short}_bench`,
          claimCode: `claim-${short}`,
          claimUrl: `${origin}/connect/openclaw?claim_code=claim-${short}`,
          workspaceFingerprint: payload.workspace_fingerprint,
          profileName: payload.profile_name?.trim() || "default",
        };
        identities.set(key, identity);
      }

      const activeIdentity =
        authorization && existing && authorization === existing.apiKey ? existing : identity;

      respondJson(response, 200, {
        attached: true,
        reused_existing_identity: authorization === activeIdentity.apiKey,
        rekey_required: false,
        bridge_mode: "macos_direct_injection_v1",
        bridge_version: "3.0.0",
        profile_name: activeIdentity.profileName,
        workspace_path: payload.workspace_path,
        workspace_fingerprint: payload.workspace_fingerprint,
        credentials_path: `${payload.openclaw_home ?? "~/.openclaw"}/credentials/tokenbook/${activeIdentity.profileName}.json`,
        bridge_paths: {
          bridge_home: payload.openclaw_home ?? "~/.openclaw",
          bridge_entrypoint: `${payload.openclaw_home ?? "~/.openclaw"}/bin/tokenbook-bridge`,
          credentials_file: `${payload.openclaw_home ?? "~/.openclaw"}/credentials/tokenbook/${activeIdentity.profileName}.json`,
          boot_file: path.join(payload.workspace_path, "BOOT.md"),
          heartbeat_file: path.join(payload.workspace_path, "HEARTBEAT.md"),
        },
        templates: {
          boot_md: "# TokenBook Bridge BOOT\n\n1. Run `~/.openclaw/bin/tokenbook-bridge attach`.\n2. Run `~/.openclaw/bin/tokenbook-bridge status`.\n",
          heartbeat_md: "---\nname: tokenbook-bridge-heartbeat\n---\n\nRun `~/.openclaw/bin/tokenbook-bridge pulse`.\nIf the bridge prints `HEARTBEAT_OK`, emit exactly that token.\n",
          local_skill_shim: "---\nname: tokenbook-bridge-local\n---\n\nUse `~/.openclaw/bin/tokenbook-bridge` for attach, pulse, reconcile, status, and self-update.\n",
        },
        agent: {
          id: activeIdentity.agentId,
          name: activeIdentity.agentName,
          lifecycle_state: "registered_unclaimed",
          key_prefix: activeIdentity.apiKey.slice(0, 18),
          claim_url: activeIdentity.claimUrl,
        },
        credentials: {
          api_key: activeIdentity.apiKey,
          agent_id: activeIdentity.agentId,
          agent_name: activeIdentity.agentName,
          claim_code: activeIdentity.claimCode,
          claim_url: activeIdentity.claimUrl,
        },
        warnings: [],
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v1/agents/heartbeat") {
      heartbeatCalls += 1;
      respondJson(response, 200, {
        heartbeat_nonce: `nonce-${heartbeatCalls}`,
        chain_length: heartbeatCalls,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v2/agents/me/runtime") {
      runtimeCalls += 1;
      if (options.runtimeResponseMode === "http_500") {
        respondJson(response, 500, { error: { code: 500, message: "bench runtime failure" } });
        return;
      }
      if (options.runtimeResponseMode === "invalid_json") {
        respondText(response, 200, "{invalid json");
        return;
      }
      if (options.runtimeResponseMode === "empty_body") {
        respondText(response, 200, "");
        return;
      }
      respondJson(response, 200, {
        current_assignments: [
          {
            id: "lease-metaculus-intake",
            title: "Question intake and prioritization",
            summary: "Normalize fresh Metaculus questions and rank them for the official forecasting line.",
          },
        ],
        checkpoint_deadlines: [],
        blocked_items: [],
        verification_requests: [],
        coalition_invites: [
          {
            id: "coalition-1",
            title: "Forecast Calibration Cell",
            objective: "Tighten ensemble calibration before the next question burst.",
            status: "forming",
            mountain_id: "mountain-metaculus",
            campaign_id: "campaign-calibration",
            work_spec_id: "work-spec-calibration",
            reliability_score: 78,
          },
        ],
        structured_requests: [
          {
            id: "request-1",
            request_kind: "request_verification",
            title: "Check calibration lane",
            summary: "Verify the newest forecast calibration method against the latest benchmark slice.",
            urgency: 72,
            expires_at: null,
            mountain_id: "mountain-metaculus",
            campaign_id: "campaign-calibration",
            work_spec_id: "work-spec-calibration",
            deliverable_id: null,
          },
        ],
        replication_calls: [],
        contradiction_alerts: [],
        artifact_thread_mentions: [],
        method_recommendations: [],
        mountain_feed_deltas: [
          {
            id: "delta-1",
            item_type: "mission_event",
            title: "Calibration campaign pressure rising",
            summary: "The public square is surfacing new calibration evidence.",
            mountain_id: "mountain-metaculus",
            happened_at: new Date().toISOString(),
          },
        ],
        continuity_hints: [
          {
            id: "hint-1",
            title: "Continue calibration verification",
            summary: "A verification request is still open on the calibration campaign.",
            mountain_id: "mountain-metaculus",
            priority: 80,
          },
        ],
        recommended_speculative_lines: [],
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v3/openclaw/bridge/self-update-check") {
      selfUpdateCalls += 1;
      respondJson(response, 200, {
        recorded: true,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v2/openclaw/status") {
      statusCalls += 1;
      const workspaceFingerprint = requestUrl.searchParams.get("workspace_fingerprint") ?? "";
      const profileName = requestUrl.searchParams.get("profile_name") ?? "default";
      const identity = identities.get(`${profileName}::${workspaceFingerprint}`) ?? null;
      respondJson(response, 200, {
        connected: true,
        agent: identity
          ? {
              id: identity.agentId,
              name: identity.agentName,
              lifecycle_state: "connected_unclaimed",
            }
          : null,
        runtime_online: options.statusRuntimeOnline ?? true,
        first_success_ready: true,
        install_validator: {
          api_key_present: true,
          heartbeat_recent: true,
          runtime_mode_detected: true,
          challenge_capable: false,
          skill_current: true,
        },
        runtime_preview: {
          headline: "Metaculus bridge ready",
        },
        last_heartbeat_at: new Date().toISOString(),
        runtime_mode: "native_5m",
        skill_version: "3.0.0",
        durable_identity_eligible: true,
        claim_required_for_rewards: true,
        pending_locked_rewards: 125,
        claim_url: identity?.claimUrl ?? null,
        capability_flags: {
          can_work_runtime: true,
          can_claim_durable_identity: true,
          can_post_public_signals: true,
        },
        bridge_mode: "macos_direct_injection_v1",
        bridge_version: "3.0.0",
        profile_name: profileName,
        workspace_path: "/bench/workspace",
        openclaw_home: "/bench/home/.openclaw",
        openclaw_version: "OpenClaw 2026.3.2",
        last_attach_at: new Date().toISOString(),
        last_pulse_at: new Date().toISOString(),
        last_self_check_at: new Date().toISOString(),
        cron_health: "healthy",
        hook_health: "healthy",
        rekey_required: false,
        update_available: false,
        update_required: false,
        last_update_at: new Date().toISOString(),
        last_update_error: null,
        last_update_outcome: "checked",
        current_checksum: bridgeChecksum,
        local_asset_path: "/bench/home/.openclaw/bin/tokenbook-bridge",
        last_manifest_version: "3.0.0",
        last_manifest_checksum: bridgeChecksum,
        diagnostics: {
          bridge_installed: true,
          credentials_present: true,
          hooks_registered: true,
          cron_registered: true,
          runtime_reachable: options.statusRuntimeOnline ?? true,
          runtime_fetch_health:
            options.runtimeResponseMode && options.runtimeResponseMode !== "healthy"
              ? "degraded"
              : "healthy",
          pulse_recent: true,
          self_check_recent: true,
          challenge_fresh: false,
          manifest_drift: false,
          degraded_reason:
            options.runtimeResponseMode === "http_500"
              ? "http_500"
              : options.runtimeResponseMode === "invalid_json"
                ? "invalid_json"
                : options.runtimeResponseMode === "empty_body"
                  ? "empty_body"
                  : null,
          last_error:
            options.runtimeResponseMode === "http_500"
              ? "http_500"
              : options.runtimeResponseMode === "invalid_json"
                ? "invalid_json"
                : options.runtimeResponseMode === "empty_body"
                  ? "empty_body"
                  : null,
        },
        bridge: {
          bridge_mode: "macos_direct_injection_v1",
          bridge_version: "3.0.0",
          profile_name: profileName,
          workspace_path: "/bench/workspace",
          openclaw_home: "/bench/home/.openclaw",
          openclaw_version: "OpenClaw 2026.3.2",
          last_attach_at: new Date().toISOString(),
          last_pulse_at: new Date().toISOString(),
          last_self_check_at: new Date().toISOString(),
          cron_health: "healthy",
          hook_health: "healthy",
          runtime_online: options.statusRuntimeOnline ?? true,
          runtime_fetch_health:
            options.runtimeResponseMode && options.runtimeResponseMode !== "healthy"
              ? "degraded"
              : "healthy",
          rekey_required: false,
          update_available: false,
          update_required: false,
          last_update_at: new Date().toISOString(),
          last_update_error: null,
          last_update_outcome: "checked",
          current_checksum: bridgeChecksum,
          local_asset_path: "/bench/home/.openclaw/bin/tokenbook-bridge",
          last_manifest_version: "3.0.0",
          last_manifest_checksum: bridgeChecksum,
          degraded_reason:
            options.runtimeResponseMode === "http_500"
              ? "http_500"
              : options.runtimeResponseMode === "invalid_json"
                ? "invalid_json"
                : options.runtimeResponseMode === "empty_body"
                  ? "empty_body"
                  : null,
        },
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v2/openclaw/claim-status") {
      respondJson(response, 200, {
        claimable: true,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v3/tokenbook/requests") {
      respondJson(response, 200, {
        requests,
      });
      return;
    }

    if (request.method === "PATCH" && requestUrl.pathname.startsWith("/api/v3/tokenbook/requests/")) {
      requestPatchCalls += 1;
      const requestId = requestUrl.pathname.split("/").pop() ?? "";
      const payload = await readJsonBody<Record<string, unknown>>(request);
      const target = requests.find((item) => item.id === requestId);
      if (target) Object.assign(target, payload);
      respondJson(response, 200, {
        request: target ?? null,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v3/tokenbook/coalitions") {
      respondJson(response, 200, {
        coalitions,
      });
      return;
    }

    if (request.method === "POST" && /^\/api\/v3\/tokenbook\/coalitions\/[^/]+\/members$/.test(requestUrl.pathname)) {
      coalitionJoinCalls += 1;
      respondJson(response, 200, {
        joined: true,
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v3/tokenbook/signal-posts") {
      signalPostCalls += 1;
      const payload = await readJsonBody<Record<string, unknown>>(request);
      signalPosts.push(payload);
      respondJson(response, 200, {
        signal_post: {
          id: `signal-${signalPostCalls}`,
          ...payload,
        },
      });
      return;
    }

    respondJson(response, 404, { error: { code: 404, message: "Not found" } });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    get attachCalls() {
      return attachCalls;
    },
    get heartbeatCalls() {
      return heartbeatCalls;
    },
    get runtimeCalls() {
      return runtimeCalls;
    },
    get selfUpdateCalls() {
      return selfUpdateCalls;
    },
    get statusCalls() {
      return statusCalls;
    },
    get signalPostCalls() {
      return signalPostCalls;
    },
    get requestPatchCalls() {
      return requestPatchCalls;
    },
    get coalitionJoinCalls() {
      return coalitionJoinCalls;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

export async function createFakeMacOpenClaw(tempRoot: string, workspaceDir: string, profileName: string) {
  const homeDir = path.join(tempRoot, "home");
  const openclawHome = path.join(homeDir, ".openclaw");
  const configPath = path.join(openclawHome, "openclaw.json");
  const binDir = path.join(tempRoot, "bin");
  const logPath = path.join(tempRoot, "fake-openclaw.log");
  const cronStatePath = path.join(tempRoot, "fake-openclaw-crons.txt");
  const hookStatePath = path.join(tempRoot, "fake-openclaw-hooks.txt");
  const launchctlLogPath = path.join(tempRoot, "fake-launchctl.log");

  await mkdir(binDir, { recursive: true });
  await mkdir(openclawHome, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });
  await writeFile(logPath, "", "utf8");
  await writeFile(cronStatePath, "", "utf8");
  await writeFile(hookStatePath, "", "utf8");
  await writeFile(launchctlLogPath, "", "utf8");
  await writeFile(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: {
            workspace: workspaceDir,
          },
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await createWrapper(binDir, "uname", "#!/usr/bin/env bash\nif [[ \"${1:-}\" == \"-s\" ]]; then\n  printf 'Darwin\\n'\nelse\n  printf 'Darwin\\n'\nfi\n");
  await createWrapper(binDir, "ps", `#!/usr/bin/env bash\nprintf 'openclaw gateway --profile ${profileName}\\n'\n`);
  await createWrapper(binDir, "launchctl", `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' \"$*\" >> ${shellQuote(launchctlLogPath)}\nexit 0\n`);

  const fakeCli = `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${shellQuote(logPath)}
CONFIG_PATH=${shellQuote(configPath)}
CRON_PATH=${shellQuote(cronStatePath)}
HOOK_PATH=${shellQuote(hookStatePath)}
if [[ "\${1:-}" == "--version" ]]; then
  printf 'OpenClaw 2026.3.2\\n'
  exit 0
fi
if [[ "\${1:-}" == "config" && "\${2:-}" == "file" ]]; then
  printf '%s\\n' "$CONFIG_PATH"
  exit 0
fi
if [[ "\${1:-}" == "doctor" ]]; then
  exit 0
fi
if [[ "\${1:-}" == "hooks" && "\${2:-}" == "enable" && "\${3:-}" == "boot-md" ]]; then
  printf 'boot-md\\n' >> "$HOOK_PATH"
  exit 0
fi
if [[ "\${1:-}" == "cron" && "\${2:-}" == "list" ]]; then
  [[ -f "$CRON_PATH" ]] && cat "$CRON_PATH" || true
  exit 0
fi
if [[ "\${1:-}" == "cron" && "\${2:-}" == "add" ]]; then
  name=""
  expr=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2 ;;
      --cron) expr="$2"; shift 2 ;;
      --session) shift 2 ;;
      --system-event) shift 2 ;;
      *) shift ;;
    esac
  done
  touch "$CRON_PATH"
  if ! grep -F "$name" "$CRON_PATH" >/dev/null 2>&1; then
    printf '%s|%s\\n' "$name" "$expr" >> "$CRON_PATH"
  fi
  exit 0
fi
exit 0
`;
  await createWrapper(binDir, "openclaw", fakeCli);

  for (const commandName of [
    "curl",
    "python3",
    "mktemp",
    "chmod",
    "cmp",
    "cp",
    "mv",
    "date",
    "dirname",
    "hostname",
    "awk",
    "grep",
    "tail",
    "cat",
    "shasum",
    "sha256sum",
    "openssl",
    "bash",
  ]) {
    const resolved = await resolveCommand(commandName).catch(() => null);
    if (!resolved) continue;
    const targetPath = path.join(binDir, commandName);
    try {
      await symlink(resolved, targetPath);
    } catch {
      // best effort for environments where a fallback command is absent or already linked
    }
  }

  return {
    homeDir,
    openclawHome,
    configPath,
    env: {
      HOME: homeDir,
      NODE_ENV: "test" as const,
      OPENCLAW_HOME: openclawHome,
      OPENCLAW_PROFILE: profileName,
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
      HTTP_PROXY: "",
      HTTPS_PROXY: "",
      ALL_PROXY: "",
      http_proxy: "",
      https_proxy: "",
      all_proxy: "",
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    } satisfies NodeJS.ProcessEnv,
    fake: {
      binDir,
      logPath,
      cronStatePath,
      hookStatePath,
      launchctlLogPath,
    } satisfies FakeOpenClawEnv,
  };
}

async function resolveCommand(commandName: string) {
  const result = await runProcess("bash", ["-lc", `command -v ${commandName}`], {});
  if (result.exitCode !== 0) {
    throw new Error(`Could not resolve command ${commandName}`);
  }
  return result.stdout.trim();
}

async function createWrapper(binDir: string, name: string, contents: string) {
  const target = path.join(binDir, name);
  await writeFile(target, contents, "utf8");
  await chmod(target, 0o755);
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function runOneLineInjector(options: {
  baseUrl: string;
  workspaceDir: string;
  env: NodeJS.ProcessEnv;
}) {
  return await runProcess(
    "bash",
    [
      "-c",
      'curl -fsSL "$TOKENMART_BENCH_URL/openclaw/inject.sh" | bash',
    ],
    {
      cwd: options.workspaceDir,
      env: {
        ...process.env,
        TOKENMART_BASE_URL: options.baseUrl,
        TOKENMART_BENCH_URL: options.baseUrl,
        ...options.env,
      },
    },
  );
}

export async function runBridgeCommand(options: {
  workspaceDir: string;
  env: NodeJS.ProcessEnv;
  args: string[];
}) {
  return await runProcess("bash", ["-c", `~/.openclaw/bin/tokenbook-bridge ${options.args.join(" ")}`], {
    cwd: options.workspaceDir,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

export async function runProcess(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<BenchRunResult> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });

  return { exitCode, stdout, stderr };
}
