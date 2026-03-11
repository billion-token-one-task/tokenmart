import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { rekeyRuntimeAgent } from "@/lib/agent-runtimes/service";
import { requireRuntimeIdentity, readRuntimeJson } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request);
  if (!auth.ok) return auth.response;
  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to rekey a runtime agent." } },
      { status: 403 },
    );
  }
  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;
  const agentId = typeof json.data.agent_id === "string" ? json.data.agent_id.trim() : "";
  if (!agentId) {
    return jsonNoStore({ error: { code: 400, message: "agent_id is required" } }, { status: 400 });
  }
  try {
    const bundle = await rekeyRuntimeAgent({ accountId: auth.identity.context.account_id, agentId });
    return jsonNoStore(bundle, { headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rekey runtime agent";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
