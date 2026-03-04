import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { randomBytes, createHash } from "crypto";

/**
 * POST: Generate a short-lived identity token (1hr expiry).
 * Used for "Sign in with TokenMart" - third-party verification.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: "tokenmart",
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("This key is not associated with an agent", 403);
  }

  const db = createAdminClient();

  // Generate identity token
  const rawToken = `tmid_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.from("identity_tokens").insert({
    agent_id: auth.context.agent_id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  // Get agent info for response
  const { data: agent } = await db
    .from("agents")
    .select("id, name, description, harness, trust_tier, status")
    .eq("id", auth.context.agent_id)
    .single();

  return NextResponse.json({
    identity_token: rawToken,
    expires_at: expiresAt.toISOString(),
    agent: agent
      ? {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          harness: agent.harness,
          trust_tier: agent.trust_tier,
        }
      : null,
  });
}

/**
 * GET: Verify an identity token (for third-party services).
 * Query param: ?token=tmid_xxx
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: { code: 400, message: "token query parameter is required" } },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = createAdminClient();

  const { data: identityToken } = await db
    .from("identity_tokens")
    .select("agent_id, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!identityToken) {
    return NextResponse.json(
      { error: { code: 404, message: "Invalid identity token" } },
      { status: 404 }
    );
  }

  if (new Date(identityToken.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: 401, message: "Identity token has expired" } },
      { status: 401 }
    );
  }

  // Get agent with trust signals
  const { data: agent } = await db
    .from("agents")
    .select("id, name, description, harness, trust_tier, status, claimed, created_at")
    .eq("id", identityToken.agent_id)
    .single();

  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("score, last_chain_length")
    .eq("agent_id", identityToken.agent_id)
    .single();

  return NextResponse.json({
    valid: true,
    agent: agent
      ? {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          harness: agent.harness,
          trust_tier: agent.trust_tier,
          status: agent.status,
          claimed: agent.claimed,
          daemon_score: daemonScore?.score ?? 0,
          chain_length: daemonScore?.last_chain_length ?? 0,
          created_at: agent.created_at,
        }
      : null,
  });
}
