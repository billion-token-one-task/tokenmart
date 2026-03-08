import { createAdminClient } from "@/lib/supabase/admin";
import { assignReviewers } from "@/lib/admin/peer-review";
import type { Bounty, BountyClaim } from "@/types/admin";
import type { Json } from "@/types/database";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json;
}

/**
 * Create a new bounty.
 */
export async function createBounty(params: {
  title: string;
  description: string | null;
  type: "work" | "verification";
  creditReward: number;
  deadline: string | null;
  taskId: string | null;
  goalId: string | null;
  createdBy: string;
  metadata?: Record<string, unknown>;
}): Promise<Bounty> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("bounties")
    .insert({
      title: params.title,
      description: params.description,
      type: params.type,
      credit_reward: params.creditReward.toString(),
      deadline: params.deadline,
      task_id: params.taskId,
      goal_id: params.goalId,
      created_by: params.createdBy,
      metadata: toJson(params.metadata ?? {}),
      status: "open",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create bounty: ${error?.message ?? "unknown"}`);
  }

  return mapBountyRow(data);
}

/**
 * List bounties with optional filters.
 */
export async function listBounties(options?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<Bounty[]> {
  const db = createAdminClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = db
    .from("bounties")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.type) {
    query = query.eq("type", options.type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list bounties: ${error.message}`);
  }

  return (data ?? []).map(mapBountyRow);
}

/**
 * Get a single bounty by ID.
 */
export async function getBounty(bountyId: string): Promise<Bounty | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("bounties")
    .select("*")
    .eq("id", bountyId)
    .single();

  if (error || !data) return null;

  return mapBountyRow(data);
}

/**
 * Claim a bounty for an agent.
 * Checks: bounty is open, agent trust tier allows claiming
 * (tier 0 can only claim verification bounties), and agent hasn't already claimed.
 */
export async function claimBounty(
  bountyId: string,
  agentId: string
): Promise<BountyClaim> {
  const db = createAdminClient();

  // Preferred path: atomic SQL helper to avoid multi-claim races.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcClaimRows, error: rpcError } = await (db.rpc as any)(
    "claim_bounty_atomic",
    {
      p_bounty_id: bountyId,
      p_agent_id: agentId,
    }
  );

  const isMissingRpc =
    !!rpcError &&
    (rpcError.code === "PGRST202" ||
      rpcError.message.includes("claim_bounty_atomic"));

  if (!rpcError && Array.isArray(rpcClaimRows) && rpcClaimRows.length > 0) {
    return mapClaimRow(rpcClaimRows[0] as Record<string, unknown>);
  }

  if (rpcError && !isMissingRpc) {
    throw new Error(rpcError.message);
  }

  // Fetch the bounty
  const { data: bounty, error: bountyError } = await db
    .from("bounties")
    .select("*")
    .eq("id", bountyId)
    .single();

  if (bountyError || !bounty) {
    throw new Error("Bounty not found");
  }

  if (bounty.status !== "open") {
    throw new Error("Bounty is not open for claiming");
  }

  // Fetch agent to check trust tier
  const { data: agent, error: agentError } = await db
    .from("agents")
    .select("id, trust_tier")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error("Agent not found");
  }

  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("service_health_score, orchestration_score")
    .eq("agent_id", agentId)
    .maybeSingle();

  const metadata =
    bounty.metadata && typeof bounty.metadata === "object" && !Array.isArray(bounty.metadata)
      ? (bounty.metadata as Record<string, unknown>)
      : {};
  const requirements =
    metadata.requirements && typeof metadata.requirements === "object" && !Array.isArray(metadata.requirements)
      ? (metadata.requirements as Record<string, unknown>)
      : {};

  // Tier 0 agents can only claim verification bounties
  if (agent.trust_tier === 0 && bounty.type !== "verification") {
    throw new Error("Tier 0 agents can only claim verification bounties");
  }

  if (
    typeof requirements.required_trust_tier === "number" &&
    agent.trust_tier < requirements.required_trust_tier
  ) {
    throw new Error(
      `This bounty requires trust tier ${requirements.required_trust_tier} or higher`
    );
  }

  if (
    typeof requirements.required_service_health === "number" &&
    Number(daemonScore?.service_health_score ?? 0) < requirements.required_service_health
  ) {
    throw new Error(
      `This bounty requires service health ${requirements.required_service_health} or higher`
    );
  }

  if (
    typeof requirements.required_orchestration_score === "number" &&
    Number(daemonScore?.orchestration_score ?? 0) < requirements.required_orchestration_score
  ) {
    throw new Error(
      `This bounty requires orchestration score ${requirements.required_orchestration_score} or higher`
    );
  }

  // Check if agent already has an active claim on this bounty
  const { data: existingClaim } = await db
    .from("bounty_claims")
    .select("id")
    .eq("bounty_id", bountyId)
    .eq("agent_id", agentId)
    .single();

  if (existingClaim) {
    throw new Error("Agent has already claimed this bounty");
  }

  // Create the claim
  const { data: claim, error: claimError } = await db
    .from("bounty_claims")
    .insert({
      bounty_id: bountyId,
      agent_id: agentId,
      status: "claimed",
    })
    .select("*")
    .single();

  if (claimError || !claim) {
    throw new Error(`Failed to claim bounty: ${claimError?.message ?? "unknown"}`);
  }

  // Update bounty status to claimed
  await db
    .from("bounties")
    .update({ status: "claimed", updated_at: new Date().toISOString() })
    .eq("id", bountyId);

  return mapClaimRow(claim);
}

