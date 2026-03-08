import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentProfileRow } from "./types";
import { deriveTrustTier } from "@/lib/orchestration/score";

/**
 * Update an agent's trust score by recording a trust event and adjusting
 * the aggregate trust_score and karma on agent_profiles.
 *
 * trust_score is clamped to [-100, 100].
 * Positive deltas also increase karma (karma never decreases).
 */
export async function updateTrustScore(
  agentId: string,
  eventType: string,
  delta: number,
  reason: string
): Promise<void> {
  const db = createAdminClient();

  // Record the trust event
  await db.from("trust_events").insert({
    agent_id: agentId,
    event_type: eventType,
    delta,
    reason,
  });

  // Fetch current profile
  const { data: profile } = await db
    .from("agent_profiles")
    .select("trust_score, karma")
    .eq("agent_id", agentId)
    .single();

  if (!profile) {
    // Create profile with initial values
    const clampedScore = Math.max(-100, Math.min(100, delta));
    const karma = delta > 0 ? delta : 0;
    await db.from("agent_profiles").upsert(
      {
        agent_id: agentId,
        trust_score: clampedScore,
        karma,
      },
      { onConflict: "agent_id" }
    );
    await syncTrustTier(db, agentId, clampedScore);
    return;
  }

  const currentProfile = profile as Pick<AgentProfileRow, "trust_score" | "karma">;
  const currentScore = currentProfile.trust_score ?? 0;
  const currentKarma = currentProfile.karma ?? 0;

  const newScore = Math.max(-100, Math.min(100, currentScore + delta));
  const newKarma = delta > 0 ? currentKarma + delta : currentKarma;

  await db
    .from("agent_profiles")
    .update({
      trust_score: newScore,
      karma: newKarma,
    })
    .eq("agent_id", agentId);
  await syncTrustTier(db, agentId, newScore);
}

/**
 * Retrieve the current trust_score and karma for an agent.
 */
export async function getTrustScore(
  agentId: string
): Promise<{ trust_score: number; karma: number }> {
  const db = createAdminClient();

  const { data: profile } = await db
    .from("agent_profiles")
    .select("trust_score, karma")
    .eq("agent_id", agentId)
    .single();

  if (!profile) {
    return { trust_score: 0, karma: 0 };
  }

  return {
    trust_score: profile.trust_score ?? 0,
    karma: profile.karma ?? 0,
  };
}

async function syncTrustTier(
  db: ReturnType<typeof createAdminClient>,
  agentId: string,
  trustScore: number
) {
  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("service_health_score, orchestration_score, last_chain_length")
    .eq("agent_id", agentId)
    .maybeSingle();

  const nextTier = deriveTrustTier({
    marketTrustScore: trustScore,
    serviceHealthScore: daemonScore?.service_health_score ?? 0,
    orchestrationScore: daemonScore?.orchestration_score ?? 0,
    lastChainLength: daemonScore?.last_chain_length ?? 0,
  });

  await db.from("agents").update({ trust_tier: nextTier }).eq("id", agentId);
}
