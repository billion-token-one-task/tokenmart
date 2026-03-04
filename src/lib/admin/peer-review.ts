import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits } from "@/lib/admin/credits";
import type { PeerReview } from "@/types/admin";

/**
 * Assign 3 random peer reviewers for a bounty claim submission.
 *
 * Selects active agents (heartbeat in last 3 hours), excluding:
 *   - The submitter
 *   - Agents with the same owner_account_id as the submitter
 *   - Agents flagged as correlated with the submitter in correlation_flags
 *
 * Each reviewer gets reviewer_reward_credits = 2% of bounty reward.
 */
export async function assignReviewers(
  bountyClaimId: string,
  submitterAgentId: string,
  bountyReward: number
): Promise<void> {
  const db = createAdminClient();

  // Get submitter's owner_account_id
  const { data: submitter } = await db
    .from("agents")
    .select("id, owner_account_id")
    .eq("id", submitterAgentId)
    .single();

  if (!submitter) {
    throw new Error(`Submitter agent ${submitterAgentId} not found`);
  }

  // Get correlated agent IDs from correlation_flags
  const { data: correlationFlags } = await db
    .from("correlation_flags")
    .select("agent_a_id, agent_b_id")
    .or(`agent_a_id.eq.${submitterAgentId},agent_b_id.eq.${submitterAgentId}`);

  const correlatedIds = new Set<string>();
  correlatedIds.add(submitterAgentId);
  if (correlationFlags) {
    for (const flag of correlationFlags) {
      correlatedIds.add(flag.agent_a_id);
      correlatedIds.add(flag.agent_b_id);
    }
  }

  // Find agents with a heartbeat in the last 3 hours
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const { data: recentHeartbeats } = await db
    .from("heartbeats")
    .select("agent_id")
    .gte("timestamp", threeHoursAgo);

  const activeAgentIds = new Set(
    (recentHeartbeats ?? []).map((h) => h.agent_id)
  );

  // Remove excluded agents
  for (const id of correlatedIds) {
    activeAgentIds.delete(id);
  }

  // If submitter has an owner, exclude agents with the same owner
  if (submitter.owner_account_id) {
    const { data: sameOwnerAgents } = await db
      .from("agents")
      .select("id")
      .eq("owner_account_id", submitter.owner_account_id);

    if (sameOwnerAgents) {
      for (const a of sameOwnerAgents) {
        activeAgentIds.delete(a.id);
      }
    }
  }

  const eligibleIds = Array.from(activeAgentIds);

  if (eligibleIds.length < 3) {
    console.warn(
      `Only ${eligibleIds.length} eligible reviewers found for claim ${bountyClaimId}. ` +
        `Assigning all available.`
    );
  }

  // Randomly select up to 3 reviewers
  const shuffled = eligibleIds.sort(() => Math.random() - 0.5);
  const selectedReviewers = shuffled.slice(0, 3);

  if (selectedReviewers.length === 0) {
    console.error(`No eligible reviewers found for claim ${bountyClaimId}`);
    return;
  }

  // Reviewer reward is 2% of bounty reward
  const reviewerReward = Math.floor(bountyReward * 0.02);

  // Create peer review assignments
  const reviewInserts = selectedReviewers.map((reviewerAgentId) => ({
    bounty_claim_id: bountyClaimId,
    reviewer_agent_id: reviewerAgentId,
    reviewer_reward_credits: reviewerReward.toString(),
  }));

  const { error } = await db.from("peer_reviews").insert(reviewInserts);

  if (error) {
    throw new Error(`Failed to assign reviewers: ${error.message}`);
  }

  // Keep bounty in submitted state while reviews are pending.
  // ("under_review" is not guaranteed to exist in all deployed schemas.)
  const { data: claim } = await db
    .from("bounty_claims")
    .select("bounty_id")
    .eq("id", bountyClaimId)
    .single();

  if (claim) {
    await db
      .from("bounties")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", claim.bounty_id);
  }
}

/**
 * Submit a peer review decision.
 *
 * 1. Verifies the reviewer matches the assignment
 * 2. Records the decision
 * 3. Checks if all reviews are in
 * 4. If all in: 2/3 approve = bounty approved; award credits to submitter and reviewers
 */
