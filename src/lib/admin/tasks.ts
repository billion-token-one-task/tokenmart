import { createAdminClient } from "@/lib/supabase/admin";
import type { Task, Goal } from "@/types/admin";
import { randomUUID } from "crypto";

/**
 * Create a new task.
 */
export async function createTask(
  title: string,
  description: string | null,
  passingSpec: string | null,
  creditReward: number,
  createdBy: string
): Promise<Task> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("tasks")
    .insert({
      title,
      description,
      passing_spec: passingSpec,
      credit_reward: creditReward.toString(),
      created_by: createdBy,
      status: "open",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create task: ${error?.message ?? "unknown"}`);
  }

  return mapTaskRow(data);
}

/**
 * Get a single task with its goals.
 */
export async function getTask(
  taskId: string
): Promise<(Task & { goals: Goal[] }) | null> {
  const db = createAdminClient();

  const { data: taskData, error: taskError } = await db
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !taskData) return null;

  const { data: goalsData } = await db
    .from("goals")
    .select("*")
    .eq("task_id", taskId)
    .order("path", { ascending: true });

  return {
    ...mapTaskRow(taskData),
    goals: (goalsData ?? []).map(mapGoalRow),
  };
}

/**
 * List tasks with optional filters.
 */
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
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return (data ?? []).map(mapTaskRow);
}

/**
 * Update an existing task.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task | null> {
  const db = createAdminClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.passing_spec !== undefined) dbUpdates.passing_spec = updates.passing_spec;
  if (updates.credit_reward !== undefined)
    dbUpdates.credit_reward = updates.credit_reward?.toString();
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("tasks")
    .update(dbUpdates)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error || !data) return null;

  return mapTaskRow(data);
}

/**
 * Create a goal under a task. If parentGoalId is provided, the materialized
 * path is computed as parent.path + "/" + newGoalId.
 */
export async function createGoal(
  taskId: string,
  title: string,
  description: string | null,
  parentGoalId: string | null
): Promise<Goal> {
  const db = createAdminClient();
  const goalId = randomUUID();

  let path = goalId;

  if (parentGoalId) {
    const { data: parentGoal } = await db
      .from("goals")
      .select("id, path, task_id")
      .eq("id", parentGoalId)
      .single();

    if (!parentGoal) {
      throw new Error(`Parent goal ${parentGoalId} not found`);
    }
    if (parentGoal.task_id !== taskId) {
      throw new Error("Parent goal must belong to the same task");
    }

    path = `${parentGoal.path}/${goalId}`;
  }

  const { data: inserted, error: insertError } = await db
    .from("goals")
    .insert({
      id: goalId,
      task_id: taskId,
      parent_goal_id: parentGoalId,
      title,
      description,
      status: "pending",
      path,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create goal: ${insertError?.message ?? "unknown"}`);
  }

  return mapGoalRow(inserted);
}

/**
 * Get all goals for a task, ordered by path.
 */
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

  return (data ?? []).map(mapGoalRow);
}

/**
 * Update an existing goal.
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>
): Promise<Goal | null> {
  const db = createAdminClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.passing_spec !== undefined) dbUpdates.passing_spec = updates.passing_spec;
  if (updates.requires_all_subgoals !== undefined)
    dbUpdates.requires_all_subgoals = updates.requires_all_subgoals;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("goals")
    .update(dbUpdates)
    .eq("id", goalId)
    .select("*")
    .single();

  if (error || !data) return null;

  return mapGoalRow(data);
}

// ---------------------------------------------------------------------------
// Internal mappers from DB rows to typed interfaces
// ---------------------------------------------------------------------------

type TaskRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createAdminClient>["from"]>
  > extends { data: infer D } ? D : never
>;

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    created_by:
      (row.created_by as string) ??
      (row.created_by_account_id as string) ??
      "",
    status: (row.status as Task["status"]) ?? "open",
    priority: (row.priority as number) ?? 0,
    passing_spec: (row.passing_spec as string | null) ?? null,
    credit_reward: row.credit_reward ? Number(row.credit_reward) : null,
    deadline: (row.deadline as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapGoalRow(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    parent_goal_id: (row.parent_goal_id as string | null) ?? null,
    path: (row.path as string) ?? "",
    depth: ((row.path as string) ?? "").split("/").length - 1,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    passing_spec: (row.passing_spec as string | null) ?? null,
    status: (row.status as Goal["status"]) ?? "pending",
    credit_reward: row.credit_reward ? Number(row.credit_reward) : null,
    assigned_agent_id: (row.assigned_agent_id as string | null) ?? null,
    requires_all_subgoals: (row.requires_all_subgoals as boolean) ?? false,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
