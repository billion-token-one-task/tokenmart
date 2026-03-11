import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { getRuntimeClaimStatus } from "@/lib/agent-runtimes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const claimCode = request.nextUrl.searchParams.get("claim_code")?.trim();
  if (!claimCode) {
    return jsonNoStore({ error: { code: 400, message: "claim_code is required" } }, { status: 400 });
  }
  try {
    const status = await getRuntimeClaimStatus({ claimCode });
    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load claim status";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
