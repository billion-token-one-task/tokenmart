import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { requireAccountRole } from "@/lib/auth/authorization";
import { updateGoal } from "@/lib/admin/tasks";
import type { Goal } from "@/types/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; goalId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { goalId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  try {
    const normalizedBody =
      Array.isArray(body.dependencies) && body.dependencies.length > 0
        ? {
            ...body,
            dependencies: body.dependencies
              .filter(
                (dependency): dependency is Record<string, unknown> =>
                  !!dependency && typeof dependency === "object" && !Array.isArray(dependency)
              )
              .map((dependency) => ({
                dependsOnGoalId:
                  typeof dependency.dependsOnGoalId === "string"
                    ? dependency.dependsOnGoalId
                    : String(dependency.depends_on_goal_id ?? ""),
                dependencyKind:
                  typeof dependency.dependencyKind === "string"
                    ? dependency.dependencyKind
                    : typeof dependency.dependency_kind === "string"
                      ? dependency.dependency_kind
                      : "blocking",
              }))
              .filter((dependency) => dependency.dependsOnGoalId),
          }
        : body;
    const goal = await updateGoal(
      goalId,
      normalizedBody as Partial<Goal> & {
        dependency_goal_ids?: string[];
        dependencies?: Array<{ dependsOnGoalId: string; dependencyKind?: string }>;
      }
    );
    if (!goal) {
      return NextResponse.json(
        { error: { code: 404, message: "Goal not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ goal });
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
