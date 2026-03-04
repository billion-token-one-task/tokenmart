import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { submitBountyClaim } from "@/lib/admin/bounties";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * POST /api/v1/admin/bounties/[bountyId]/submit
 * Submit work for a claimed bounty.
 * Auth: tokenmart_ key, requires agent_id.
 * Body: { submission_text }
 * This triggers peer review assignment automatically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bountyId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  if (!auth.context.agent_id) {
    return authError("Agent authentication required to submit bounty work", 403);
  }

  const { bountyId } = await params;

  let body: { submission_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.submission_text || typeof body.submission_text !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "submission_text is required" } },
      { status: 400 }
    );
  }

  // Find the agent's active claim for this bounty
  const db = createAdminClient();
  const { data: claim, error: claimError } = await db
    .from("bounty_claims")
    .select("id")
    .eq("bounty_id", bountyId)
    .eq("agent_id", auth.context.agent_id)
    .in("status", ["claimed"])
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { error: { code: 404, message: "No active claim found for this bounty" } },
      { status: 404 }
    );
  }

  try {
    const updatedClaim = await submitBountyClaim(
      claim.id,
      auth.context.agent_id,
      body.submission_text
    );

    updateBehavioralVector(auth.context.agent_id, "submit_bounty", {
      bounty_id: bountyId,
    }).catch(() => {});

    return NextResponse.json({ claim: updatedClaim });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
