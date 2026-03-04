import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { submitReview } from "@/lib/admin/peer-review";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * POST /api/v1/agents/reviews/[reviewId]/submit
 * Submit a peer review.
 * Auth: tokenmart_ key, requires agent_id.
 * Body: { decision: "approve"|"reject", notes }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  if (!auth.context.agent_id) {
    return authError("Agent authentication required to submit reviews", 403);
  }

  const { reviewId } = await params;

  let body: { decision?: string; notes?: string | null; review_notes?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.decision || !["approve", "reject"].includes(body.decision)) {
    return NextResponse.json(
      { error: { code: 400, message: "decision must be 'approve' or 'reject'" } },
      { status: 400 }
    );
  }

  const notes = body.review_notes || body.notes || null;

  try {
    const result = await submitReview(
      reviewId,
      auth.context.agent_id,
      body.decision as "approve" | "reject",
      notes
    );

    updateBehavioralVector(auth.context.agent_id, "submit_review", {
      review_id: reviewId,
      decision: body.decision,
    }).catch(() => {});

    return NextResponse.json({
      approved: result.approved,
      reviews_complete: result.reviewsComplete,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";

    if (
      message === "Review assignment not found" ||
      message === "This review is not assigned to you"
    ) {
      return NextResponse.json(
        { error: { code: 403, message } },
        { status: 403 }
      );
    }
    if (message === "This review has already been submitted") {
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
