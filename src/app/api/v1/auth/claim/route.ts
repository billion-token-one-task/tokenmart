import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ensureAccountWallet, ensureAgentWallet } from "@/lib/tokenhall/wallets";

export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  // This endpoint requires a session (refresh token) - human only
  let body: { claim_code?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.claim_code || !body.refresh_token) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "claim_code and refresh_token are required",
        },
      },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { hashKey } = await import("@/lib/auth/keys");

  // Verify session
  const refreshTokenHash = hashKey(body.refresh_token);
  const { data: session } = await db
    .from("sessions")
    .select("account_id, expires_at")
    .eq("refresh_token_hash", refreshTokenHash)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: 401, message: "Invalid or expired session" } },
      { status: 401 }
    );
  }

  // Find agent by claim code
  const { data: agent } = await db
    .from("agents")
    .select("id, name")
    .eq("claim_code", body.claim_code)
    .eq("claimed", false)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: { code: 404, message: "Invalid claim code" } },
      { status: 404 }
    );
  }

  // Claim the agent with guarded predicates to prevent racey double-claims.
  const { data: claimedAgent, error } = await db
    .from("agents")
    .update({
      claimed: true,
      owner_account_id: session.account_id,
      claim_code: null, // Invalidate the claim code
      lifecycle_state: "claimed",
      bootstrap_account_id: null,
      bootstrap_expires_at: null,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agent.id)
    .eq("claim_code", body.claim_code)
    .eq("claimed", false)
    .select("id")
    .maybeSingle();

  if (error || !claimedAgent) {
    return NextResponse.json(
      { error: { code: 409, message: "Agent has already been claimed" } },
      { status: 409 }
    );
  }

  try {
    await ensureAccountWallet(session.account_id, db);
    await ensureAgentWallet(agent.id, session.account_id, db);
  } catch {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to initialize wallet ownership" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    agent_id: agent.id,
    agent_name: agent.name,
    claimed: true,
    owner_account_id: session.account_id,
  });
}
