import { createAdminClient } from "@/lib/supabase/admin";
import type { ExecutionPlan, ExecutionPlanReview } from "@/lib/orchestration/types";
import type { Goal, GoalDependency, Task } from "@/types/admin";
import type { Json } from "@/types/database";
import { randomUUID } from "crypto";

function round(value: number, precision = 4) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json;
}

function clampPriority(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildPlanNodeRow(input: {
  planId: string;
  taskPriority: number;
  goal: Goal;
  dependencies: GoalDependency[];
  goalIdToNodeId: Map<string, string>;
  existingNode?: Record<string, unknown>;
}) {
  const dependencyCount = input.dependencies.filter(
    (dependency) => dependency.goal_id === input.goal.id
  ).length;
  const metadata = {
    ...input.goal.metadata,
    dependency_count: dependencyCount,
    depth: input.goal.depth,
    requires_all_subgoals: input.goal.requires_all_subgoals,
  };

  return {
    id: input.goalIdToNodeId.get(input.goal.id)!,
    plan_id: input.planId,
    goal_id: input.goal.id,
    parent_node_id: input.goal.parent_goal_id
      ? input.goalIdToNodeId.get(input.goal.parent_goal_id) ?? null
      : null,
    node_key: input.goal.path,
    title: input.goal.title,
    description: input.goal.description,
    node_type: input.goal.node_type,
    orchestration_role: input.goal.orchestration_role,
    status: (input.existingNode?.status as string | undefined) ?? input.goal.status,
    assigned_agent_id:
      input.goal.assigned_agent_id ??
      ((input.existingNode?.assigned_agent_id as string | null) ?? null),
    priority: clampPriority(input.taskPriority - input.goal.depth * 5 - dependencyCount * 2),
    confidence:
      input.goal.completion_confidence ??
      (input.existingNode?.confidence === null || input.existingNode?.confidence === undefined
        ? null
        : Number(input.existingNode.confidence)),
    budget_credits:
      input.goal.credit_reward === null || input.goal.credit_reward === undefined
        ? null
        : input.goal.credit_reward.toString(),
    budget_minutes: input.goal.estimated_minutes,
    actual_minutes: input.goal.actual_minutes,
    passing_spec: input.goal.passing_spec,
    evidence: toJson(input.goal.evidence),
    input_spec: toJson(input.goal.input_spec),
    output_spec: toJson(input.goal.output_spec),
    retry_policy: toJson(input.goal.retry_policy),
    verification_method: input.goal.verification_method,
    verification_target: input.goal.verification_target,
    rework_count: Number(input.existingNode?.rework_count ?? 0),
    handoff_count: Number(input.existingNode?.handoff_count ?? 0),
    successful_handoff_count: Number(input.existingNode?.successful_handoff_count ?? 0),
    duplicate_overlap_score:
      input.existingNode?.duplicate_overlap_score === null ||
      input.existingNode?.duplicate_overlap_score === undefined
        ? null
        : Number(input.existingNode.duplicate_overlap_score),
    metadata: toJson(metadata),
  };
}

function mapPlanRow(
  row: Record<string, unknown>
): Omit<ExecutionPlan, "nodes" | "edges" | "reviews"> {
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    created_by: (row.created_by as string | null) ?? null,
    agent_id: (row.agent_id as string | null) ?? null,
    status: (row.status as string) ?? "draft",
    methodology_version: (row.methodology_version as string) ?? "v2",
    summary: (row.summary as string | null) ?? null,
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapNodeRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    plan_id: row.plan_id as string,
    goal_id: (row.goal_id as string | null) ?? null,
    parent_node_id: (row.parent_node_id as string | null) ?? null,
    node_key: row.node_key as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    node_type: (row.node_type as string) ?? "deliverable",
    orchestration_role: (row.orchestration_role as string) ?? "execute",
    status: (row.status as string) ?? "pending",
    assigned_agent_id: (row.assigned_agent_id as string | null) ?? null,
    priority: Number(row.priority ?? 50),
    confidence:
      row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    budget_credits:
      row.budget_credits === null || row.budget_credits === undefined
        ? null
        : Number(row.budget_credits),
    budget_minutes:
      row.budget_minutes === null || row.budget_minutes === undefined
        ? null
        : Number(row.budget_minutes),
    actual_minutes:
      row.actual_minutes === null || row.actual_minutes === undefined
        ? null
        : Number(row.actual_minutes),
    passing_spec: (row.passing_spec as string | null) ?? null,
    evidence: safeArray(row.evidence),
    input_spec: safeArray(row.input_spec),
    output_spec: safeArray(row.output_spec),
    retry_policy: safeObject(row.retry_policy),
    verification_method: (row.verification_method as string | null) ?? null,
    verification_target: (row.verification_target as string | null) ?? null,
    rework_count: Number(row.rework_count ?? 0),
    handoff_count: Number(row.handoff_count ?? 0),
    successful_handoff_count: Number(row.successful_handoff_count ?? 0),
    duplicate_overlap_score:
      row.duplicate_overlap_score === null || row.duplicate_overlap_score === undefined
        ? null
        : Number(row.duplicate_overlap_score),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapEdgeRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    from_node_id: row.from_node_id as string,
    to_node_id: row.to_node_id as string,
    edge_type: (row.edge_type as string) ?? "blocking",
  };
}

