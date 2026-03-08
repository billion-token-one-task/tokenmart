import { createAdminClient } from "@/lib/supabase/admin";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";
import type {
  WorkQueueItem,
  WorkQueueSnapshot,
} from "@/lib/orchestration/types";
import {
  computePlanMethodologyMetrics,
  getLatestExecutionPlan,
  summarizePlanReadiness,
} from "@/lib/orchestration/plans";

function rankItem(item: WorkQueueItem) {
  return item.priority;
}

function latestResolvedReview(
  reviews: Array<{ review_type: string; decision: string; summary: string | null; id: string }>,
  reviewType: "planner" | "reviewer" | "reconciler"
) {
  return reviews.find(
    (review) => review.review_type === reviewType && review.decision !== "pending"
  ) ?? null;
}

export async function getAgentWorkQueue(agentId: string): Promise<WorkQueueSnapshot> {
  const db = createAdminClient();

  const [
    daemonScore,
    { data: pendingReviews },
    { data: pendingConversations },
    { data: activeClaims },
    { data: openBounties },
  ] = await Promise.all([
    getDaemonScore(agentId),
    db
      .from("peer_reviews")
      .select("id, bounty_claim_id, created_at")
      .eq("reviewer_agent_id", agentId)
      .is("decision", null)
      .order("created_at", { ascending: true }),
    db
      .from("conversations")
      .select("id, status, initiator_id, updated_at")
      .eq("recipient_id", agentId)
      .eq("status", "pending")
      .order("updated_at", { ascending: true })
      .limit(10),
    db
      .from("bounty_claims")
      .select("id, bounty_id, status, submitted_at, created_at, bounties(id, title, deadline, credit_reward, task_id)")
      .eq("agent_id", agentId)
      .in("status", ["claimed", "submitted"])
      .order("created_at", { ascending: true })
      .limit(10),
    db
      .from("bounties")
      .select("id, title, deadline, credit_reward, metadata")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const activeTaskId =
    ((activeClaims?.[0]?.bounties as { task_id?: string } | null)?.task_id as string | undefined) ??
    null;
  const plan = activeTaskId ? await getLatestExecutionPlan(activeTaskId) : null;
  const methodology = computePlanMethodologyMetrics(plan);
  const readiness = summarizePlanReadiness(plan);
  const nodeById = new Map((plan?.nodes ?? []).map((node) => [node.id, node]));
  const blockingDependenciesByNodeId = new Map<string, string[]>();
  for (const edge of plan?.edges ?? []) {
    if (edge.edge_type !== "blocking") continue;
    blockingDependenciesByNodeId.set(edge.to_node_id, [
      ...(blockingDependenciesByNodeId.get(edge.to_node_id) ?? []),
      edge.from_node_id,
    ]);
  }

  const items: WorkQueueItem[] = [];
  let eligibleBountyCount = 0;

  for (const review of pendingReviews ?? []) {
    items.push({
      id: review.id,
      kind: "pending_review",
      title: "Review pending submission",
      description: `Claim ${review.bounty_claim_id} is waiting on your decision.`,
      priority: 95,
      status: "pending",
      href: `/admin/reviews`,
      reasons: ["A reviewer decision is blocking credit settlement.", "Review throughput improves orchestration capability."],
      metadata: {
        bounty_claim_id: review.bounty_claim_id,
        created_at: review.created_at,
      },
    });
  }

  for (const conversation of pendingConversations ?? []) {
    items.push({
      id: conversation.id,
      kind: "pending_conversation",
      title: "Respond to conversation request",
      description: `Agent ${conversation.initiator_id} is waiting for acceptance.`,
      priority: 82,
      status: conversation.status,
      href: `/tokenbook/conversations`,
      reasons: ["A direct collaborator is waiting on your response."],
      metadata: {
        initiator_id: conversation.initiator_id,
        updated_at: conversation.updated_at,
      },
    });
  }

  for (const claim of activeClaims ?? []) {
    const bounty = claim.bounties as
      | { id?: string; title?: string; deadline?: string | null; credit_reward?: string }
      | null;
    items.push({
      id: claim.id,
      kind: "active_claim",
      title: bounty?.title ?? "Continue active bounty",
      description:
        claim.status === "submitted"
          ? "Submission is under review; monitor reviewers and evidence."
          : "Claimed work still needs execution and submission.",
      priority: claim.status === "submitted" ? 88 : 84,
      status: claim.status,
      href: `/admin/bounties/${claim.bounty_id}`,
      reasons:
        claim.status === "submitted"
          ? ["Work is submitted and needs evidence follow-through."]
          : ["Claimed work is already reserved to you and should be advanced before picking up new items."],
      metadata: {
        bounty_id: claim.bounty_id,
        deadline: bounty?.deadline ?? null,
        credit_reward: bounty?.credit_reward ? Number(bounty.credit_reward) : null,
      },
    });
  }

  for (const bounty of openBounties ?? []) {
    const metadata =
      bounty.metadata && typeof bounty.metadata === "object" && !Array.isArray(bounty.metadata)
        ? (bounty.metadata as Record<string, unknown>)
        : {};
    const requirements =
      metadata.requirements &&
      typeof metadata.requirements === "object" &&
      !Array.isArray(metadata.requirements)
        ? (metadata.requirements as Record<string, unknown>)
        : {};
    const serviceHealthScore = daemonScore?.service_health.score ?? 0;
    const orchestrationScore = daemonScore?.orchestration_capability.score ?? 0;
    const marketTrustTier = daemonScore?.market_trust.trust_tier ?? 0;
    if (
      (typeof requirements.required_trust_tier === "number" &&
        marketTrustTier < requirements.required_trust_tier) ||
      (typeof requirements.required_service_health === "number" &&
        serviceHealthScore < requirements.required_service_health) ||
      (typeof requirements.required_orchestration_score === "number" &&
        orchestrationScore < requirements.required_orchestration_score)
    ) {
      continue;
    }
    eligibleBountyCount += 1;
    items.push({
      id: bounty.id,
      kind: "recommended_bounty",
      title: bounty.title,
      description: "Candidate open bounty for new work.",
      priority: 65,
      status: "open",
      href: `/admin/bounties/${bounty.id}`,
      reasons: [
        "Open work is available once active obligations are clear.",
        ...(typeof requirements.required_trust_tier === "number"
          ? [`Requires trust tier ${requirements.required_trust_tier} or higher.`]
          : []),
      ],
      metadata: {
        deadline: bounty.deadline,
        credit_reward: Number(bounty.credit_reward),
        requirements,
      },
    });
  }

  for (const node of plan?.nodes ?? []) {
    if (node.status === "completed") continue;
    if (node.assigned_agent_id && node.assigned_agent_id !== agentId) continue;
    const unresolvedDependencies = (blockingDependenciesByNodeId.get(node.id) ?? [])
      .map((dependencyId) => nodeById.get(dependencyId))
      .filter((dependencyNode) => dependencyNode && dependencyNode.status !== "completed");
    const maxAttempts =
      typeof node.retry_policy.max_attempts === "number" ? node.retry_policy.max_attempts : 1;
    const attemptsRemaining = Math.max(0, maxAttempts - node.rework_count);
    const escalation =
      typeof node.retry_policy.escalation === "string" ? node.retry_policy.escalation : null;
    items.push({
      id: node.id,
      kind: "execution_node",
      title: node.title,
      description: node.description,
      priority:
        unresolvedDependencies.length > 0 ? Math.max(55, node.priority - 15) : Math.max(70, node.priority),
      status: node.status,
      href: `/admin/tasks/${plan?.task_id}`,
      reasons: [
        ...(unresolvedDependencies.length > 0
          ? [
              `Waiting on ${unresolvedDependencies
                .map((dependencyNode) => dependencyNode?.title ?? "an upstream node")
                .join(", ")}.`,
            ]
          : []),
        node.verification_method
          ? `Verification required: ${node.verification_method}.`
          : "Execution node is assigned or available to you.",
        node.input_spec.length === 0 || node.output_spec.length === 0
          ? "Node still needs a tighter execution contract."
          : "Node has a defined execution contract and is ready to move.",
        attemptsRemaining === 0
          ? escalation
            ? `Retry policy is exhausted; escalate via ${escalation}.`
            : "Retry policy is exhausted and the node should be escalated."
          : `${attemptsRemaining} retry attempt${attemptsRemaining === 1 ? "" : "s"} remaining before escalation.`,
      ],
      metadata: {
        node_type: node.node_type,
        orchestration_role: node.orchestration_role,
        verification_method: node.verification_method,
        verification_target: node.verification_target,
        input_spec: node.input_spec,
        output_spec: node.output_spec,
        retry_policy: node.retry_policy,
        evidence: node.evidence,
        budget_minutes: node.budget_minutes,
        actual_minutes: node.actual_minutes,
        passing_spec: node.passing_spec,
        blocked_by:
          unresolvedDependencies.length > 0
            ? unresolvedDependencies.map((dependencyNode) => ({
                node_id: dependencyNode?.id,
                title: dependencyNode?.title,
                status: dependencyNode?.status,
              }))
            : [],
      },
    });
  }

  const plannerReview = plan ? latestResolvedReview(plan.reviews, "planner") : null;
  const reviewerReview = plan ? latestResolvedReview(plan.reviews, "reviewer") : null;
  const reconcilerReview = plan ? latestResolvedReview(plan.reviews, "reconciler") : null;

  if (
    plan &&
    plannerReview?.decision === "approve" &&
    (!reviewerReview || reviewerReview.decision !== "approve")
  ) {
    items.push({
      id: reviewerReview?.id ?? `${plan.id}:reviewer`,
      kind: "plan_review",
      title: "Resolve execution plan review",
      description:
        reviewerReview?.summary ?? "The current plan still needs an independent reviewer sign-off.",
      priority: reviewerReview ? 91 : 90,
      status: reviewerReview?.decision ?? "pending",
      href: `/admin/tasks/${plan.task_id}`,
      reasons: [
        "The active execution plan still has open review feedback.",
        `Current decomposition coverage is ${Math.round(methodology.decomposition_coverage * 100)}%.`,
      ],
      metadata: {
        plan_id: plan.id,
        review_type: "reviewer",
        decision: reviewerReview?.decision ?? "pending",
      },
    });
  }

  if (
    plan &&
    reviewerReview?.decision === "approve" &&
    (!reconcilerReview || reconcilerReview.decision !== "approve")
  ) {
    items.push({
      id: reconcilerReview?.id ?? `${plan.id}:reconciler`,
      kind: "reconciliation",
      title: "Reconcile plan evidence and trust impact",
      description:
        reconcilerReview?.summary ??
        "Execution evidence needs reconciliation before trust and quality metrics settle.",
      priority: reconcilerReview ? 89 : 88,
      status: reconcilerReview?.decision ?? "pending",
      href: `/admin/tasks/${plan.task_id}`,
      reasons: [
        "Reconciliation closes the planner-reviewer loop.",
        `Forecast accuracy is currently ${Math.round(methodology.forecast_accuracy * 100)}%.`,
      ],
      metadata: {
        plan_id: plan.id,
        review_type: "reconciler",
        decision: reconcilerReview?.decision ?? "pending",
      },
    });
  }

  items.sort((left, right) => rankItem(right) - rankItem(left));

  return {
    agenda_kind: "ranked_agenda",
    generated_at: new Date().toISOString(),
    items,
    summary: {
      pending_reviews: (pendingReviews ?? []).length,
      pending_conversations: (pendingConversations ?? []).length,
      active_claims: (activeClaims ?? []).length,
      recommended_bounties: eligibleBountyCount,
      execution_nodes: plan?.nodes.filter((node) => node.status !== "completed").length ?? 0,
    },
    service_health: daemonScore?.service_health ?? null,
    orchestration_capability: daemonScore?.orchestration_capability ?? null,
    market_trust: daemonScore?.market_trust ?? null,
    active_execution_plan: plan
      ? {
          id: plan.id,
          status: plan.status,
          summary: plan.summary,
          methodology,
          readiness,
          nodes: plan.nodes,
          edges: plan.edges,
          reviews: plan.reviews,
        }
      : null,
  };
}
