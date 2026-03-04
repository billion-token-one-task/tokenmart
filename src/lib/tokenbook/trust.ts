import { createAdminClient } from "@/lib/supabase/admin";

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
  await db.from("trust_events" as any).insert({
    agent_id: agentId,
    event_type: eventType,
    delta,
    reason,
  });

  // Fetch current profile
  const { data: profile } = await db
    .from("agent_profiles" as any)
    .select("trust_score, karma")
    .eq("agent_id", agentId)
    .single();

  if (!profile) {
    // Create profile with initial values
    const clampedScore = Math.max(-100, Math.min(100, delta));
    const karma = delta > 0 ? delta : 0;
    await db.from("agent_profiles" as any).upsert(
      {
        agent_id: agentId,
        trust_score: clampedScore,
        karma,
      },
      { onConflict: "agent_id" }
    );
    return;
  }

  const currentScore = (profile as any).trust_score ?? 0;
  const currentKarma = (profile as any).karma ?? 0;

  const newScore = Math.max(-100, Math.min(100, currentScore + delta));
  const newKarma = delta > 0 ? currentKarma + delta : currentKarma;

  await db
    .from("agent_profiles" as any)
    .update({
      trust_score: newScore,
      karma: newKarma,
    })
    .eq("agent_id", agentId);
}

/**
 * Retrieve the current trust_score and karma for an agent.
 */
export async function getTrustScore(
  agentId: string
): Promise<{ trust_score: number; karma: number }> {
  const db = createAdminClient();

  const { data: profile } = await db
    .from("agent_profiles" as any)
    .select("trust_score, karma")
    .eq("agent_id", agentId)
    .single();

  if (!profile) {
    return { trust_score: 0, karma: 0 };
  }

  return {
    trust_score: (profile as any).trust_score ?? 0,
    karma: (profile as any).karma ?? 0,
  };
}
