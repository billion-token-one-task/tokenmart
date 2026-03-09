import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";

export interface InstallerRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface FixtureServerOptions {
  malformedRegistration?: boolean;
}

export interface FixtureServer {
  baseUrl: string;
  registerCalls: number;
  requests: string[];
  close(): Promise<void>;
}

interface RegisterPayload {
  workspace_fingerprint?: string;
  preferred_model?: string;
  name?: string;
}

const CANONICAL_HOST = "https://www.tokenmart.net";

function createSkillManifest(baseUrl: string) {
  return {
    api_base: CANONICAL_HOST,
    canonical_host: CANONICAL_HOST,
    docs: {
      skill: "/skill.md",
      heartbeat: "/heartbeat.md",
      messaging: "/messaging.md",
      rules: "/rules.md",
      references: {
        messaging: "/messaging.md",
        rules: "/rules.md",
      },
    },
    install: {
      bootstrap_script: `${CANONICAL_HOST}/openclaw/install.sh`,
      bootstrap_command: `curl -fsSL ${CANONICAL_HOST}/openclaw/install.sh | bash`,
      download_urls: {
        skill: `${CANONICAL_HOST}/skill.md`,
        manifest: `${CANONICAL_HOST}/skill.json`,
        heartbeat: `${CANONICAL_HOST}/heartbeat.md`,
      },
    },
    claim: {
      claim_url_template: `${CANONICAL_HOST}/connect/openclaw?claim_code={claim_code}`,
    },
    openclaw: {
      status_endpoint: "/api/v2/openclaw/status",
      register_endpoint: "/api/v2/openclaw/register",
    },
    runtime: {
      primary_queue_endpoint: {
        method: "GET",
        path: "/api/v2/agents/me/runtime",
      },
    },
    _served_from: baseUrl,
  };
}

function buildIdentityFileContent(payload: RegisterPayload, index: number) {
  const fingerprint = payload.workspace_fingerprint?.slice(0, 12) ?? `fingerprint-${index}`;
  return JSON.stringify(
    {
      agent_id: `agent-${fingerprint}`,
      agent_name: payload.name ?? `tokenmart-${fingerprint}`,
      api_key: `tokenmart_${fingerprint}`,
      claim_code: `claim-${fingerprint}`,
      claim_url: `${CANONICAL_HOST}/connect/openclaw?claim_code=claim-${fingerprint}`,
      registered_at: "2026-03-09T00:00:00.000Z",
      workspace_fingerprint: payload.workspace_fingerprint ?? null,
    },
    null,
    2,
  );
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function respondJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function respondText(response: ServerResponse, statusCode: number, text: string) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

export async function createFixtureServer(options: FixtureServerOptions = {}): Promise<FixtureServer> {
  let registerCalls = 0;
  const requests: string[] = [];

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    requests.push(`${request.method ?? "GET"} ${requestUrl.pathname}`);

    if (request.method === "GET" && requestUrl.pathname === "/skill.md") {
      respondText(response, 200, `Install from ${CANONICAL_HOST} and heartbeat at ${CANONICAL_HOST}/heartbeat.md`);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/skill.json") {
      respondJson(response, 200, createSkillManifest(requestUrl.origin));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/heartbeat.md") {
      respondText(response, 200, `Ping ${CANONICAL_HOST}/api/v1/agents/heartbeat and read ${CANONICAL_HOST}/api/v2/agents/me/runtime`);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/messaging.md") {
      respondText(response, 200, "Messaging reference");
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/rules.md") {
      respondText(response, 200, "Rules reference");
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v2/openclaw/register") {
      registerCalls += 1;
      if (options.malformedRegistration) {
        respondJson(response, 200, { ok: true });
        return;
      }
      const payload = await readJsonBody<RegisterPayload>(request);
      respondJson(response, 200, {
        identity_file_content: buildIdentityFileContent(payload, registerCalls),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/v1/agents/heartbeat") {
      respondJson(response, 200, { heartbeat_nonce: "nonce-1", chain_length: 1 });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v2/agents/me/runtime") {
      respondJson(response, 200, { current_assignments: [] });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/v2/openclaw/status") {
      respondJson(response, 200, {
        connected: true,
        runtime_online: true,
        agent: {
          lifecycle_state: "connected_unclaimed",
        },
      });
      return;
    }

    respondJson(response, 404, { error: { code: 404, message: "Not found" } });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind fixture server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    get registerCalls() {
      return registerCalls;
    },
    requests,
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

export async function createFakeOpenClaw(tempDir: string) {
  const binPath = path.join(tempDir, "fake-openclaw-cli");
  const logPath = path.join(tempDir, "fake-openclaw.log");
  const script = `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "${logPath}"
for arg in "$@"; do
  if [[ "$arg" == "health" ]]; then
    printf '{"ok":true}\\n'
    exit 0
  fi
done
exit 0
`;
  await writeFile(binPath, script, "utf8");
  await chmod(binPath, 0o755);
  return { binPath, logPath };
}

export async function createCuratedBinDir(tempDir: string, includeOpenClaw = false, openClawTarget?: string) {
  const binDir = path.join(tempDir, "curated-bin");
  await mkdir(binDir, { recursive: true });

  for (const commandName of [
    "curl",
    "python3",
    "mktemp",
    "shasum",
    "sha256sum",
    "openssl",
    "git",
    "cmp",
    "cp",
    "mv",
    "date",
    "dirname",
    "hostname",
    "awk",
  ]) {
    const resolved = await resolveCommand(commandName).catch(() => null);
    if (!resolved) continue;
    await symlink(resolved, path.join(binDir, commandName));
  }

  if (includeOpenClaw && openClawTarget) {
    await symlink(openClawTarget, path.join(binDir, "openclaw"));
  }

  return binDir;
}

async function resolveCommand(commandName: string) {
  const result = await runProcess("bash", ["-lc", `command -v ${commandName}`], {});
  if (result.exitCode !== 0) {
    throw new Error(`Could not resolve required command: ${commandName}`);
  }
  return result.stdout.trim();
}

export async function runInstaller(options: {
  workspaceDir: string;
  homeDir: string;
  baseUrl: string;
  env?: NodeJS.ProcessEnv;
  args?: string[];
}) {
  const installScriptPath = path.join(process.cwd(), "public", "openclaw", "install.sh");
  return runProcess(
    process.env.SHELL && process.env.SHELL.length > 0 ? process.env.SHELL : "/bin/bash",
    [
      installScriptPath,
      "--workspace",
      options.workspaceDir,
      "--host",
      options.baseUrl,
      ...(options.args ?? []),
    ],
    {
      env: {
        ...process.env,
        HOME: options.homeDir,
        ...options.env,
      },
    },
  );
}

export async function runProcess(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<InstallerRunResult> {
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

export async function makeTempRoot(prefix: string) {
  const fs = await import("node:fs/promises");
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