/**
 * Submit work for a claimed bounty.
 * Updates claim status to 'submitted', updates bounty status to 'submitted',
 * and triggers peer review assignment.
 */
export async function submitBountyClaim(
  claimId: string,
  agentId: string,
  submissionText: string
): Promise<BountyClaim> {
  const db = createAdminClient();

  // Fetch the claim
  const { data: claim, error: claimError } = await db
    .from("bounty_claims")
    .select("*")
    .eq("id", claimId)
    .eq("agent_id", agentId)
    .single();

  if (claimError || !claim) {
    throw new Error("Bounty claim not found or does not belong to this agent");
  }

  if (claim.status !== "claimed") {
    throw new Error(`Cannot submit claim with status '${claim.status}'`);
  }

  // Update the claim
  const { data: updatedClaim, error: updateError } = await db
    .from("bounty_claims")
    .update({
      status: "submitted",
      submission_text: submissionText,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", claimId)
    .select("*")
    .single();

  if (updateError || !updatedClaim) {
    throw new Error(
      `Failed to submit claim: ${updateError?.message ?? "unknown"}`
    );
  }

  // Update bounty status to submitted
  await db
    .from("bounties")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", claim.bounty_id);

  // Fetch bounty reward for reviewer reward calculation
  const { data: bounty } = await db
    .from("bounties")
    .select("credit_reward")
    .eq("id", claim.bounty_id)
    .single();

  const bountyReward = bounty ? Number(bounty.credit_reward) : 0;

  // Trigger peer review assignment (fire and forget with error logging)
  assignReviewers(claimId, agentId, bountyReward).catch((err) => {
    console.error(`Failed to assign reviewers for claim ${claimId}:`, err);
  });

  return mapClaimRow(updatedClaim);
}

// ---------------------------------------------------------------------------
// Internal mappers
// ---------------------------------------------------------------------------

function mapBountyRow(row: Record<string, unknown>): Bounty {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    type: (row.type as Bounty["type"]) ?? "work",
    task_id: (row.task_id as string | null) ?? null,
    goal_id: (row.goal_id as string | null) ?? null,
    created_by: (row.created_by as string) ?? "",
    credit_reward: row.credit_reward ? Number(row.credit_reward) : 0,
    status: (row.status as Bounty["status"]) ?? "open",
    deadline: (row.deadline as string | null) ?? null,
    max_claimants: (row.max_claimants as number) ?? 1,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    task_title: (row.task_title as string | null) ?? null,
    goal_title: (row.goal_title as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapClaimRow(row: Record<string, unknown>): BountyClaim {
  return {
    id: row.id as string,
    bounty_id: row.bounty_id as string,
    agent_id: row.agent_id as string,
    status: (row.status as BountyClaim["status"]) ?? "claimed",
    submission_data: row.submission_text
      ? { text: row.submission_text as string }
      : null,
    submitted_at: (row.submitted_at as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    credits_awarded: row.credits_awarded ? Number(row.credits_awarded) : null,
    created_at: row.created_at as string,
  };
}
