import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getGoals, createGoal } from "@/lib/admin/tasks";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";

/**
 * GET /api/v1/admin/tasks/[taskId]/goals
 * List goals for a task.
 * Auth: tokenmart_ key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { taskId } = await params;

  try {
    const goals = await getGoals(taskId);

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "list_goals").catch(() => {});
    }

    return NextResponse.json({ goals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("acyclic") ||
      message.includes("same task") ||
      message.includes("itself") ||
      message.includes("Duplicate goal dependencies")
        ? 400
        : 500;
    return NextResponse.json(
      { error: { code: status, message } },
      { status }
    );
  }
}

/**
 * POST /api/v1/admin/tasks/[taskId]/goals
 * Create a goal under a task.
 * Auth: tokenmart_ key.
 * Body: { title, description, parent_goal_id }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { taskId } = await params;

  let body: {
    title?: string;
    description?: string | null;
    parent_goal_id?: string | null;
    passing_spec?: string | null;
    requires_all_subgoals?: boolean;
    assigned_agent_id?: string | null;
    credit_reward?: number;
    verification_method?: string | null;
    verification_target?: string | null;
    orchestration_role?: string;
    node_type?: string;
    input_spec?: unknown[];
    output_spec?: unknown[];
    retry_policy?: Record<string, unknown>;
    estimated_minutes?: number | null;
    actual_minutes?: number | null;
    metadata?: Record<string, unknown>;
    dependency_goal_ids?: string[];
    dependencies?: Array<{
      depends_on_goal_id?: string;
      dependency_kind?: string;
    }>;
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

  try {
    const goal = await createGoal({
      taskId,
      title: body.title,
      description: body.description ?? null,
      parentGoalId: body.parent_goal_id ?? null,
      passingSpec: body.passing_spec ?? null,
      requiresAllSubgoals: body.requires_all_subgoals ?? false,
      assignedAgentId: body.assigned_agent_id ?? null,
      creditReward: body.credit_reward ?? 0,
      verificationMethod: body.verification_method ?? null,
      verificationTarget: body.verification_target ?? null,
      orchestrationRole: body.orchestration_role ?? "execute",
      nodeType: body.node_type ?? "deliverable",
      inputSpec: body.input_spec ?? [],
      outputSpec: body.output_spec ?? [],
      retryPolicy: body.retry_policy ?? { max_attempts: 1 },
      estimatedMinutes: body.estimated_minutes ?? null,
      actualMinutes: body.actual_minutes ?? null,
      metadata: body.metadata ?? {},
      dependencyGoalIds: body.dependency_goal_ids ?? [],
      dependencies: (body.dependencies ?? [])
        .filter((dependency) => typeof dependency.depends_on_goal_id === "string")
        .map((dependency) => ({
          dependsOnGoalId: dependency.depends_on_goal_id as string,
          dependencyKind: dependency.dependency_kind ?? "blocking",
        })),
    });

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "create_goal").catch(() => {});
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 400, message } },
      { status: 400 }
    );
  }
}
