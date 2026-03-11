import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination, readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Identity,
  resolveOptionalV2Identity,
  type V2Identity,
} from "@/lib/v2/auth";
import type { RuntimeKind } from "@/lib/agent-runtimes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function requireRuntimeIdentity(
  request: NextRequest,
  options?: { requireAgent?: boolean },
) {
  const auth = await requireV2Identity(request, { requireAgent: options?.requireAgent });
  if (!auth.ok) return auth;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return { ok: false as const, response: rateLimit.response };
  return { ok: true as const, identity: auth.identity, rateLimitHeaders: rateLimit.headers };
}

export async function resolveRuntimeIdentity(request: NextRequest) {
  return resolveOptionalV2Identity(request);
}

export async function readRuntimeJson(request: NextRequest) {
  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return {
      ok: false as const,
      response: jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 }),
    };
  }
  return { ok: true as const, data: json.data };
}

export function runtimeKindFromQuery(value: string | null | undefined): RuntimeKind | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  switch (normalized) {
    case "openclaw":
      return "openclaw";
    case "kimi_claw":
    case "kimi-claw":
    case "kimi":
      return "kimi_claw";
    case "maxclaw":
    case "max-claw":
      return "maxclaw";
    case "manus":
    case "manus_ai":
    case "manus-ai":
      return "manus";
    case "mcp":
      return "mcp";
    case "a2a":
      return "a2a";
    case "sdk_ts":
    case "sdk_typescript":
    case "typescript":
    case "ts":
      return "sdk_typescript";
    case "sdk_python":
    case "python":
    case "py":
      return "sdk_python";
    case "sidecar":
      return "sidecar";
    case "langgraph":
      return "langgraph";
    case "crewai":
      return "crewai";
    case "google_adk":
    case "google-adk":
    case "adk":
      return "google_adk";
    case "anthropic_agent_sdk":
    case "anthropic-agent-sdk":
    case "anthropic_sdk":
      return "anthropic_agent_sdk";
    case "agent_framework":
    case "microsoft_agent_framework":
    case "microsoft-agent-framework":
      return "microsoft_agent_framework";
    case "bedrock_agentcore":
    case "bedrock-agentcore":
      return "bedrock_agentcore";
    case "openai_background":
    case "openai-background":
      return "openai_background";
    case "browser_operator":
    case "browser-operator":
      return "browser_operator";
    case "claude_code":
    case "claude-code":
      return "claude_code";
    case "custom":
      return "custom";
    default:
      return "custom";
  }
}

export function runtimeIdentityToAgentId(identity: V2Identity | null) {
  return identity?.context.agent_id ?? null;
}

export function parseRuntimePagination(request: NextRequest) {
  const url = new URL(request.url);
  return parsePagination(url.searchParams, { defaultLimit: 50, maxLimit: 200 });
}
