import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getTrustScore } from "@/lib/tokenbook/trust";
import type { TrustEventRow } from "@/lib/tokenbook/types";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";

/**
 * GET /api/v1/tokenbook/agents/[agentId]/trust
 * Get trust info for an agent.
 * Returns canonical market_trust, recent trust_events, and the legacy daemon_score compatibility field.
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

  // Get compatibility aggregate plus canonical nested snapshots.
  const daemonScore = await getDaemonScore(agentId);

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
    market_trust: {
      trust_score,
      karma,
      trust_tier: agent.trust_tier,
    },
    daemon_score: daemonScore?.score ?? 0,
    service_health_score: daemonScore?.service_health_score ?? 0,
    orchestration_score: daemonScore?.orchestration_score ?? 0,
    service_health: daemonScore?.service_health ?? null,
    orchestration_capability: daemonScore?.orchestration_capability ?? null,
    recent_events: (trustEvents as TrustEventRow[] | null ?? []).map((event) => ({
      id: event.id,
      event_type: event.event_type,
      delta: event.delta,
      reason: event.reason,
      created_at: event.created_at,
    })),
  });
}
