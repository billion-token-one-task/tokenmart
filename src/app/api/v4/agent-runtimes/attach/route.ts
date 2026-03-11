import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { attachAgentRuntime } from "@/lib/agent-runtimes/service";
import type { RuntimeCapabilityCard, RuntimeKind } from "@/lib/agent-runtimes/types";
import { readRuntimeJson } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildCapabilityCard(
  runtimeKind: RuntimeKind,
  value: unknown,
): RuntimeCapabilityCard | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const toStrings = (input: unknown) =>
    Array.isArray(input) ? input.filter((entry): entry is string => typeof entry === "string") : [];
  return {
    runtime_kind: runtimeKind,
    supports_public_writes:
      typeof raw.supports_public_writes === "boolean" ? raw.supports_public_writes : true,
    supports_delta_sync:
      typeof raw.supports_delta_sync === "boolean" ? raw.supports_delta_sync : true,
    supports_outbox_replay:
      typeof raw.supports_outbox_replay === "boolean" ? raw.supports_outbox_replay : true,
    supports_self_update:
      typeof raw.supports_self_update === "boolean" ? raw.supports_self_update : true,
    supports_claim_later:
      typeof raw.supports_claim_later === "boolean" ? raw.supports_claim_later : true,
    collaboration_verbs: toStrings(raw.collaboration_verbs),
    adapters: toStrings(raw.adapters),
    domains: toStrings(raw.domains),
    tools: toStrings(raw.tools),
    languages: toStrings(raw.languages),
    metadata:
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : {},
  };
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;

  const fingerprint =
    typeof json.data.workspace_or_instance_fingerprint === "string"
      ? json.data.workspace_or_instance_fingerprint.trim()
      : "";
  if (!fingerprint) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message: "workspace_or_instance_fingerprint is required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const runtimeKind =
      typeof json.data.runtime_kind === "string" ? (json.data.runtime_kind as RuntimeKind) : "custom";
    const result = await attachAgentRuntime({
      runtime_kind: runtimeKind,
      runtime_version:
        typeof json.data.runtime_version === "string" ? json.data.runtime_version : null,
      runtime_instance_id:
        typeof json.data.runtime_instance_id === "string" ? json.data.runtime_instance_id : null,
      workspace_or_instance_fingerprint: fingerprint,
      name: typeof json.data.name === "string" ? json.data.name : null,
      description: typeof json.data.description === "string" ? json.data.description : null,
      profile_name: typeof json.data.profile_name === "string" ? json.data.profile_name : null,
      workspace_path: typeof json.data.workspace_path === "string" ? json.data.workspace_path : null,
      instance_home: typeof json.data.instance_home === "string" ? json.data.instance_home : null,
      platform: typeof json.data.platform === "string" ? json.data.platform : null,
      preferred_model: typeof json.data.preferred_model === "string" ? json.data.preferred_model : null,
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : null,
      existing_agent_id:
        typeof json.data.existing_agent_id === "string" ? json.data.existing_agent_id : null,
      existing_api_key:
        typeof json.data.existing_api_key === "string" ? json.data.existing_api_key : null,
      existing_claim_code:
        typeof json.data.existing_claim_code === "string" ? json.data.existing_claim_code : null,
      existing_claim_url:
        typeof json.data.existing_claim_url === "string" ? json.data.existing_claim_url : null,
      participation_profile:
        typeof json.data.participation_profile === "string"
          ? (json.data.participation_profile as never)
          : null,
      duty_mode:
        typeof json.data.duty_mode === "string" ? (json.data.duty_mode as never) : null,
      capability_card: buildCapabilityCard(runtimeKind, json.data.capability_card),
    });
    return jsonNoStore(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to attach runtime";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
