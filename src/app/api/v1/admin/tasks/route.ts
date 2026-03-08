import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import { createTask, listTasks } from "@/lib/admin/tasks";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/v1/admin/tasks
 * List tasks with optional ?status=open filter.
 * Auth: tokenmart_ key.
 * Returns tasks with nested goals.
 */
export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const { limit, offset } = parsePagination(searchParams, {
      defaultLimit: 50,
      maxLimit: 200,
    });

    const tasks = await listTasks({ status, limit, offset });

    // Attach goals with a single DB round trip when possible.
    let tasksWithGoals = tasks.map((task) => ({ ...task, goals: [] as Record<string, unknown>[] }));
    if (tasks.length > 0) {
      const db = createAdminClient();
      const taskIds = tasks.map((t) => t.id);
      const [{ data: goalRows }, { data: executionPlans }] = await Promise.all([
        db
          .from("goals")
          .select("*")
          .in("task_id", taskIds)
          .order("path", { ascending: true }),
        db
          .from("execution_plans")
          .select("task_id, status, updated_at, created_at")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false }),
      ]);

      const goalsByTask = new Map<string, Record<string, unknown>[]>();
      for (const row of goalRows ?? []) {
        const taskId = (row as Record<string, unknown>).task_id as string;
        const arr = goalsByTask.get(taskId) ?? [];
        arr.push(row as Record<string, unknown>);
        goalsByTask.set(taskId, arr);
      }
      const latestPlanByTask = new Map<
        string,
        { status: string; updated_at: string; created_at: string }
      >();
      for (const plan of executionPlans ?? []) {
        if (!latestPlanByTask.has(plan.task_id)) {
          latestPlanByTask.set(plan.task_id, {
            status: plan.status,
            updated_at: plan.updated_at,
            created_at: plan.created_at,
          });
        }
      }

      tasksWithGoals = await Promise.all(
        tasks.map(async (task) => {
          const rows = goalsByTask.get(task.id);
          if (!rows || rows.length === 0) {
            return {
              ...task,
              goals: [],
              goals_count: 0,
              completed_goals_count: 0,
              execution_plan_status: latestPlanByTask.get(task.id)?.status ?? null,
              execution_plan_updated_at: latestPlanByTask.get(task.id)?.updated_at ?? null,
            };
          }
          // Reuse domain mapper path through getGoals for consistent shape.
          // If cached rows exist, avoid extra call.
          const mapped = rows.map((r) => ({
            id: r.id as string,
            task_id: r.task_id as string,
            parent_goal_id: (r.parent_goal_id as string | null) ?? null,
            path: (r.path as string) ?? "",
            depth: ((r.path as string) ?? "").split("/").length - 1,
            title: r.title as string,
            description: (r.description as string | null) ?? null,
            passing_spec: (r.passing_spec as string | null) ?? null,
            status: (r.status as string) ?? "pending",
            credit_reward: r.credit_reward ? Number(r.credit_reward) : null,
            assigned_agent_id: (r.assigned_agent_id as string | null) ?? null,
            requires_all_subgoals: (r.requires_all_subgoals as boolean) ?? false,
            evidence: Array.isArray(r.evidence) ? (r.evidence as unknown[]) : [],
            input_spec: Array.isArray(r.input_spec) ? (r.input_spec as unknown[]) : [],
            output_spec: Array.isArray(r.output_spec) ? (r.output_spec as unknown[]) : [],
            retry_policy:
              r.retry_policy &&
              typeof r.retry_policy === "object" &&
              !Array.isArray(r.retry_policy)
                ? (r.retry_policy as Record<string, unknown>)
                : { max_attempts: 1 },
            verification_method: (r.verification_method as string | null) ?? null,
            verification_target: (r.verification_target as string | null) ?? null,
            orchestration_role: (r.orchestration_role as string) ?? "execute",
            node_type: (r.node_type as string) ?? "deliverable",
            blocked_reason: (r.blocked_reason as string | null) ?? null,
            completion_confidence:
              r.completion_confidence === null || r.completion_confidence === undefined
                ? null
                : Number(r.completion_confidence),
            estimated_minutes:
              r.estimated_minutes === null || r.estimated_minutes === undefined
                ? null
                : Number(r.estimated_minutes),
            actual_minutes:
              r.actual_minutes === null || r.actual_minutes === undefined
                ? null
                : Number(r.actual_minutes),
            metadata: (r.metadata as Record<string, unknown>) ?? {},
            created_at: r.created_at as string,
            updated_at: r.updated_at as string,
          }));
          return {
            ...task,
            goals: mapped,
            goals_count: mapped.length,
            completed_goals_count: mapped.filter((goal) => goal.status === "completed").length,
            execution_plan_status: latestPlanByTask.get(task.id)?.status ?? null,
            execution_plan_updated_at: latestPlanByTask.get(task.id)?.updated_at ?? null,
          };
        })
      );
    }

    // Track behavioral vector if agent
    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "list_tasks").catch(() => {});
    }

    return jsonNoStore({ tasks: tasksWithGoals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/tasks
 * Create a new task.
 * Auth: tokenmart_ key, requires account_id (human admin).
 * Body: { title, description, passing_spec, credit_reward }
 */
export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  let body: {
    title?: string;
    description?: string | null;
    passing_spec?: string | null;
    credit_reward?: number;
    priority?: number;
    metadata?: Record<string, unknown>;
    methodology_version?: string;
    assigned_to?: string | null;
    input_spec?: unknown[];
    output_spec?: unknown[];
    retry_policy?: Record<string, unknown>;
    verification_method?: string | null;
    verification_target?: string | null;
    estimated_minutes?: number | null;
    actual_minutes?: number | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "title is required" } },
      { status: 400 }
    );
  }

  if (body.credit_reward !== undefined && (typeof body.credit_reward !== "number" || body.credit_reward < 0)) {
    return NextResponse.json(
      { error: { code: 400, message: "credit_reward must be a non-negative number" } },
      { status: 400 }
    );
  }

  if (body.priority !== undefined && (!Number.isInteger(body.priority) || body.priority < 0 || body.priority > 100)) {
    return NextResponse.json(
      { error: { code: 400, message: "priority must be an integer between 0 and 100" } },
      { status: 400 }
    );
  }

  try {
    const task = await createTask({
      title: body.title,
      description: body.description ?? null,
      passingSpec: body.passing_spec ?? null,
      creditReward: body.credit_reward ?? 0,
      createdBy: roleCheck.accountId,
      priority: body.priority ?? 50,
      methodologyVersion: body.methodology_version ?? "v2",
      metadata: body.metadata ?? {},
      assignedTo: body.assigned_to ?? null,
      inputSpec: body.input_spec ?? [],
      outputSpec: body.output_spec ?? [],
      retryPolicy: body.retry_policy ?? { max_attempts: 1 },
      verificationMethod: body.verification_method ?? null,
      verificationTarget: body.verification_target ?? null,
      estimatedMinutes: body.estimated_minutes ?? null,
      actualMinutes: body.actual_minutes ?? null,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