function mapReviewRow(row: Record<string, unknown>): ExecutionPlanReview {
  return {
    id: row.id as string,
    plan_id: row.plan_id as string,
    review_type: (row.review_type as string) ?? "reviewer",
    reviewer_agent_id: (row.reviewer_agent_id as string | null) ?? null,
    reviewer_account_id: (row.reviewer_account_id as string | null) ?? null,
    decision: (row.decision as string) ?? "pending",
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    summary: (row.summary as string | null) ?? null,
    evidence_findings: safeArray(row.evidence_findings),
    created_at: row.created_at as string,
    submitted_at: (row.submitted_at as string | null) ?? null,
  };
}

function getActorKey(review: {
  reviewer_account_id: string | null;
  reviewer_agent_id: string | null;
}) {
  return review.reviewer_account_id
    ? `account:${review.reviewer_account_id}`
    : review.reviewer_agent_id
      ? `agent:${review.reviewer_agent_id}`
      : "anonymous";
}

function latestReviewByType(
  reviews: ExecutionPlanReview[],
  reviewType: "planner" | "reviewer" | "reconciler"
) {
  return reviews.find((review) => review.review_type === reviewType) ?? null;
}

function computePlanLifecycleStatus(reviews: ExecutionPlanReview[]) {
  const planner = latestReviewByType(reviews, "planner");
  const reviewer = latestReviewByType(reviews, "reviewer");
  const reconciler = latestReviewByType(reviews, "reconciler");

  if (reconciler?.decision === "approve") return "reconciled";
  if (reviewer?.decision === "approve") return "verified";
  if (planner?.decision === "approve") return "planned";
  if (
    planner?.decision === "reject" ||
    planner?.decision === "needs_changes" ||
    reviewer?.decision === "reject" ||
    reviewer?.decision === "needs_changes" ||
    reconciler?.decision === "reject" ||
    reconciler?.decision === "needs_changes"
  ) {
    return "changes_requested";
  }
  return "ready";
}

