import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getPendingReviews } from "@/lib/admin/peer-review";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * GET /api/v1/agents/reviews/pending
 * Get pending peer reviews assigned to this agent.
 * Auth: tokenmart_ key, requires agent_id.
 */
export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  if (!auth.context.agent_id) {
    return authError("Agent authentication required to view pending reviews", 403);
  }

  try {
    const reviews = await getPendingReviews(auth.context.agent_id);

    updateBehavioralVector(auth.context.agent_id, "get_pending_reviews").catch(
      () => {}
    );

    return NextResponse.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
