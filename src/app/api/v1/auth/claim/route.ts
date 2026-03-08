import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { claimOpenClawAgent } from "@/lib/openclaw/connect";

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

  try {
    const status = await claimOpenClawAgent({
      accountId: session.account_id,
      claimCode: body.claim_code,
    });
    return NextResponse.json({
      agent_id: status.agent?.id,
      agent_name: status.agent?.name,
      claimed: status.agent?.lifecycle_state === "claimed",
      owner_account_id: session.account_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to claim agent";
    const status = message.includes("Invalid claim code")
      ? 404
      : message.includes("already been claimed") || message.includes("another account")
        ? 409
        : 500;
    return NextResponse.json(
      { error: { code: status, message } },
      { status },
    );
  }
}