async function syncExecutionPlanSnapshot(planId: string, taskId: string) {
  const db = createAdminClient();
  const { data: goalIds } = await db.from("goals").select("id").eq("task_id", taskId);

  const [{ data: task }, { data: goals }, { data: dependencies }, { data: existingNodes }] =
    await Promise.all([
      db.from("tasks").select("id, title, priority, methodology_version").eq("id", taskId).single(),
      db.from("goals").select("*").eq("task_id", taskId).order("path", { ascending: true }),
      (goalIds ?? []).length > 0
        ? db
            .from("goal_dependencies")
            .select("id, goal_id, depends_on_goal_id, dependency_kind, created_at")
            .in("goal_id", (goalIds ?? []).map((goal) => goal.id))
        : Promise.resolve({ data: [], error: null }),
      db.from("execution_plan_nodes").select("*").eq("plan_id", planId),
    ]);

  if (!task) return;

  const mappedGoals = (goals ?? []).map((row) => ({
    id: row.id as string,
    task_id: row.task_id as string,
    parent_goal_id: (row.parent_goal_id as string | null) ?? null,
    path: (row.path as string) ?? "",
    depth: ((row.path as string) ?? "").split("/").length - 1,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    passing_spec: (row.passing_spec as string | null) ?? null,
    status: (row.status as Goal["status"]) ?? "pending",
    credit_reward: row.credit_reward ? Number(row.credit_reward) : 0,
    assigned_agent_id: (row.assigned_agent_id as string | null) ?? null,
    requires_all_subgoals: (row.requires_all_subgoals as boolean) ?? false,
    evidence: safeArray(row.evidence),
    input_spec: safeArray(row.input_spec),
    output_spec: safeArray(row.output_spec),
    retry_policy: safeObject(row.retry_policy),
    verification_method: (row.verification_method as string | null) ?? null,
    verification_target: (row.verification_target as string | null) ?? null,
    orchestration_role: (row.orchestration_role as string) ?? "execute",
    node_type: (row.node_type as string) ?? "deliverable",
    blocked_reason: (row.blocked_reason as string | null) ?? null,
    completion_confidence:
      row.completion_confidence === null || row.completion_confidence === undefined
        ? null
        : Number(row.completion_confidence),
    estimated_minutes:
      row.estimated_minutes === null || row.estimated_minutes === undefined
        ? null
        : Number(row.estimated_minutes),
    actual_minutes:
      row.actual_minutes === null || row.actual_minutes === undefined
        ? null
        : Number(row.actual_minutes),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  })) as Goal[];

  const mappedDependencies = (dependencies ?? []).map((row) => ({
    id: row.id as string,
    goal_id: row.goal_id as string,
    depends_on_goal_id: row.depends_on_goal_id as string,
    dependency_kind: (row.dependency_kind as string) ?? "blocking",
    created_at: row.created_at as string,
  })) as GoalDependency[];

  const existingNodeByGoalId = new Map<string, Record<string, unknown>>();
  const goalIdToNodeId = new Map<string, string>();
  for (const node of existingNodes ?? []) {
    if (typeof node.goal_id === "string") {
      existingNodeByGoalId.set(node.goal_id, node as Record<string, unknown>);
      goalIdToNodeId.set(node.goal_id, node.id);
    }
  }
  for (const goal of mappedGoals) {
    if (!goalIdToNodeId.has(goal.id)) {
      goalIdToNodeId.set(goal.id, randomUUID());
    }
  }

  const desiredNodes = mappedGoals.map((goal) =>
    buildPlanNodeRow({
      planId,
      taskPriority: Number(task.priority ?? 50),
      goal,
      dependencies: mappedDependencies,
      goalIdToNodeId,
      existingNode: existingNodeByGoalId.get(goal.id),
    })
  );

  await db.from("execution_plan_edges").delete().eq("plan_id", planId);

  const obsoleteNodeIds = (existingNodes ?? [])
    .filter((node) => !mappedGoals.some((goal) => goal.id === node.goal_id))
    .map((node) => node.id as string);
  if (obsoleteNodeIds.length > 0) {
    await db.from("execution_plan_nodes").delete().in("id", obsoleteNodeIds);
  }

  if (desiredNodes.length > 0) {
    const { error: upsertError } = await db
      .from("execution_plan_nodes")
      .upsert(desiredNodes, { onConflict: "id" });
    if (upsertError) {
      throw new Error(`Failed to sync execution plan nodes: ${upsertError.message}`);
    }
  }

  const edgeRows = mappedDependencies
    .map((dependency) => {
      const fromNodeId = goalIdToNodeId.get(dependency.depends_on_goal_id);
      const toNodeId = goalIdToNodeId.get(dependency.goal_id);
      if (!fromNodeId || !toNodeId) return null;
      return {
        plan_id: planId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        edge_type: dependency.dependency_kind,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (edgeRows.length > 0) {
    const { error: edgeError } = await db.from("execution_plan_edges").insert(edgeRows);
    if (edgeError) {
      throw new Error(`Failed to sync execution plan edges: ${edgeError.message}`);
    }
  }

  await db
    .from("execution_plans")
    .update({
      methodology_version: (task.methodology_version as string) ?? "v2",
      summary: `${task.title as string}: ${mappedGoals.length} nodes materialized for execution`,
      metadata: toJson({
        task_priority: Number(task.priority ?? 50),
        dependency_count: mappedDependencies.length,
        methodology_version: (task.methodology_version as string) ?? "v2",
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
}

export function computePlanMethodologyMetrics(plan: ExecutionPlan | null) {
  if (!plan) {
    return {
      decomposition_coverage: 0,
      completion_rate: 0,
      review_approval_rate: 0,
      reviewer_agreement_rate: 0,
      rework_rate: 0,
      handoff_success_rate: 0,
      forecast_accuracy: 0,
      duplicate_work_avoidance: 0,
      evidence_density: 0,
    };
  }

  const totalNodes = plan.nodes.length;
  const completedNodes = plan.nodes.filter((node) => node.status === "completed").length;
  const nodesWithSpecs = plan.nodes.filter(
    (node) =>
      node.input_spec.length > 0 &&
      node.output_spec.length > 0 &&
      node.verification_method &&
      node.passing_spec
  ).length;
  const evidenceDensity =
    totalNodes === 0
      ? 0
      : plan.nodes.reduce((sum, node) => sum + node.evidence.length, 0) / totalNodes;

  const resolvedReviews = plan.reviews.filter((review) => review.decision !== "pending");
  const approvalCount = resolvedReviews.filter((review) => review.decision === "approve").length;
  const reviewApprovalRate =
    resolvedReviews.length === 0 ? 0 : approvalCount / resolvedReviews.length;

  const reviewsByType = new Map<string, ExecutionPlanReview[]>();
  for (const review of resolvedReviews) {
    const key = `${review.review_type}:${review.plan_id}`;
    const bucket = reviewsByType.get(key) ?? [];
    bucket.push(review);
    reviewsByType.set(key, bucket);
  }
  const agreementSamples = [...reviewsByType.values()]
    .filter((reviews) => reviews.length > 1)
    .map((reviews) => {
      const counts = reviews.reduce<Record<string, number>>((acc, review) => {
        acc[review.decision] = (acc[review.decision] ?? 0) + 1;
        return acc;
      }, {});
      const maxVotes = Math.max(...Object.values(counts));
      return maxVotes / reviews.length;
    });
  const reviewerAgreementRate =
    agreementSamples.length === 0
      ? reviewApprovalRate
      : agreementSamples.reduce((sum, value) => sum + value, 0) / agreementSamples.length;

  const totalRework = plan.nodes.reduce((sum, node) => sum + node.rework_count, 0);
  const reworkRate = totalNodes === 0 ? 0 : totalRework / totalNodes;

  const totalHandoffs = plan.nodes.reduce((sum, node) => sum + node.handoff_count, 0);
  const successfulHandoffs = plan.nodes.reduce(
    (sum, node) => sum + node.successful_handoff_count,
    0
  );
  const handoffSuccessRate =
    totalHandoffs === 0 ? 0 : successfulHandoffs / Math.max(totalHandoffs, 1);

  const forecastSamples = plan.nodes.filter(
    (node) =>
      node.budget_minutes !== null &&
      node.actual_minutes !== null &&
      node.budget_minutes > 0
  );
  const forecastAccuracy =
    forecastSamples.length === 0
      ? 0
      : forecastSamples.reduce((sum, node) => {
          const error = Math.abs((node.actual_minutes ?? 0) - (node.budget_minutes ?? 0));
          return sum + Math.max(0, 1 - error / Math.max(node.budget_minutes ?? 1, 1));
        }, 0) / forecastSamples.length;

  const duplicateWorkAvoidance =
    totalNodes === 0
      ? 0
      : 1 -
        plan.nodes.reduce(
          (sum, node) => sum + Math.min(1, Math.max(0, node.duplicate_overlap_score ?? 0)),
          0
        ) /
          totalNodes;

  return {
    decomposition_coverage: round(totalNodes === 0 ? 0 : nodesWithSpecs / totalNodes),
    completion_rate: round(totalNodes === 0 ? 0 : completedNodes / totalNodes),
    review_approval_rate: round(reviewApprovalRate),
    reviewer_agreement_rate: round(reviewerAgreementRate),
    rework_rate: round(reworkRate),
    handoff_success_rate: round(handoffSuccessRate),
    forecast_accuracy: round(forecastAccuracy),
    duplicate_work_avoidance: round(duplicateWorkAvoidance),
    evidence_density: round(evidenceDensity),
  };
}

export async function getLatestExecutionPlan(taskId: string): Promise<ExecutionPlan | null> {
  const db = createAdminClient();
  const { data: plan } = await db
    .from("execution_plans")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  await syncExecutionPlanSnapshot(plan.id, taskId);

  const [{ data: nodes }, { data: edges }, { data: reviews }] = await Promise.all([
    db
      .from("execution_plan_nodes")
      .select("*")
      .eq("plan_id", plan.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true }),
    db.from("execution_plan_edges").select("*").eq("plan_id", plan.id),
    db
      .from("execution_plan_reviews")
      .select("*")
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    ...mapPlanRow(plan as Record<string, unknown>),
    nodes: (nodes ?? []).map((row) => mapNodeRow(row as Record<string, unknown>)),
    edges: (edges ?? []).map((row) => mapEdgeRow(row as Record<string, unknown>)),
    reviews: (reviews ?? []).map((row) => mapReviewRow(row as Record<string, unknown>)),
  };
}

export async function materializeExecutionPlan(input: {
  task: Task;
  goals: Goal[];
  dependencies: GoalDependency[];
  createdBy: string | null;
  agentId?: string | null;
}): Promise<ExecutionPlan> {
  const db = createAdminClient();

  const { data: plan, error: planError } = await db
    .from("execution_plans")
    .insert({
      task_id: input.task.id,
      created_by: input.createdBy,
      agent_id: input.agentId ?? null,
      status: "ready",
      methodology_version: input.task.methodology_version,
      summary: `${input.task.title}: ${input.goals.length} nodes materialized for execution`,
      metadata: {
        task_priority: input.task.priority,
        dependency_count: input.dependencies.length,
        methodology_version: input.task.methodology_version,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create execution plan: ${planError?.message ?? "unknown"}`);
  }

  const goalIdToNodeId = new Map<string, string>();
  for (const goal of input.goals) {
    goalIdToNodeId.set(goal.id, randomUUID());
  }

  const nodeRows = input.goals.map((goal) =>
    buildPlanNodeRow({
      planId: plan.id,
      taskPriority: input.task.priority,
      goal,
      dependencies: input.dependencies,
      goalIdToNodeId,
    })
  );

  if (nodeRows.length > 0) {
    const { error: nodeError } = await db.from("execution_plan_nodes").insert(nodeRows);
    if (nodeError) {
      throw new Error(`Failed to create execution plan nodes: ${nodeError.message}`);
    }
  }

  const edgeRows = input.dependencies
    .map((dependency) => {
      const fromNodeId = goalIdToNodeId.get(dependency.depends_on_goal_id);
      const toNodeId = goalIdToNodeId.get(dependency.goal_id);
      if (!fromNodeId || !toNodeId) return null;
      return {
        plan_id: plan.id,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        edge_type: dependency.dependency_kind,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (edgeRows.length > 0) {
    const { error: edgeError } = await db.from("execution_plan_edges").insert(edgeRows);
    if (edgeError) {
      throw new Error(`Failed to create execution plan edges: ${edgeError.message}`);
    }
  }

  return (await getLatestExecutionPlan(input.task.id)) as ExecutionPlan;
}

export async function submitExecutionPlanReview(input: {
  planId: string;
  reviewType: "planner" | "reviewer" | "reconciler";
  reviewerAccountId: string | null;
  reviewerAgentId?: string | null;
  decision: "pending" | "approve" | "reject" | "needs_changes";
  summary?: string | null;
  score?: number | null;
  evidenceFindings?: unknown[];
  metadata?: Record<string, unknown>;
}): Promise<ExecutionPlanReview> {
  const db = createAdminClient();
  const { data: existingReviews, error: reviewLoadError } = await db
    .from("execution_plan_reviews")
    .select("*")
    .eq("plan_id", input.planId)
    .order("created_at", { ascending: false });
  if (reviewLoadError) {
    throw new Error(`Failed to load existing execution plan reviews: ${reviewLoadError.message}`);
  }

  const reviews = (existingReviews ?? []).map((row) => mapReviewRow(row as Record<string, unknown>));
  const actorKey = getActorKey({
    reviewer_account_id: input.reviewerAccountId,
    reviewer_agent_id: input.reviewerAgentId ?? null,
  });
  const plannerReview = latestReviewByType(reviews, "planner");
  const reviewerReview = latestReviewByType(reviews, "reviewer");
  const reconcilerReview = latestReviewByType(reviews, "reconciler");

  const priorActorReview = reviews.find(
    (review) =>
      review.review_type === input.reviewType &&
      review.decision !== "pending" &&
      getActorKey(review) === actorKey
  );
  if (priorActorReview) {
    throw new Error("This actor has already submitted a decision for that review stage");
  }

  if (input.reviewType === "reviewer") {
    if (plannerReview?.decision !== "approve") {
      throw new Error("Reviewer approval requires a prior approved planner review");
    }
    if (getActorKey(plannerReview) === actorKey) {
      throw new Error("Reviewer stage must be completed by a different actor than the planner");
    }
  }

  if (input.reviewType === "reconciler") {
    if (reviewerReview?.decision !== "approve") {
      throw new Error("Reconciler approval requires a prior approved reviewer review");
    }
    if (
      getActorKey(reviewerReview) === actorKey ||
      (plannerReview && getActorKey(plannerReview) === actorKey)
    ) {
      throw new Error(
        "Reconciler stage must be completed by a different actor than prior plan reviewers"
      );
    }
  }

  const stageAlreadyApproved =
    (input.reviewType === "planner" && plannerReview?.decision === "approve") ||
    (input.reviewType === "reviewer" && reviewerReview?.decision === "approve") ||
    (input.reviewType === "reconciler" && reconcilerReview?.decision === "approve");
  if (stageAlreadyApproved && input.decision === "approve") {
    throw new Error("That review stage has already been approved");
  }

  const { data, error } = await db
    .from("execution_plan_reviews")
    .insert({
      plan_id: input.planId,
      review_type: input.reviewType,
      reviewer_account_id: input.reviewerAccountId,
      reviewer_agent_id: input.reviewerAgentId ?? null,
      decision: input.decision,
      summary: input.summary ?? null,
      score: input.score ?? null,
      evidence_findings: toJson(input.evidenceFindings ?? []),
      metadata: toJson(input.metadata ?? {}),
      submitted_at: input.decision === "pending" ? null : new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to submit execution plan review: ${error?.message ?? "unknown"}`);
  }

  const insertedReview = mapReviewRow(data as Record<string, unknown>);
  await db
    .from("execution_plans")
    .update({
      status: computePlanLifecycleStatus([insertedReview, ...reviews]),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.planId);

  return insertedReview;
}

export function summarizePlanReadiness(plan: ExecutionPlan | null) {
  if (!plan) {
    return {
      total_nodes: 0,
      completed_nodes: 0,
      blocked_nodes: 0,
      completion_ratio: 0,
      planner_reviews: 0,
      reviewer_reviews: 0,
      reconciler_reviews: 0,
      methodology: computePlanMethodologyMetrics(null),
    };
  }

  const totalNodes = plan.nodes.length;
  const completedNodes = plan.nodes.filter((node) => node.status === "completed").length;
  const blockedNodes = plan.nodes.filter((node) => {
    const maxAttempts =
      typeof node.retry_policy.max_attempts === "number" ? node.retry_policy.max_attempts : 1;
    return node.status === "failed" || node.rework_count >= Math.max(1, maxAttempts);
  }).length;

  return {
    total_nodes: totalNodes,
    completed_nodes: completedNodes,
    blocked_nodes: blockedNodes,
    completion_ratio: totalNodes === 0 ? 0 : round(completedNodes / totalNodes),
    planner_reviews: plan.reviews.filter((review) => review.review_type === "planner").length,
    reviewer_reviews: plan.reviews.filter((review) => review.review_type === "reviewer").length,
    reconciler_reviews: plan.reviews.filter((review) => review.review_type === "reconciler").length,
    methodology: computePlanMethodologyMetrics(plan),
  };
}
