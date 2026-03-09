import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readOpenClawSandboxRunDetail } from "@/lib/openclaw/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  try {
    const { runId } = await context.params;
    const run = await readOpenClawSandboxRunDetail(runId);
    if (!run) {
      return jsonNoStore(
        { error: { code: 404, message: `No OpenClaw sandbox run exists for ${runId}` } },
        { status: 404 },
      );
    }
    return jsonNoStore(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OpenClaw sandbox run";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
