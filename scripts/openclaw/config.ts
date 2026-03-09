import { existsSync, readFileSync } from "node:fs";
import { resolveSmokeBaseUrl } from "../lib/smoke-targets";

export type OpenClawScenario =
  | "fresh_install"
  | "wipe_and_reinstall_same_fingerprint"
  | "wipe_and_reinstall_new_fingerprint"
  | "gateway_wake"
  | "strict_provider_turn";

export type OpenClawServerMode = "auto" | "reuse" | "spawn-dev" | "spawn-start";
export type OpenClawKeepArtifacts = "fail" | "always" | "never";

export interface OpenClawSuiteConfig {
  baseUrl: string;
  cliVersion: string;
  serverMode: OpenClawServerMode;
  keepArtifacts: OpenClawKeepArtifacts;
  requireTurnSuccess: boolean;
  logProgress: boolean;
  scenarios: OpenClawScenario[];
}

const VALID_SCENARIOS: OpenClawScenario[] = [
  "fresh_install",
  "wipe_and_reinstall_same_fingerprint",
  "wipe_and_reinstall_new_fingerprint",
  "gateway_wake",
  "strict_provider_turn",
];

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function parseBoolean(value: string | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return (allowed as readonly string[]).includes(trimmed) ? (trimmed as T) : fallback;
}

function parseScenarios(values: string[]) {
  const requested = values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (requested.length === 0) return ["gateway_wake"] satisfies OpenClawScenario[];

  return requested.map((value) => {
    if ((VALID_SCENARIOS as readonly string[]).includes(value)) {
      return value as OpenClawScenario;
    }
    throw new Error(`Unsupported OpenClaw scenario: ${value}`);
  });
}

function parseCliScenarioArgs(args: string[]) {
  const scenarios: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value) continue;

    if (value === "--scenario" || value === "-s") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`${value} requires a scenario name`);
      }
      scenarios.push(next);
      index += 1;
      continue;
    }

    if (value.startsWith("--scenario=")) {
      scenarios.push(value.slice("--scenario=".length));
      continue;
    }

    if (value === "--scenarios") {
      const next = args[index + 1];
      if (!next) {
        throw new Error("--scenarios requires a comma-separated list");
      }
      scenarios.push(next);
      index += 1;
      continue;
    }

    if (value.startsWith("--scenarios=")) {
      scenarios.push(value.slice("--scenarios=".length));
      continue;
    }

    scenarios.push(value);
  }

  return scenarios;
}

export function loadDotEnv() {
  for (const envFile of [".env.local", ".env"]) {
    if (!existsSync(envFile)) continue;
    const text = readFileSync(envFile, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
      if (!match) continue;
      if (process.env[match[1]] == null) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

export function loadOpenClawSuiteConfig(cliScenarios: string[] = []): OpenClawSuiteConfig {
  loadDotEnv();

  const parsedCliScenarios = parseCliScenarioArgs(cliScenarios);

  const scenarios = parseScenarios([
    ...(process.env.OPENCLAW_TEST_SCENARIOS ? [process.env.OPENCLAW_TEST_SCENARIOS] : []),
    ...parsedCliScenarios,
  ]);

  const keepArtifactsFromLegacy = parseBoolean(process.env.SMOKE_KEEP_TMP);
  const keepArtifacts = parseEnum<OpenClawKeepArtifacts>(
    process.env.OPENCLAW_TEST_KEEP_ARTIFACTS,
    ["fail", "always", "never"],
    keepArtifactsFromLegacy === true ? "always" : "fail",
  );

  const requireTurnSuccess =
    parseBoolean(process.env.OPENCLAW_TEST_REQUIRE_TURN_SUCCESS) ??
    parseBoolean(process.env.SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS) ??
    false;

  const baseUrl = normalizeUrl(
    process.env.OPENCLAW_TEST_BASE_URL ??
      process.env.SMOKE_BASE_URL ??
      resolveSmokeBaseUrl("dev"),
  );

  return {
    baseUrl,
    cliVersion: process.env.OPENCLAW_TEST_CLI_VERSION?.trim() || "latest",
    serverMode: parseEnum<OpenClawServerMode>(
      process.env.OPENCLAW_TEST_SERVER_MODE,
      ["auto", "reuse", "spawn-dev", "spawn-start"],
      "auto",
    ),
    keepArtifacts,
    requireTurnSuccess,
    logProgress: parseBoolean(process.env.SMOKE_VERBOSE) !== false,
    scenarios,
  };
}

export const OPENCLAW_SCENARIOS = VALID_SCENARIOS;
