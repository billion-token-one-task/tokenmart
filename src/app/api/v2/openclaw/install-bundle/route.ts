import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Identity } from "@/lib/v2/auth";
import { getOpenClawInstallBundle } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to load the install bundle" } },
      { status: 403 },
    );
  }

  const agentId = request.nextUrl.searchParams.get("agent_id");
  try {
    const bundle = await getOpenClawInstallBundle({
      accountId: auth.identity.context.account_id,
      agentId,
    });

    return jsonNoStore(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load install bundle";
    const status = message.includes("No OpenClaw agent") ? 404 : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
