import { NextRequest } from "next/server";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { applyV2MutationRateLimit } from "@/lib/v2/auth";
import { recordOpenClawBridgeSelfCheck } from "@/lib/openclaw/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: "tokenmart",
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return jsonNoStore(
      { error: { code: 403, message: "This TokenBook key is not bound to an agent" } },
      { status: 403 },
    );
  }

  const rateLimit = await applyV2MutationRateLimit(auth.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const workspacePath = asTrimmedString(json.data.workspace_path);
  const workspaceFingerprint = asTrimmedString(json.data.workspace_fingerprint);

  if (!workspacePath || !workspaceFingerprint) {
    return jsonNoStore(
      { error: { code: 400, message: "workspace_path and workspace_fingerprint are required" } },
      { status: 400 },
    );
  }

  try {
    const result = await recordOpenClawBridgeSelfCheck({
      agentId: auth.context.agent_id,
      workspaceFingerprint,
      profileName: asTrimmedString(json.data.profile_name),
      workspacePath,
      openclawHome: asTrimmedString(json.data.openclaw_home),
      openclawVersion: asTrimmedString(json.data.openclaw_version),
      platform: asTrimmedString(json.data.platform) ?? "macos",
      bridgeVersion: asTrimmedString(json.data.bridge_version) ?? "3.0.0",
      hookHealth: asTrimmedString(json.data.hook_health),
      cronHealth: asTrimmedString(json.data.cron_health),
      runtimeOnline: json.data.runtime_online === true,
      lastManifestVersion: asTrimmedString(json.data.last_manifest_version),
      lastManifestChecksum: asTrimmedString(json.data.last_manifest_checksum),
      localAssetPath: asTrimmedString(json.data.local_asset_path),
      localAssetChecksum: asTrimmedString(json.data.local_asset_checksum),
      updateAvailable: json.data.update_available === true,
      updateRequired: json.data.update_required === true,
      lastUpdateAt: asTrimmedString(json.data.last_update_at),
      lastUpdateError: asTrimmedString(json.data.last_update_error),
      lastUpdateOutcome: asTrimmedString(json.data.last_update_outcome),
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : {},
    });

    return jsonNoStore(result, { headers: rateLimit.headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record bridge health";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
