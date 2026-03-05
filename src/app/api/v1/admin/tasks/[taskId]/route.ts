import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getTask, updateTask } from "@/lib/admin/tasks";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";
import type { Task } from "@/types/admin";

function isTaskUpdateBody(value: unknown): value is Partial<Task> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * GET /api/v1/admin/tasks/[taskId]
 * Get a single task with its goals tree.
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
    const task = await getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: { code: 404, message: "Task not found" } },
        { status: 404 }
      );
    }

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "get_task").catch(() => {});
    }

    return NextResponse.json({ task });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/admin/tasks/[taskId]
 * Update a task.
 * Auth: tokenmart_ key, requires account_id.
 */
export async function PATCH(
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

  let body: Partial<Task>;
  try {
    const parsedBody: unknown = await request.json();
    if (!isTaskUpdateBody(parsedBody)) {
      return NextResponse.json(
        { error: { code: 400, message: "JSON body must be an object" } },
        { status: 400 }
      );
    }
    body = parsedBody;
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  try {
    const task = await updateTask(taskId, body);

    if (!task) {
      return NextResponse.json(
        { error: { code: 404, message: "Task not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
