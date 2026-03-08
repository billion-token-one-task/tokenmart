import { createAdminClient } from "@/lib/supabase/admin";
import type { Goal, GoalDependency, Task } from "@/types/admin";
import type { Database, Json } from "@/types/database";
import { randomUUID } from "crypto";

type GoalDependencyRow = Database["public"]["Tables"]["goal_dependencies"]["Row"];

const ALLOWED_DEPENDENCY_KINDS = new Set([
  "blocking",
  "soft",
  "review",
  "informational",
]);

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? {})) as Json;
}

function safeObject(value: unknown, fallback: Record<string, unknown> = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

function safeArray(value: unknown) {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

function normalizeNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function normalizeDependencyKind(kind: string | null | undefined) {
  if (!kind) return "blocking";
  if (!ALLOWED_DEPENDENCY_KINDS.has(kind)) {
    throw new Error(`Unsupported dependency_kind "${kind}"`);
  }
  return kind;
}

function isMissingSchemaFeature(message: string) {
  return (
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

export interface GoalDependencyInput {
  dependsOnGoalId: string;
  dependencyKind?: string;
}

export interface CreateTaskInput {
  title: string;
  description: string | null;
  passingSpec: string | null;
  creditReward: number;
  createdBy: string;
  priority?: number;
  methodologyVersion?: string;
  metadata?: Record<string, unknown>;
  assignedTo?: string | null;
  inputSpec?: unknown[];
  outputSpec?: unknown[];
  retryPolicy?: Record<string, unknown>;
  verificationMethod?: string | null;
  verificationTarget?: string | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
}

export interface CreateGoalInput {
  taskId: string;
  title: string;
  description: string | null;
  parentGoalId: string | null;
  passingSpec?: string | null;
  requiresAllSubgoals?: boolean;
  assignedAgentId?: string | null;
  creditReward?: number;
  verificationMethod?: string | null;
  verificationTarget?: string | null;
  orchestrationRole?: string;
  nodeType?: string;
  inputSpec?: unknown[];
  outputSpec?: unknown[];
  retryPolicy?: Record<string, unknown>;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  metadata?: Record<string, unknown>;
  dependencyGoalIds?: string[];
  dependencies?: GoalDependencyInput[];
}

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    created_by: (row.created_by as string) ?? (row.created_by_account_id as string) ?? "",
    status: (row.status as Task["status"]) ?? "open",
    priority: Number(row.priority ?? 50),
    passing_spec: (row.passing_spec as string | null) ?? null,
    credit_reward: row.credit_reward ? Number(row.credit_reward) : null,
    assigned_to: (row.assigned_to as string | null) ?? null,
    deadline: (row.deadline as string | null) ?? null,
    methodology_version: (row.methodology_version as string) ?? "v2",
    metadata: safeObject(row.metadata),
    input_spec: safeArray(row.input_spec),
    output_spec: safeArray(row.output_spec),
    retry_policy: safeObject(row.retry_policy, { max_attempts: 1 }),
    verification_method: (row.verification_method as string | null) ?? null,
    verification_target: (row.verification_target as string | null) ?? null,
    estimated_minutes: normalizeNumber(row.estimated_minutes),
    actual_minutes: normalizeNumber(row.actual_minutes),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapGoalRow(row: Record<string, unknown>): Goal {
  const path = (row.path as string) ?? "";
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    parent_goal_id: (row.parent_goal_id as string | null) ?? null,
    path,
    depth: path ? path.split("/").length - 1 : 0,
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
    retry_policy: safeObject(row.retry_policy, { max_attempts: 1 }),
    verification_method: (row.verification_method as string | null) ?? null,
    verification_target: (row.verification_target as string | null) ?? null,
    orchestration_role: (row.orchestration_role as string) ?? "execute",
    node_type: (row.node_type as string) ?? "deliverable",
    blocked_reason: (row.blocked_reason as string | null) ?? null,
    completion_confidence: normalizeNumber(row.completion_confidence),
    estimated_minutes: normalizeNumber(row.estimated_minutes),
    actual_minutes: normalizeNumber(row.actual_minutes),
    metadata: safeObject(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapGoalDependencyRow(row: Record<string, unknown>): GoalDependency {
  return {
    id: row.id as string,
    goal_id: row.goal_id as string,
    depends_on_goal_id: row.depends_on_goal_id as string,
    dependency_kind: normalizeDependencyKind((row.dependency_kind as string | null) ?? "blocking"),
    created_at: row.created_at as string,
  };
}

function normalizeDependencies(input: {
  dependencyGoalIds?: string[];
  dependencies?: GoalDependencyInput[];
}) {
  const normalized = new Map<string, GoalDependencyInput>();

  for (const dependencyId of input.dependencyGoalIds ?? []) {
    if (!dependencyId) continue;
    normalized.set(dependencyId, {
      dependsOnGoalId: dependencyId,
      dependencyKind: "blocking",
    });
  }

  for (const dependency of input.dependencies ?? []) {
    if (!dependency?.dependsOnGoalId) continue;
    normalized.set(dependency.dependsOnGoalId, {
      dependsOnGoalId: dependency.dependsOnGoalId,
      dependencyKind: normalizeDependencyKind(dependency.dependencyKind),
    });
  }

  return [...normalized.values()];
}

function buildDependencyGraph(
  goalIds: string[],
  dependencyRows: Array<Pick<GoalDependencyRow, "goal_id" | "depends_on_goal_id">>,
  goalId: string,
  dependencies: GoalDependencyInput[]
) {
  const adjacency = new Map<string, string[]>();
  for (const id of goalIds) {
    adjacency.set(id, []);
  }

  for (const dependency of dependencyRows) {
    if (dependency.goal_id === goalId) continue;
    adjacency.set(dependency.goal_id, [
      ...(adjacency.get(dependency.goal_id) ?? []),
      dependency.depends_on_goal_id,
    ]);
  }

  adjacency.set(
    goalId,
    dependencies.map((dependency) => dependency.dependsOnGoalId)
  );

  return adjacency;
}

function assertAcyclic(adjacency: Map<string, string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of adjacency.keys()) {
    if (visit(nodeId)) {
      throw new Error("Goal dependencies must remain acyclic");
    }
  }
}

async function validateGoalDependencies(input: {
  taskId: string;
  goalId: string;
  dependencies: GoalDependencyInput[];
}) {
  if (input.dependencies.length === 0) return;

  const db = createAdminClient();
  const { data: goalRows, error: goalError } = await db
    .from("goals")
    .select("id")
    .eq("task_id", input.taskId);

  if (goalError) {
    throw new Error(`Failed to validate goal dependencies: ${goalError.message}`);
  }

  const goalIds = new Set((goalRows ?? []).map((goal) => goal.id));
  goalIds.add(input.goalId);

  for (const dependency of input.dependencies) {
    if (!goalIds.has(dependency.dependsOnGoalId)) {
      throw new Error("Dependency goals must belong to the same task");
    }
    if (dependency.dependsOnGoalId === input.goalId) {
      throw new Error("A goal cannot depend on itself");
    }
  }

  const relevantGoalIds = [...goalIds].filter((id) => id !== input.goalId);
  const { data: dependencyRows, error: dependencyError } = await db
    .from("goal_dependencies")
    .select("goal_id, depends_on_goal_id")
    .in("goal_id", relevantGoalIds.length > 0 ? relevantGoalIds : [""]);

  if (dependencyError) {
    throw new Error(`Failed to validate goal dependencies: ${dependencyError.message}`);
  }

  const adjacency = buildDependencyGraph(
    [...goalIds],
    (dependencyRows ?? []) as Array<Pick<GoalDependencyRow, "goal_id" | "depends_on_goal_id">>,
    input.goalId,
    input.dependencies
  );

  assertAcyclic(adjacency);
}

async function resolveGoalPath(input: {
  taskId: string;
  goalId: string;
  parentGoalId: string | null;
  currentPath?: string | null;
}) {
  const db = createAdminClient();
  if (!input.parentGoalId) {
    return input.goalId;
  }

  const { data: parentGoal, error } = await db
    .from("goals")
    .select("id, task_id, path")
    .eq("id", input.parentGoalId)
    .single();

  if (error || !parentGoal) {
    throw new Error(`Parent goal ${input.parentGoalId} not found`);
  }
  if (parentGoal.task_id !== input.taskId) {
    throw new Error("Parent goal must belong to the same task");
  }
  if (parentGoal.id === input.goalId) {
    throw new Error("A goal cannot be its own parent");
  }
  if (input.currentPath && parentGoal.path.startsWith(`${input.currentPath}/`)) {
    throw new Error("A goal cannot be re-parented under one of its descendants");
  }

  return `${parentGoal.path}/${input.goalId}`;
}

async function syncDescendantPaths(input: {
  taskId: string;
  oldPath: string;
  newPath: string;
}) {
  const db = createAdminClient();
  const { data: descendants, error } = await db
    .from("goals")
    .select("id, path")
    .eq("task_id", input.taskId)
    .like("path", `${input.oldPath}/%`);

  if (error) {
    throw new Error(`Failed to update descendant paths: ${error.message}`);
  }

  await Promise.all(
    (descendants ?? []).map((descendant) =>
      db
        .from("goals")
        .update({
          path: descendant.path.replace(input.oldPath, input.newPath),
          updated_at: new Date().toISOString(),
        })
        .eq("id", descendant.id)
    )
  );
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = createAdminClient();
  const fullInsert = {
    title: input.title,
    description: input.description,
    passing_spec: input.passingSpec,
    credit_reward: input.creditReward.toString(),
    created_by: input.createdBy,
    assigned_to: input.assignedTo ?? null,
    priority: input.priority ?? 50,
    methodology_version: input.methodologyVersion ?? "v2",
    metadata: toJson(input.metadata ?? {}),
    input_spec: toJson(input.inputSpec ?? []),
    output_spec: toJson(input.outputSpec ?? []),
    retry_policy: toJson(input.retryPolicy ?? { max_attempts: 1 }),
    verification_method: input.verificationMethod ?? null,
    verification_target: input.verificationTarget ?? null,
    estimated_minutes: input.estimatedMinutes ?? null,
    actual_minutes: input.actualMinutes ?? null,
    status: "open",
  };

  let { data, error } = await db
    .from("tasks")
    .insert(fullInsert)
    .select("*")
    .single();

  if (error && isMissingSchemaFeature(error.message)) {
    const legacyInsert = {
      title: input.title,
      description: input.description,
      passing_spec: input.passingSpec,
      credit_reward: input.creditReward.toString(),
      created_by: input.createdBy,
      assigned_to: input.assignedTo ?? null,
      status: "open",
    };
    const legacyResult = await db.from("tasks").insert(legacyInsert).select("*").single();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error || !data) {
    throw new Error(`Failed to create task: ${error?.message ?? "unknown"}`);
  }

  return mapTaskRow(data as Record<string, unknown>);
}

export async function getTask(
  taskId: string
): Promise<(Task & { goals: Goal[]; dependencies: GoalDependency[] }) | null> {
  const db = createAdminClient();

  const { data: goalIds } = await db.from("goals").select("id").eq("task_id", taskId);
  const taskGoalIds = (goalIds ?? []).map((goal) => goal.id);

  const [{ data: taskData, error: taskError }, { data: goalsData }, { data: dependencyRows }] =
    await Promise.all([
      db.from("tasks").select("*").eq("id", taskId).single(),
      db.from("goals").select("*").eq("task_id", taskId).order("path", { ascending: true }),
      taskGoalIds.length === 0
        ? Promise.resolve({ data: [] })
        : db
            .from("goal_dependencies")
            .select("id, goal_id, depends_on_goal_id, dependency_kind, created_at")
            .in("goal_id", taskGoalIds),
    ]);

  if (taskError || !taskData) return null;

  return {
    ...mapTaskRow(taskData as Record<string, unknown>),
    goals: (goalsData ?? []).map((row) => mapGoalRow(row as Record<string, unknown>)),
    dependencies: (dependencyRows ?? []).map((row) =>
      mapGoalDependencyRow(row as Record<string, unknown>)
    ),
  };
}

export async function listTasks(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Task[]> {
  const db = createAdminClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = db
    .from("tasks")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  let { data, error } = await query;
  if (error && isMissingSchemaFeature(error.message)) {
    let fallbackQuery = db
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (options?.status) {
      fallbackQuery = fallbackQuery.eq("status", options.status);
    }
    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>));
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  const db = createAdminClient();
  const dbUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.passing_spec !== undefined) dbUpdates.passing_spec = updates.passing_spec;
  if (updates.credit_reward !== undefined) {
    dbUpdates.credit_reward = updates.credit_reward?.toString();
  }
  if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;
  if (updates.methodology_version !== undefined) {
    dbUpdates.methodology_version = updates.methodology_version;
  }
  if (updates.metadata !== undefined) dbUpdates.metadata = toJson(updates.metadata);
  if (updates.input_spec !== undefined) dbUpdates.input_spec = toJson(updates.input_spec);
  if (updates.output_spec !== undefined) dbUpdates.output_spec = toJson(updates.output_spec);
  if (updates.retry_policy !== undefined) dbUpdates.retry_policy = toJson(updates.retry_policy);
  if (updates.verification_method !== undefined) {
    dbUpdates.verification_method = updates.verification_method;
  }
  if (updates.verification_target !== undefined) {
    dbUpdates.verification_target = updates.verification_target;
  }
  if (updates.estimated_minutes !== undefined) {
    dbUpdates.estimated_minutes = updates.estimated_minutes;
  }
  if (updates.actual_minutes !== undefined) {
    dbUpdates.actual_minutes = updates.actual_minutes;
  }
  dbUpdates.updated_at = new Date().toISOString();

  let { data, error } = await db
    .from("tasks")
    .update(dbUpdates)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error && isMissingSchemaFeature(error.message)) {
    const legacyUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) legacyUpdates.title = updates.title;
    if (updates.description !== undefined) legacyUpdates.description = updates.description;
    if (updates.status !== undefined) legacyUpdates.status = updates.status;
    if (updates.passing_spec !== undefined) legacyUpdates.passing_spec = updates.passing_spec;
    if (updates.credit_reward !== undefined) {
      legacyUpdates.credit_reward = updates.credit_reward?.toString();
    }
    if (updates.assigned_to !== undefined) legacyUpdates.assigned_to = updates.assigned_to;
    legacyUpdates.updated_at = new Date().toISOString();

    const legacyResult = await db
      .from("tasks")
      .update(legacyUpdates)
      .eq("id", taskId)
      .select("*")
      .single();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error || !data) return null;
  return mapTaskRow(data as Record<string, unknown>);
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const db = createAdminClient();
  const goalId = randomUUID();
  const dependencies = normalizeDependencies(input);

  const path = await resolveGoalPath({
    taskId: input.taskId,
    goalId,
    parentGoalId: input.parentGoalId,
  });

  await validateGoalDependencies({
    taskId: input.taskId,
    goalId,
    dependencies,
  });

  const { data: inserted, error: insertError } = await db
    .from("goals")
    .insert({
      id: goalId,
      task_id: input.taskId,
      parent_goal_id: input.parentGoalId,
      title: input.title,
      description: input.description,
      status: "pending",
      path,
      passing_spec: input.passingSpec ?? null,
      requires_all_subgoals: input.requiresAllSubgoals ?? false,
      assigned_agent_id: input.assignedAgentId ?? null,
      credit_reward: (input.creditReward ?? 0).toString(),
      input_spec: toJson(input.inputSpec ?? []),
      output_spec: toJson(input.outputSpec ?? []),
      retry_policy: toJson(input.retryPolicy ?? { max_attempts: 1 }),
      estimated_minutes: input.estimatedMinutes ?? null,
      actual_minutes: input.actualMinutes ?? null,
      verification_method: input.verificationMethod ?? null,
      verification_target: input.verificationTarget ?? null,
      orchestration_role: input.orchestrationRole ?? "execute",
      node_type: input.nodeType ?? "deliverable",
      metadata: toJson(input.metadata ?? {}),
      evidence: toJson([]),
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create goal: ${insertError?.message ?? "unknown"}`);
  }

  if (dependencies.length > 0) {
    const dependencyRows = dependencies.map((dependency) => ({
      goal_id: goalId,
      depends_on_goal_id: dependency.dependsOnGoalId,
      dependency_kind: normalizeDependencyKind(dependency.dependencyKind),
    }));
    const { error: dependencyError } = await db.from("goal_dependencies").insert(dependencyRows);
    if (dependencyError) {
      throw new Error(`Failed to create goal dependencies: ${dependencyError.message}`);
    }
  }

  return mapGoalRow(inserted as Record<string, unknown>);
}

export async function getGoals(taskId: string): Promise<Goal[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("goals")
    .select("*")
    .eq("task_id", taskId)
    .order("path", { ascending: true });

  if (error) {
    throw new Error(`Failed to get goals: ${error.message}`);
  }

  return (data ?? []).map((row) => mapGoalRow(row as Record<string, unknown>));
}

export async function getGoalDependencies(taskId: string): Promise<GoalDependency[]> {
  const db = createAdminClient();
  const { data: goals } = await db.from("goals").select("id").eq("task_id", taskId);
  const goalIds = (goals ?? []).map((goal) => goal.id);
  if (goalIds.length === 0) return [];

  const { data, error } = await db
    .from("goal_dependencies")
    .select("id, goal_id, depends_on_goal_id, dependency_kind, created_at")
    .in("goal_id", goalIds);

  if (error) {
    throw new Error(`Failed to get goal dependencies: ${error.message}`);
  }

  return (data ?? []).map((row) => mapGoalDependencyRow(row as Record<string, unknown>));
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Goal> & {
    dependency_goal_ids?: string[];
    dependencies?: GoalDependencyInput[];
  }
): Promise<Goal | null> {
  const db = createAdminClient();
  const { data: currentGoal, error: currentGoalError } = await db
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (currentGoalError || !currentGoal) return null;

  const dbUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.passing_spec !== undefined) dbUpdates.passing_spec = updates.passing_spec;
  if (updates.requires_all_subgoals !== undefined) {
    dbUpdates.requires_all_subgoals = updates.requires_all_subgoals;
  }
  if (updates.assigned_agent_id !== undefined) {
    dbUpdates.assigned_agent_id = updates.assigned_agent_id;
  }
  if (updates.credit_reward !== undefined) {
    dbUpdates.credit_reward = updates.credit_reward?.toString();
  }
  if (updates.metadata !== undefined) dbUpdates.metadata = toJson(updates.metadata);
  if (updates.evidence !== undefined) dbUpdates.evidence = toJson(updates.evidence);
  if (updates.input_spec !== undefined) dbUpdates.input_spec = toJson(updates.input_spec);
  if (updates.output_spec !== undefined) dbUpdates.output_spec = toJson(updates.output_spec);
  if (updates.retry_policy !== undefined) dbUpdates.retry_policy = toJson(updates.retry_policy);
  if (updates.verification_method !== undefined) {
    dbUpdates.verification_method = updates.verification_method;
  }
  if (updates.verification_target !== undefined) {
    dbUpdates.verification_target = updates.verification_target;
  }
  if (updates.orchestration_role !== undefined) {
    dbUpdates.orchestration_role = updates.orchestration_role;
  }
  if (updates.node_type !== undefined) dbUpdates.node_type = updates.node_type;
  if (updates.blocked_reason !== undefined) dbUpdates.blocked_reason = updates.blocked_reason;
  if (updates.completion_confidence !== undefined) {
    dbUpdates.completion_confidence = updates.completion_confidence;
  }
  if (updates.estimated_minutes !== undefined) {
    dbUpdates.estimated_minutes = updates.estimated_minutes;
  }
  if (updates.actual_minutes !== undefined) {
    dbUpdates.actual_minutes = updates.actual_minutes;
  }

  let nextPath = currentGoal.path as string;
  if (updates.parent_goal_id !== undefined) {
    nextPath = await resolveGoalPath({
      taskId: currentGoal.task_id,
      goalId,
      parentGoalId: updates.parent_goal_id ?? null,
      currentPath: currentGoal.path,
    });
    dbUpdates.parent_goal_id = updates.parent_goal_id ?? null;
    dbUpdates.path = nextPath;
  }

  const dependencies =
    updates.dependency_goal_ids !== undefined || updates.dependencies !== undefined
      ? normalizeDependencies({
          dependencyGoalIds: updates.dependency_goal_ids,
          dependencies: updates.dependencies,
        })
      : null;

  if (dependencies) {
    await validateGoalDependencies({
      taskId: currentGoal.task_id,
      goalId,
      dependencies,
    });
  }

  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("goals")
    .update(dbUpdates)
    .eq("id", goalId)
    .select("*")
    .single();

  if (error || !data) return null;

  if (updates.parent_goal_id !== undefined && currentGoal.path !== nextPath) {
    await syncDescendantPaths({
      taskId: currentGoal.task_id,
      oldPath: currentGoal.path,
      newPath: nextPath,
    });
  }

  if (dependencies) {
    await db.from("goal_dependencies").delete().eq("goal_id", goalId);
    if (dependencies.length > 0) {
      const dependencyRows = dependencies.map((dependency) => ({
        goal_id: goalId,
        depends_on_goal_id: dependency.dependsOnGoalId,
        dependency_kind: normalizeDependencyKind(dependency.dependencyKind),
      }));
      const { error: dependencyError } = await db
        .from("goal_dependencies")
        .insert(dependencyRows);
      if (dependencyError) {
        throw new Error(`Failed to update goal dependencies: ${dependencyError.message}`);
      }
    }
  }

  return mapGoalRow(data as Record<string, unknown>);
}
