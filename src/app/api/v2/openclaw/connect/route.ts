import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Identity } from "@/lib/v2/auth";
import { connectOpenClawForAccount } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to connect OpenClaw" } },
      { status: 403 },
    );
  }

  try {
    const result = await connectOpenClawForAccount({
      accountId: auth.identity.context.account_id,
    });

    return jsonNoStore(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect OpenClaw";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
