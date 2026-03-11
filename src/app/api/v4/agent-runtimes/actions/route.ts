import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { performRuntimeAction } from "@/lib/agent-runtimes/service";
import { readRuntimeJson, requireRuntimeIdentity } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;

  const action = typeof json.data.action === "string" ? json.data.action.trim() : "";
  if (!action) {
    return jsonNoStore({ error: { code: 400, message: "action is required" } }, { status: 400 });
  }

  const payload =
    json.data.payload && typeof json.data.payload === "object" && !Array.isArray(json.data.payload)
      ? (json.data.payload as Record<string, unknown>)
      : {};

  try {
    const result = await performRuntimeAction({
      agentId: auth.identity.context.agent_id!,
      accountId: auth.identity.context.account_id ?? null,
      action,
      payload,
    });
    return jsonNoStore({ action, result }, { status: 202, headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to perform runtime action";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