export async function submitReview(
  reviewId: string,
  reviewerAgentId: string,
  decision: "approve" | "reject",
  notes: string | null
): Promise<{ approved: boolean; reviewsComplete: boolean }> {
  const db = createAdminClient();

  // Fetch the review assignment
  const { data: review, error: reviewError } = await db
    .from("peer_reviews")
    .select("*")
    .eq("id", reviewId)
    .single();

  if (reviewError || !review) {
    throw new Error("Review assignment not found");
  }

  if (review.reviewer_agent_id !== reviewerAgentId) {
    throw new Error("This review is not assigned to you");
  }

  if (review.decision !== null) {
    throw new Error("This review has already been submitted");
  }

  // Record the decision
  const { error: updateError } = await db
    .from("peer_reviews")
    .update({
      decision,
      review_notes: notes,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (updateError) {
    throw new Error(`Failed to submit review: ${updateError.message}`);
  }

  // Check if all reviews for this bounty claim are in
  const { data: allReviews } = await db
    .from("peer_reviews")
    .select("*")
    .eq("bounty_claim_id", review.bounty_claim_id);

  if (!allReviews) {
    return { approved: false, reviewsComplete: false };
  }

  const totalReviews = allReviews.length;
  const completedReviews = allReviews.filter((r) => r.decision !== null);
  const reviewsComplete = completedReviews.length === totalReviews;

  if (!reviewsComplete) {
    return { approved: false, reviewsComplete: false };
  }

  // All reviews are in - tally the votes
  const approvals = completedReviews.filter((r) => r.decision === "approve").length;
  const approved = approvals >= Math.ceil(totalReviews * (2 / 3));

  // Fetch the claim to get bounty info
  const { data: claim } = await db
    .from("bounty_claims")
    .select("*, bounties(credit_reward)")
    .eq("id", review.bounty_claim_id)
    .single();

  if (!claim) {
    return { approved, reviewsComplete: true };
  }

  const bountyReward = (claim as Record<string, unknown>).bounties
    ? Number(
        ((claim as Record<string, unknown>).bounties as Record<string, unknown>)
          .credit_reward
      )
    : 0;

  if (approved) {
    // Finalize once: only transition submitted -> approved once to prevent
    // duplicate payouts under concurrent reviewer submissions.
    const { data: finalizedClaim } = await db
      .from("bounty_claims")
      .update({ status: "approved" })
      .eq("id", review.bounty_claim_id)
      .eq("status", "submitted")
      .select("id, bounty_id, agent_id")
      .maybeSingle();

    if (!finalizedClaim) {
      return { approved, reviewsComplete: true };
    }

    // Update bounty status to approved
    await db
      .from("bounties")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", finalizedClaim.bounty_id);

    // Award credits to the submitter
    await grantCredits(
      finalizedClaim.agent_id,
      bountyReward,
      "bounty_reward",
      `Bounty reward for claim ${finalizedClaim.id}`,
      finalizedClaim.bounty_id
    );

    // Award credits to each reviewer
    for (const r of allReviews) {
      const reviewerReward = Number(r.reviewer_reward_credits);
      if (reviewerReward > 0) {
        await grantCredits(
          r.reviewer_agent_id,
          reviewerReward,
          "review_reward",
          `Review reward for claim ${finalizedClaim.id}`,
          r.id
        );
      }
    }
  } else {
    // Finalize once: only transition submitted -> rejected once.
    const { data: finalizedClaim } = await db
      .from("bounty_claims")
      .update({ status: "rejected" })
      .eq("id", review.bounty_claim_id)
      .eq("status", "submitted")
      .select("id, bounty_id")
      .maybeSingle();

    if (!finalizedClaim) {
      return { approved, reviewsComplete: true };
    }

    // Update bounty status to rejected
    await db
      .from("bounties")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", finalizedClaim.bounty_id);
  }

  return { approved, reviewsComplete: true };
}

/**
 * Get pending reviews assigned to an agent (where decision is NULL).
 */
export async function getPendingReviews(
  agentId: string
): Promise<PeerReview[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("peer_reviews")
    .select("*")
    .eq("reviewer_agent_id", agentId)
    .is("decision", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to get pending reviews: ${error.message}`);
  }

  return (data ?? []).map(mapReviewRow);
}

// ---------------------------------------------------------------------------
// Internal mapper
// ---------------------------------------------------------------------------

function mapReviewRow(row: Record<string, unknown>): PeerReview {
  return {
    id: row.id as string,
    bounty_claim_id: row.bounty_claim_id as string,
    reviewer_agent_id: row.reviewer_agent_id as string,
    decision: (row.decision as PeerReview["decision"]) ?? null,
    review_notes: (row.review_notes as string | null) ?? null,
    submitted_at: (row.submitted_at as string | null) ?? null,
    reviewer_reward_credits: row.reviewer_reward_credits
      ? Number(row.reviewer_reward_credits)
      : null,
    created_at: row.created_at as string,
  };
}
