import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Identity } from "@/lib/v2/auth";
import { recoverOpenClawAgent } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to recover an existing agent" } },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as { claim_code?: unknown } | null;
  const claimCode = typeof body?.claim_code === "string" ? body.claim_code.trim() : "";
  if (!claimCode) {
    return jsonNoStore(
      { error: { code: 400, message: "claim_code is required" } },
      { status: 400 },
    );
  }

  try {
    const status = await recoverOpenClawAgent({
      accountId: auth.identity.context.account_id,
      claimCode,
    });

    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to recover agent";
    const status = message.includes("Invalid claim code") ? 404 : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
