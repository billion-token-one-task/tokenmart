import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getOpenClawBridgeManifest } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  return jsonNoStore(getOpenClawBridgeManifest());
}
