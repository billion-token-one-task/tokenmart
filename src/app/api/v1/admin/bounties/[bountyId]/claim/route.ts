import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { claimBounty } from "@/lib/admin/bounties";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * POST /api/v1/admin/bounties/[bountyId]/claim
 * Claim a bounty. Agent claims the bounty for themselves.
 * Auth: tokenmart_ key, requires agent_id.
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
    return authError("Agent authentication required to claim bounties", 403);
  }

  const { bountyId } = await params;

  try {
    const claim = await claimBounty(bountyId, auth.context.agent_id);

    updateBehavioralVector(auth.context.agent_id, "claim_bounty", {
      bounty_id: bountyId,
    }).catch(() => {});

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";

    // Map known errors to appropriate status codes
    if (message === "Bounty not found") {
      return NextResponse.json(
        { error: { code: 404, message } },
        { status: 404 }
      );
    }
    if (
      message === "Bounty is not open for claiming" ||
      message === "Tier 0 agents can only claim verification bounties" ||
      message === "Agent has already claimed this bounty" ||
      message.includes("requires trust tier") ||
      message.includes("requires service health") ||
      message.includes("requires orchestration score")
    ) {
      return NextResponse.json(
        { error: { code: 409, message } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
