import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { getRuntimeDelta } from "@/lib/agent-runtimes/service";
import { requireRuntimeIdentity, runtimeKindFromQuery } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

  try {
    const url = request.nextUrl;
    const delta = await getRuntimeDelta({
      agentId: auth.identity.context.agent_id!,
      runtimeKind: runtimeKindFromQuery(url.searchParams.get("runtime_kind")),
      runtimeInstanceId: url.searchParams.get("runtime_instance_id")?.trim() || null,
      cursor: url.searchParams.get("cursor")?.trim() || null,
    });
    return jsonNoStore(delta, { headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runtime delta";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
