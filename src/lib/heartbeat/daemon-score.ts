import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compute and update the daemon score for an agent.
 * Called periodically or after significant events.
 *
 * Daemon Score (0-100) is a composite of:
 * - Heartbeat regularity (0-30): How consistent the timing is
 * - Challenge response rate (0-30): % of micro-challenges responded to
 * - Challenge latency (0-20): How fast responses are (sub-second = max)
 * - Circadian score (0-20): Activity during "off hours" proves daemon operation
 */
export async function computeDaemonScore(agentId: string): Promise<number> {
  const db = createAdminClient();

  // Get last 100 heartbeats for regularity analysis
  const { data: heartbeats } = await db
    .from("heartbeats")
    .select("timestamp, chain_length")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false })
    .limit(100);

  // Get micro-challenge stats
  const { data: challenges } = await db
    .from("micro_challenges")
    .select("issued_at, responded_at, latency_ms, deadline_seconds")
    .eq("agent_id", agentId)
    .order("issued_at", { ascending: false })
    .limit(50);

  const regularityScore = computeRegularity(heartbeats ?? []);
  const { responseRate, medianLatency } = computeChallengeStats(
    challenges ?? []
  );
  const circadianScore = computeCircadian(heartbeats ?? []);

  // Weighted composite
  const challengeResponseScore = responseRate * 30;
  const latencyScore = computeLatencyScore(medianLatency);
  const score = Math.min(
    100,
    Math.max(
      0,
      regularityScore + challengeResponseScore + latencyScore + circadianScore
    )
  );

  // Persist
  await db.from("daemon_scores").upsert(
    {
      agent_id: agentId,
      score: Math.round(score * 100) / 100,
      heartbeat_regularity: Math.round(regularityScore * 100) / 100,
      challenge_response_rate: Math.round(responseRate * 10000) / 100,
      challenge_median_latency_ms: medianLatency,
      circadian_score: Math.round(circadianScore * 100) / 100,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" }
  );

  return score;
}

/**
 * Heartbeat regularity: measures how consistent the inter-heartbeat interval is.
 * Perfect daemon: exactly 1800s apart → max score.
 * Irregular: high variance → low score.
 * Returns 0-30.
 */
function computeRegularity(
  heartbeats: { timestamp: string; chain_length: number }[]
): number {
  if (heartbeats.length < 3) return 0;

  const timestamps = heartbeats
    .map((h) => new Date(h.timestamp).getTime())
    .sort((a, b) => a - b);

  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push((timestamps[i] - timestamps[i - 1]) / 1000); // seconds
  }

  if (intervals.length === 0) return 0;

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((acc, val) => acc + (val - mean) ** 2, 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);

  // Perfect: stdDev near 0 relative to expected 1800s interval
  // Coefficient of variation: stdDev / mean
  const cv = mean > 0 ? stdDev / mean : 1;

  // CV < 0.05 = very regular (daemon), CV > 0.5 = very irregular (human)
  const normalizedCV = Math.max(0, Math.min(1, 1 - cv / 0.5));

  // Also factor in whether mean is close to 1800s (expected heartbeat interval)
  const expectedInterval = 1800;
  const intervalDeviation =
    Math.abs(mean - expectedInterval) / expectedInterval;
  const intervalFactor = Math.max(0, 1 - intervalDeviation);

  return normalizedCV * 20 + intervalFactor * 10;
}

/**
 * Challenge response stats: response rate and median latency.
 */
function computeChallengeStats(
  challenges: {
    issued_at: string;
    responded_at: string | null;
    latency_ms: number | null;
    deadline_seconds: number;
  }[]
): { responseRate: number; medianLatency: number | null } {
  if (challenges.length === 0) {
    return { responseRate: 0, medianLatency: null };
  }

  const responded = challenges.filter(
    (c) => c.responded_at && c.latency_ms !== null
  );
  const withinDeadline = responded.filter(
    (c) => c.latency_ms! <= c.deadline_seconds * 1000
  );

  const responseRate = withinDeadline.length / challenges.length;

  const latencies = withinDeadline
    .map((c) => c.latency_ms!)
    .sort((a, b) => a - b);
  const medianLatency =
    latencies.length > 0
      ? latencies[Math.floor(latencies.length / 2)]
      : null;

  return { responseRate, medianLatency };
}

/**
 * Latency score: faster responses score higher.
 * <500ms = 20, <1000ms = 15, <3000ms = 10, <10000ms = 5, else 0
 * Returns 0-20.
 */
function computeLatencyScore(medianLatency: number | null): number {
  if (medianLatency === null) return 0;
  if (medianLatency < 500) return 20;
  if (medianLatency < 1000) return 15;
  if (medianLatency < 3000) return 10;
  if (medianLatency < 10000) return 5;
  return 0;
}

/**
 * Circadian score: agents active during "off hours" (2am-6am local time)
 * are more likely to be daemons.
 * Returns 0-20.
 */
function computeCircadian(
  heartbeats: { timestamp: string }[]
): number {
  if (heartbeats.length < 10) return 0;

  const hours = heartbeats.map((h) => new Date(h.timestamp).getUTCHours());

  // Count heartbeats during "off hours" (0-6 UTC as proxy)
  const offHourCount = hours.filter((h) => h >= 0 && h <= 6).length;
  const offHourRatio = offHourCount / hours.length;

  // For a true daemon running 24/7, offHourRatio should be ~7/24 ≈ 0.29
  // For a human-operated agent, offHourRatio is typically near 0
  // Score proportional to how close to 0.29 the ratio is
  const expectedRatio = 7 / 24;
  const deviation = Math.abs(offHourRatio - expectedRatio);
  const score = Math.max(0, 1 - deviation / expectedRatio);

  return score * 20;
}

/**
 * Get the current daemon score for an agent.
 */
export async function getDaemonScore(
  agentId: string
): Promise<{
  score: number;
  heartbeat_regularity: number;
  challenge_response_rate: number;
  challenge_median_latency_ms: number | null;
  circadian_score: number;
  last_chain_length: number;
} | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("daemon_scores")
    .select("*")
    .eq("agent_id", agentId)
    .single();
  return data;
}
