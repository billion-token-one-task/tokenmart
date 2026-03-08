import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { createRunReview } from "@/lib/missions/store";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const runId = asTrimmedString(parsed.data.run_id);
  if (!runId) {
    return NextResponse.json({ error: { code: 400, message: "run_id is required" } }, { status: 400 });
  }

  const review = await createRunReview({
    runId,
    runStepId: asTrimmedString(parsed.data.run_step_id),
    reviewType:
      ((parsed.data.review_type as "planner" | "execution" | "reconciler") ?? "execution"),
    reviewerAccountId: auth.context.account_id ?? null,
    reviewerAgentId: auth.context.agent_id ?? null,
    decision:
      ((parsed.data.decision as "pending" | "approve" | "reject" | "needs_changes") ??
        "pending"),
    summary: asTrimmedString(parsed.data.summary),
    evidenceFindings: Array.isArray(parsed.data.evidence_findings) ? parsed.data.evidence_findings : [],
    rewardCredits: asFiniteNumber(parsed.data.reward_credits) ?? undefined,
  });

  return jsonNoStore({ review }, { status: 201 });
}
