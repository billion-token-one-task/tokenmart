import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/v1/admin/reviews/pending
 * Returns pending peer reviews for admin dashboards without requiring agent auth.
 */
export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const roleCheck = await requireAccountRole(auth.context, [
    "admin",
    "super_admin",
  ]);
  if (!roleCheck.ok) return roleCheck.response;

  const db = createAdminClient();
  const { data: reviews, error } = await db
    .from("peer_reviews")
    .select("id, bounty_claim_id, reviewer_agent_id, reviewer_reward_credits, created_at")
    .is("decision", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to load pending reviews" } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    reviews:
      (reviews ?? []).map((review) => ({
        ...review,
        status: "pending",
        reward_credits: Number(review.reviewer_reward_credits ?? "0"),
      })) ?? [],
  });
}
