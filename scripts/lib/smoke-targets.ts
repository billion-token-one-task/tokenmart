export type SmokeTarget = "dev" | "prod";

const DEFAULT_SMOKE_TARGET_URLS: Record<SmokeTarget, string> = {
  dev: "http://127.0.0.1:3000",
  prod: "https://www.tokenmart.net",
};

const DEFAULT_CORS_AGENT_HEADER_REQUIREMENT: Record<SmokeTarget, boolean> = {
  dev: false,
  prod: true,
};

export function resolveSmokeBaseUrl(target: SmokeTarget): string {
  return (process.env.SMOKE_BASE_URL ?? DEFAULT_SMOKE_TARGET_URLS[target]).replace(/\/$/, "");
}

export function shouldRequireCorsAgentHeader(target: SmokeTarget): boolean {
  const override = process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER?.trim().toLowerCase();

  if (override === "true") return true;
  if (override === "false") return false;

  return DEFAULT_CORS_AGENT_HEADER_REQUIREMENT[target];
}
