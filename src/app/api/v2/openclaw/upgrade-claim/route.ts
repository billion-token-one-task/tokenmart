import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Identity } from "@/lib/v2/auth";
import { upgradeOpenClawClaim } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to upgrade this agent" } },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as { agent_id?: unknown } | null;
  const agentId = typeof body?.agent_id === "string" ? body.agent_id.trim() : "";
  if (!agentId) {
    return jsonNoStore(
      { error: { code: 400, message: "agent_id is required" } },
      { status: 400 },
    );
  }

  try {
    const status = await upgradeOpenClawClaim({
      accountId: auth.identity.context.account_id,
      agentId,
    });

    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upgrade agent";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("another account") || message.includes("current account")
          ? 403
          : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
