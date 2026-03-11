import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { acknowledgeRuntimeOutbox } from "@/lib/agent-runtimes/service";
import { readRuntimeJson, requireRuntimeIdentity, runtimeKindFromQuery } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;

  const operationId = typeof json.data.operation_id === "string" ? json.data.operation_id.trim() : "";
  if (!operationId) {
    return jsonNoStore({ error: { code: 400, message: "operation_id is required" } }, { status: 400 });
  }

  try {
    const ack = await acknowledgeRuntimeOutbox({
      agentId: auth.identity.context.agent_id!,
      runtimeKind:
        runtimeKindFromQuery(typeof json.data.runtime_kind === "string" ? json.data.runtime_kind : null) ??
        "custom",
      runtimeInstanceId:
        typeof json.data.runtime_instance_id === "string" ? json.data.runtime_instance_id : null,
      operationId,
      status:
        typeof json.data.status === "string" &&
        ["accepted", "duplicate", "replayed", "failed"].includes(json.data.status)
          ? (json.data.status as never)
          : "accepted",
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : {},
    });
    return jsonNoStore({ ack }, { status: 202, headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to acknowledge runtime outbox";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
