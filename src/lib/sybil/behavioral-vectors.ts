import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/**
 * Behavioral vector structure stored in the JSONB column.
 */
interface BehavioralVector {
  action_counts: Record<string, number>;
  hourly_distribution: Record<string, number>;
  last_actions: string[];
}

const MAX_LAST_ACTIONS = 20;
const MAX_RETRIES = 3;

/**
 * Update the agent's behavioral vector with a new data point.
 * Called passively on each API action for sybil detection fingerprinting.
 *
 * Updates:
 *   - action_counts: increment count for this action type
 *   - hourly_distribution: increment the current hour bucket
 *   - last_actions: push action to a circular buffer of last 20 actions
 */
export async function updateBehavioralVector(
  agentId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = createAdminClient();

  const currentHour = new Date().getUTCHours().toString();
  const actionEntry = metadata
    ? `${action}:${JSON.stringify(metadata)}`
    : action;

  const defaultVector: BehavioralVector = {
    action_counts: {},
    hourly_distribution: {},
    last_actions: [],
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: existing } = await db
      .from("behavioral_vectors")
      .select("vector, updated_at")
      .eq("agent_id", agentId)
      .maybeSingle();

    const vector: BehavioralVector = existing?.vector
      ? (existing.vector as unknown as BehavioralVector)
      : {
          action_counts: { ...defaultVector.action_counts },
          hourly_distribution: { ...defaultVector.hourly_distribution },
          last_actions: [...defaultVector.last_actions],
        };

    if (!vector.action_counts) vector.action_counts = {};
    if (!vector.hourly_distribution) vector.hourly_distribution = {};
    if (!vector.last_actions) vector.last_actions = [];

    vector.action_counts[action] = (vector.action_counts[action] ?? 0) + 1;
    vector.hourly_distribution[currentHour] =
      (vector.hourly_distribution[currentHour] ?? 0) + 1;

    vector.last_actions.push(actionEntry);
    if (vector.last_actions.length > MAX_LAST_ACTIONS) {
      vector.last_actions = vector.last_actions.slice(-MAX_LAST_ACTIONS);
    }

    const now = new Date().toISOString();
    const vectorJson = JSON.parse(JSON.stringify(vector)) as Json;

    if (!existing) {
      const { error } = await db.from("behavioral_vectors").upsert(
        {
          agent_id: agentId,
          vector: vectorJson,
          updated_at: now,
        },
        { onConflict: "agent_id" }
      );
      if (!error) return;
      continue;
    }

    const { data: updatedRow, error } = await db
      .from("behavioral_vectors")
      .update({
        vector: vectorJson,
        updated_at: now,
      })
      .eq("agent_id", agentId)
      .eq("updated_at", existing.updated_at)
      .select("agent_id")
      .maybeSingle();

    if (error) {
      continue;
    }
    if (updatedRow) {
      return;
    }
  }

  console.warn(`Behavioral vector update exhausted retries for agent ${agentId}`);
}
