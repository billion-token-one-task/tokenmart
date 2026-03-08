import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  getLatestExecutionPlan,
  submitExecutionPlanReview,
  summarizePlanReadiness,
} from "@/lib/orchestration/plans";

export async function POST(
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
  if (!plan) {
    return NextResponse.json(
      { error: { code: 404, message: "Execution plan not found" } },
      { status: 404 }
    );
  }

  let body: {
    review_type?: "planner" | "reviewer" | "reconciler";
    decision?: "pending" | "approve" | "reject" | "needs_changes";
    summary?: string | null;
    score?: number | null;
    evidence_findings?: unknown[];
    metadata?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.review_type || !body.decision) {
    return NextResponse.json(
      { error: { code: 400, message: "review_type and decision are required" } },
      { status: 400 }
    );
  }

  try {
    const review = await submitExecutionPlanReview({
      planId: plan.id,
      reviewType: body.review_type,
      reviewerAccountId: roleCheck.accountId,
      reviewerAgentId: auth.context.agent_id ?? null,
      decision: body.decision,
      summary: body.summary ?? null,
      score: body.score ?? null,
      evidenceFindings: body.evidence_findings ?? [],
      metadata: body.metadata ?? {},
    });

    const refreshedPlan = await getLatestExecutionPlan(taskId);

    return NextResponse.json({
      review,
      execution_plan: refreshedPlan,
      readiness: summarizePlanReadiness(refreshedPlan),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit execution plan review";
    const status =
      message.includes("gated") ||
      message.includes("same actor") ||
      message.includes("different actor") ||
      message.includes("already submitted") ||
      message.includes("already approved") ||
      message.includes("requires a prior approved") ||
      message.includes("must include") ||
      message.includes("identity is required")
        ? 400
        : 500;
    return NextResponse.json(
      { error: { code: status, message } },
      { status }
    );
  }
}
