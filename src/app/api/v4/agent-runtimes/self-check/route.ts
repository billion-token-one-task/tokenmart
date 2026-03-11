import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { recordRuntimeSelfCheck } from "@/lib/agent-runtimes/service";
import { readRuntimeJson, requireRuntimeIdentity, runtimeKindFromQuery } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;

  try {
    const runtimeKind =
      runtimeKindFromQuery(typeof json.data.runtime_kind === "string" ? json.data.runtime_kind : null) ??
      "custom";
    const result = await recordRuntimeSelfCheck({
      agentId: auth.identity.context.agent_id!,
      runtimeKind,
      runtimeInstanceId:
        typeof json.data.runtime_instance_id === "string" ? json.data.runtime_instance_id : null,
      runtimeVersion:
        typeof json.data.runtime_version === "string" ? json.data.runtime_version : null,
      profileName: typeof json.data.profile_name === "string" ? json.data.profile_name : null,
      workspacePath: typeof json.data.workspace_path === "string" ? json.data.workspace_path : null,
      instanceHome: typeof json.data.instance_home === "string" ? json.data.instance_home : null,
      instanceFingerprint:
        typeof json.data.workspace_or_instance_fingerprint === "string"
          ? json.data.workspace_or_instance_fingerprint
          : null,
      participationProfile:
        typeof json.data.participation_profile === "string"
          ? (json.data.participation_profile as never)
          : null,
      capabilityCard:
        json.data.capability_card &&
        typeof json.data.capability_card === "object" &&
        !Array.isArray(json.data.capability_card)
          ? (json.data.capability_card as Record<string, unknown>)
          : null,
      runtimeOnline: Boolean(json.data.runtime_online),
      runtimeFetchHealth:
        typeof json.data.runtime_fetch_health === "string"
          ? (json.data.runtime_fetch_health as never)
          : "unknown",
      pulseFreshness:
        typeof json.data.pulse_freshness === "string" && json.data.pulse_freshness === "fresh"
          ? "fresh"
          : "stale",
      challengeFreshness:
        typeof json.data.challenge_freshness === "string" && json.data.challenge_freshness === "fresh"
          ? "fresh"
          : "stale",
      manifestDrift: Boolean(json.data.manifest_drift),
      hookHealth: typeof json.data.hook_health === "string" ? json.data.hook_health : null,
      cronHealth: typeof json.data.cron_health === "string" ? json.data.cron_health : null,
      updateStatus:
        typeof json.data.update_status === "string" ? (json.data.update_status as never) : "current",
      updateAvailable: Boolean(json.data.update_available),
      updateRequired: Boolean(json.data.update_required),
      lastUpdateAt: typeof json.data.last_update_at === "string" ? json.data.last_update_at : null,
      lastUpdateError:
        typeof json.data.last_update_error === "string" ? json.data.last_update_error : null,
      outboxState:
        json.data.outbox_state &&
        typeof json.data.outbox_state === "object" &&
        !Array.isArray(json.data.outbox_state)
          ? (json.data.outbox_state as Record<string, unknown>)
          : {},
      localMemoryDigest:
        json.data.local_memory_digest &&
        typeof json.data.local_memory_digest === "object" &&
        !Array.isArray(json.data.local_memory_digest)
          ? (json.data.local_memory_digest as Record<string, unknown>)
          : {},
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : {},
    });
    return jsonNoStore({ runtime: result }, { status: 202, headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record runtime self-check";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
