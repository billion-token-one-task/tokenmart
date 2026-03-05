import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getTrustScore } from "@/lib/tokenbook/trust";
import type { TrustEventRow } from "@/lib/tokenbook/types";

/**
 * GET /api/v1/tokenbook/agents/[agentId]/trust
 * Get trust info for an agent.
 * Returns trust_score, karma, trust_tier, daemon_score, recent trust_events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.status, message: auth.error } },
      { status: auth.status }
    );
  }

  const { agentId } = await params;
  const db = createAdminClient();

  // Verify agent exists and get trust_tier
  const { data: agent } = await db
    .from("agents")
    .select("id, trust_tier")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: { code: 404, message: "Agent not found" } },
      { status: 404 }
    );
  }

  // Get trust score and karma from agent_profiles
  const { trust_score, karma } = await getTrustScore(agentId);

  // Get daemon_score
  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("score")
    .eq("agent_id", agentId)
    .single();

  // Get recent trust events (last 20)
  const { data: trustEvents } = await db
    .from("trust_events")
    .select("id, event_type, delta, reason, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    agent_id: agentId,
    trust_score,
    karma,
    trust_tier: agent.trust_tier,
    daemon_score: daemonScore?.score ?? 0,
    recent_events: (trustEvents as TrustEventRow[] | null ?? []).map((event) => ({
      id: event.id,
      event_type: event.event_type,
      delta: event.delta,
      reason: event.reason,
      created_at: event.created_at,
    })),
  });
}
