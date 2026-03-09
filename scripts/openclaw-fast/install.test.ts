import assert from "node:assert/strict";
import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createCuratedBinDir,
  createFakeOpenClaw,
  createFixtureServer,
  makeTempRoot,
  readJsonFile,
  runInstaller,
} from "./test-helpers";

function curatedPath(binDir: string) {
  return `${binDir}:/bin:/usr/bin:/usr/sbin:/sbin`;
}

test("install.sh honors OPENCLAW_BIN and OPENCLAW_CONFIG_PATH while remaining idempotent", async (t) => {
  const tempRoot = await makeTempRoot("tokenmart-openclaw-fast-");
  const server = await createFixtureServer();
  t.after(async () => {
    await server.close();
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceDir = path.join(tempRoot, "workspace");
  const homeDir = path.join(tempRoot, "home");
  const configDir = path.join(tempRoot, "custom-config");
  const configPath = path.join(configDir, "openclaw.json");

  await mkdir(workspaceDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });
  await mkdir(configDir, { recursive: true });

  const { binPath, logPath } = await createFakeOpenClaw(tempRoot);
  const curatedBinDir = await createCuratedBinDir(tempRoot);
  const preexistingExtraDir = path.join(tempRoot, "existing-extra-dir");
  await mkdir(preexistingExtraDir, { recursive: true });

  await writeFile(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: {
            workspace: "/tmp/preserve-existing-workspace",
          },
        },
        skills: {
          load: {
            extraDirs: [preexistingExtraDir],
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: curatedPath(curatedBinDir),
    OPENCLAW_BIN: binPath,
    OPENCLAW_CONFIG_PATH: configPath,
  };

  const firstRun = await runInstaller({
    workspaceDir,
    homeDir,
    baseUrl: server.baseUrl,
    env,
    args: ["--profile", "fast-suite", "--no-pin-workspace"],
  });
  assert.equal(firstRun.exitCode, 0, `${firstRun.stdout}\n${firstRun.stderr}`);

  const secondRun = await runInstaller({
    workspaceDir,
    homeDir,
    baseUrl: server.baseUrl,
    env,
    args: ["--profile", "fast-suite", "--no-pin-workspace"],
  });
  assert.equal(secondRun.exitCode, 0, `${secondRun.stdout}\n${secondRun.stderr}`);

  assert.equal(server.registerCalls, 1, "identity reuse should avoid a second registration call");

  const config = await readJsonFile<{
    agents?: { defaults?: { workspace?: string } };
    skills?: { load?: { extraDirs?: string[] } };
    hooks?: { internal?: { enabled?: boolean } };
  }>(configPath);
  const workspaceSkillsDir = path.join(workspaceDir, "skills");
  const normalizedExtraDirs = await Promise.all(
    (config.skills?.load?.extraDirs ?? []).map((entry) => realpath(entry).catch(() => entry)),
  );

  assert.equal(config.agents?.defaults?.workspace, "/tmp/preserve-existing-workspace");
  assert.deepEqual(normalizedExtraDirs, [
    await realpath(preexistingExtraDir),
    await realpath(workspaceSkillsDir),
  ]);
  assert.equal(config.hooks?.internal?.enabled, true);

  const heartbeatText = await readFile(path.join(workspaceDir, "HEARTBEAT.md"), "utf8");
  const skillText = await readFile(path.join(workspaceDir, "skills", "tokenmart", "SKILL.md"), "utf8");
  const manifest = await readJsonFile<{
    api_base?: string;
    canonical_host?: string;
    docs?: { skill?: string };
    install?: { bootstrap_script?: string; download_urls?: { skill?: string } };
    claim?: { claim_url_template?: string };
  }>(path.join(workspaceDir, "skills", "tokenmart", "package.json"));
  const fakeLog = await readFile(logPath, "utf8");

  assert.match(heartbeatText, new RegExp(server.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(skillText, new RegExp(server.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(manifest.api_base, server.baseUrl);
  assert.equal(manifest.canonical_host, server.baseUrl);
  assert.equal(manifest.docs?.skill, `${server.baseUrl}/skill.md`);
  assert.equal(manifest.install?.bootstrap_script, `${server.baseUrl}/openclaw/install.sh`);
  assert.equal(manifest.install?.download_urls?.skill, `${server.baseUrl}/skill.md`);
  assert.equal(
    manifest.claim?.claim_url_template,
    `${server.baseUrl}/connect/openclaw?claim_code={claim_code}`,
  );
  assert.match(fakeLog, /doctor --fix --non-interactive --yes/);
  assert.match(fakeLog, /onboard --non-interactive --accept-risk/);
  assert.match(fakeLog, /hooks enable session-memory/);
  assert.match(fakeLog, /hooks enable command-logger/);
  assert.match(fakeLog, /health --json/);
});

test("install.sh reports actionable failure when openclaw is missing from PATH", async (t) => {
  const tempRoot = await makeTempRoot("tokenmart-openclaw-fast-missing-cli-");
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceDir = path.join(tempRoot, "workspace");
  const homeDir = path.join(tempRoot, "home");
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });

  const curatedBinDir = await createCuratedBinDir(tempRoot, false);
  const result = await runInstaller({
    workspaceDir,
    homeDir,
    baseUrl: "http://127.0.0.1:6553",
    env: {
      ...process.env,
      PATH: curatedPath(curatedBinDir),
    },
  });

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /Missing required command: openclaw/);
});

test("install.sh reports actionable failure for unreachable hosts", async (t) => {
  const tempRoot = await makeTempRoot("tokenmart-openclaw-fast-unreachable-");
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceDir = path.join(tempRoot, "workspace");
  const homeDir = path.join(tempRoot, "home");
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });

  const { binPath } = await createFakeOpenClaw(tempRoot);
  const curatedBinDir = await createCuratedBinDir(tempRoot);
  const result = await runInstaller({
    workspaceDir,
    homeDir,
    baseUrl: "http://127.0.0.1:1",
    env: {
      ...process.env,
      PATH: curatedPath(curatedBinDir),
      OPENCLAW_BIN: binPath,
    },
  });

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /Failed to download http:\/\/127\.0\.0\.1:1\/skill\.md/);
});

test("install.sh fails clearly when registration payload is malformed", async (t) => {
  const tempRoot = await makeTempRoot("tokenmart-openclaw-fast-malformed-register-");
  const server = await createFixtureServer({ malformedRegistration: true });
  t.after(async () => {
    await server.close();
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceDir = path.join(tempRoot, "workspace");
  const homeDir = path.join(tempRoot, "home");
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });

  const { binPath } = await createFakeOpenClaw(tempRoot);
  const curatedBinDir = await createCuratedBinDir(tempRoot);
  const result = await runInstaller({
    workspaceDir,
    homeDir,
    baseUrl: server.baseUrl,
    env: {
      ...process.env,
      PATH: curatedPath(curatedBinDir),
      OPENCLAW_BIN: binPath,
    },
  });

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /Registration response did not include identity_file_content/);
  assert.equal(server.registerCalls, 1);
});
