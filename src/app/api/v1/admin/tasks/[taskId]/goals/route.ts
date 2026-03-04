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
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
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
    const goal = await createGoal(
      taskId,
      body.title,
      body.description ?? null,
      body.parent_goal_id ?? null
    );

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "create_goal").catch(() => {});
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
