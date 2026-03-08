import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { getOpenClawClaimStatus } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const claimCode = request.nextUrl.searchParams.get("claim_code")?.trim() || "";
  if (!claimCode) {
    return jsonNoStore(
      { error: { code: 400, message: "claim_code is required" } },
      { status: 400 },
    );
  }

  try {
    return jsonNoStore(await getOpenClawClaimStatus({ claimCode }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to inspect claim status";
    const status = message.includes("Invalid claim code") ? 404 : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
