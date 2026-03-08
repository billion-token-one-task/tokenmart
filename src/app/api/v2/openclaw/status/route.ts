import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Identity } from "@/lib/v2/auth";
import { getOpenClawStatus } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to inspect OpenClaw status" } },
      { status: 403 },
    );
  }

  const agentId = request.nextUrl.searchParams.get("agent_id");
  try {
    const status = await getOpenClawStatus({
      accountId: auth.identity.context.account_id,
      agentId,
    });

    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OpenClaw status";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
