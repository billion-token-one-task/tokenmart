import { createAdminClient } from "@/lib/supabase/admin";
import { generateNonce } from "@/lib/auth/keys";

export interface HeartbeatResult {
  nonce: string;
  chain_length: number;
  micro_challenge?: {
    callback_url: string;
    deadline_seconds: number;
  };
}

/**
 * Process a heartbeat from an agent.
 * Validates the nonce chain and returns a new nonce.
 * Optionally includes a micro-challenge (1 in 10 chance).
 */
export async function processHeartbeat(
  agentId: string,
  providedNonce: string | null
): Promise<HeartbeatResult> {
  const db = createAdminClient();
  const newNonce = generateNonce();

  // Get the last heartbeat for this agent
  const { data: lastHeartbeat } = await db
    .from("heartbeats")
    .select("nonce, chain_length")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  let chainLength = 1;

  if (lastHeartbeat && providedNonce) {
    // Validate the nonce chain: provided nonce must match last heartbeat's nonce
    if (providedNonce === lastHeartbeat.nonce) {
      chainLength = lastHeartbeat.chain_length + 1;
    }
    // If nonce doesn't match, chain resets to 1 (no penalty, just reset)
  }
  // If no last heartbeat or no provided nonce, chain starts at 1

  // Record the heartbeat
  await db.from("heartbeats").insert({
    agent_id: agentId,
    nonce: newNonce,
    prev_nonce: providedNonce,
    chain_length: chainLength,
  });

  // Update daemon score's chain length
  await db
    .from("daemon_scores")
    .upsert(
      {
        agent_id: agentId,
        last_chain_length: chainLength,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" }
    );

  // Update agent's trust tier based on chain length
  await updateTrustTierFromChain(db, agentId, chainLength);

  const result: HeartbeatResult = {
    nonce: newNonce,
    chain_length: chainLength,
  };

  // 1 in 10 chance of micro-challenge
  if (Math.random() < 0.1) {
    const challenge = await issueMicroChallenge(agentId);
    if (challenge) {
      result.micro_challenge = challenge;
    }
  }

  return result;
}

async function issueMicroChallenge(
  agentId: string
): Promise<{ callback_url: string; deadline_seconds: number } | null> {
  const db = createAdminClient();
  const { generateChallengeId } = await import("@/lib/auth/keys");
  const challengeId = generateChallengeId();
  const deadlineSeconds = 10;

  await db.from("micro_challenges").insert({
    agent_id: agentId,
    challenge_id: challengeId,
    deadline_seconds: deadlineSeconds,
  });

  return {
    callback_url: `/api/v1/agents/ping/${challengeId}`,
    deadline_seconds: deadlineSeconds,
  };
}

async function updateTrustTierFromChain(
  db: ReturnType<typeof createAdminClient>,
  agentId: string,
  chainLength: number
) {
  // Only update tier based on chain length component
  // Full tier calculation also considers daemon score and karma
  // but chain length thresholds are: 48 (24h), 336 (7d), 1440 (30d)
  const { data: agent } = await db
    .from("agents")
    .select("trust_tier")
    .eq("id", agentId)
    .single();

  if (!agent) return;

  // Don't downgrade tier based on chain length alone
  let minTier = agent.trust_tier;

  // Chain length only contributes to tier eligibility, doesn't directly set it
  // The full daemon score computation handles tier setting
  // But we ensure chain length of 48+ at least qualifies for tier 1
  if (chainLength >= 48 && minTier < 1) {
    await db.from("agents").update({ trust_tier: 1 }).eq("id", agentId);
  }
}

/**
 * Handle a micro-challenge response (ping callback).
 */
export async function respondToMicroChallenge(
  challengeId: string,
  agentId: string
): Promise<{ success: boolean; latency_ms: number | null }> {
  const db = createAdminClient();

  const { data: challenge } = await db
    .from("micro_challenges")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("agent_id", agentId)
    .is("responded_at", null)
    .single();

  if (!challenge) {
    return { success: false, latency_ms: null };
  }

  const issuedAt = new Date(challenge.issued_at).getTime();
  const now = Date.now();
  const latencyMs = now - issuedAt;
  const deadlineMs = challenge.deadline_seconds * 1000;

  const withinDeadline = latencyMs <= deadlineMs;

  await db
    .from("micro_challenges")
    .update({
      responded_at: new Date().toISOString(),
      latency_ms: latencyMs,
    })
    .eq("id", challenge.id);

  return { success: withinDeadline, latency_ms: latencyMs };
}
