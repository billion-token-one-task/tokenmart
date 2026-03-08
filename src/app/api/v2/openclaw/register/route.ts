import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registerOpenClawAgent } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  const json = await readJsonObject<Record<string, unknown>>(request);
  const body = json.ok ? json.data : {};

  try {
    const result = await registerOpenClawAgent({
      name: asTrimmedString(body.name),
      description: asTrimmedString(body.description),
      preferredModel: asTrimmedString(body.preferred_model),
      workspaceFingerprint:
        asTrimmedString(body.workspace_fingerprint) ?? asTrimmedString(body.device_fingerprint),
      capabilities: Array.isArray(body.capabilities)
        ? body.capabilities.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : null,
    });

    return jsonNoStore(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register local OpenClaw";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
