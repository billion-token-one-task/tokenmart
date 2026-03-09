import { NextRequest } from "next/server";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { attachOpenClawBridge } from "@/lib/openclaw/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  let authenticatedAgentId: string | null = null;
  if (request.headers.get("authorization")) {
    const auth = await authenticateRequest(request, { requiredType: "tokenmart" });
    if (!auth.success) return authError(auth.error, auth.status);
    authenticatedAgentId = auth.context.agent_id ?? null;
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const workspacePath = asTrimmedString(json.data.workspace_path);
  const workspaceFingerprint = asTrimmedString(json.data.workspace_fingerprint);

  if (!workspacePath || !workspaceFingerprint) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message: "workspace_path and workspace_fingerprint are required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await attachOpenClawBridge({
      name: asTrimmedString(json.data.name),
      description: asTrimmedString(json.data.description),
      preferredModel: asTrimmedString(json.data.preferred_model),
      workspacePath,
      workspaceFingerprint,
      profileName: asTrimmedString(json.data.profile_name),
      openclawHome: asTrimmedString(json.data.openclaw_home),
      openclawVersion: asTrimmedString(json.data.openclaw_version),
      platform: asTrimmedString(json.data.platform),
      bridgeVersion: asTrimmedString(json.data.bridge_version),
      hookHealth: asTrimmedString(json.data.hook_health),
      cronHealth: asTrimmedString(json.data.cron_health),
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : null,
      existingAgentId: authenticatedAgentId ?? asTrimmedString(json.data.agent_id),
      existingApiKey: authenticatedAgentId ? null : asTrimmedString(json.data.api_key),
      existingClaimCode: asTrimmedString(json.data.claim_code),
      existingClaimUrl: asTrimmedString(json.data.claim_url),
    });

    return jsonNoStore(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to attach the TokenBook bridge";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
