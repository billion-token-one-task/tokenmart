import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { processHeartbeat } from "@/lib/heartbeat/nonce-chain";
import { checkKeyRateLimit, rateLimitHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { recordOpenClawBridgePulse } from "@/lib/openclaw/connect";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: "tokenmart",
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("This key is not associated with an agent", 403);
  }

  // Rate limit: max 4 heartbeats per minute (allows some jitter)
  const rl = await checkKeyRateLimit(`heartbeat:${auth.context.agent_id}`, 4);
  if (!rl.allowed) return rateLimitResponse();

  let body: { nonce?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine for first heartbeat
  }

  const result = await processHeartbeat(
    auth.context.agent_id,
    body.nonce ?? null
  );

  const bridgeHeaders = {
    workspaceFingerprint:
      request.headers.get("x-tokenbook-workspace-fingerprint")?.trim() || null,
    profileName: request.headers.get("x-openclaw-profile")?.trim() || null,
    workspacePath: request.headers.get("x-openclaw-workspace-path")?.trim() || null,
    openclawHome: request.headers.get("x-openclaw-home")?.trim() || null,
    openclawVersion: request.headers.get("x-openclaw-version")?.trim() || null,
    bridgeVersion: request.headers.get("x-tokenbook-bridge-version")?.trim() || null,
    cronHealth: request.headers.get("x-tokenbook-cron-health")?.trim() || null,
    hookHealth: request.headers.get("x-tokenbook-hook-health")?.trim() || null,
  };

  const db = createAdminClient();
  const { data: agent } = await db
    .from("agents")
    .select("lifecycle_state")
    .eq("id", auth.context.agent_id)
    .maybeSingle();

  if (agent?.lifecycle_state === "registered_unclaimed") {
    await db
      .from("agents")
      .update({
        lifecycle_state: "connected_unclaimed",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.context.agent_id)
      .eq("lifecycle_state", "registered_unclaimed");
  }

  if (bridgeHeaders.workspaceFingerprint) {
    await recordOpenClawBridgePulse({
      agentId: auth.context.agent_id,
      workspaceFingerprint: bridgeHeaders.workspaceFingerprint,
      profileName: bridgeHeaders.profileName,
      workspacePath: bridgeHeaders.workspacePath,
      openclawHome: bridgeHeaders.openclawHome,
      openclawVersion: bridgeHeaders.openclawVersion,
      bridgeVersion: bridgeHeaders.bridgeVersion,
      cronHealth: bridgeHeaders.cronHealth,
      hookHealth: bridgeHeaders.hookHealth,
    });
  }

  const response = NextResponse.json({
    heartbeat_nonce: result.nonce,
    chain_length: result.chain_length,
    ...(result.micro_challenge
      ? { micro_challenge: result.micro_challenge }
      : {}),
  });

  // Add rate limit headers
  const headers = rateLimitHeaders(rl);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}
