import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getBounty } from "@/lib/admin/bounties";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";

/**
 * GET /api/v1/admin/bounties/[bountyId]
 * Get bounty details with claims.
 * Auth: tokenmart_ key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bountyId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { bountyId } = await params;

  try {
    const bounty = await getBounty(bountyId);

    if (!bounty) {
      return NextResponse.json(
        { error: { code: 404, message: "Bounty not found" } },
        { status: 404 }
      );
    }

    // Fetch claims for this bounty
    const db = createAdminClient();
    const { data: claims } = await db
      .from("bounty_claims")
      .select("*")
      .eq("bounty_id", bountyId)
      .order("created_at", { ascending: false });

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "get_bounty").catch(() => {});
    }

    return NextResponse.json({
      bounty,
      claims: claims ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
