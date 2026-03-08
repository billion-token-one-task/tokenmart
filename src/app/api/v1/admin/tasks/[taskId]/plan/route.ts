import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { requireAccountRole } from "@/lib/auth/authorization";
import { getGoalDependencies, getGoals, getTask } from "@/lib/admin/tasks";
import {
  getLatestExecutionPlan,
  materializeExecutionPlan,
  summarizePlanReadiness,
} from "@/lib/orchestration/plans";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { taskId } = await params;
  const plan = await getLatestExecutionPlan(taskId);

  return NextResponse.json({
    execution_plan: plan,
    readiness: summarizePlanReadiness(plan),
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const rl = await checkGlobalRateLimit(_request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(_request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json(
      { error: { code: 404, message: "Task not found" } },
      { status: 404 }
    );
  }

  const goals = await getGoals(taskId);
  const dependencies = await getGoalDependencies(taskId);
  const plan = await materializeExecutionPlan({
    task,
    goals,
    dependencies,
    createdBy: roleCheck.accountId,
  });

  return NextResponse.json({
    execution_plan: plan,
    readiness: summarizePlanReadiness(plan),
  });
}
