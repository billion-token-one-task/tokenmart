import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { rekeyOpenClawAgent } from "@/lib/openclaw/connect";
import { applyV2MutationRateLimit, requireV2Identity } from "@/lib/v2/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to rekey an OpenClaw agent" } },
      { status: 403 },
    );
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const agentId = asTrimmedString(json.data.agent_id);
  if (!agentId) {
    return jsonNoStore(
      { error: { code: 400, message: "agent_id is required" } },
      { status: 400 },
    );
  }

  try {
    return jsonNoStore(
      await rekeyOpenClawAgent({
        accountId: auth.identity.context.account_id,
        agentId,
      }),
      { headers: rateLimit.headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rekey OpenClaw agent";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("claimed owner")
          ? 403
          : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
