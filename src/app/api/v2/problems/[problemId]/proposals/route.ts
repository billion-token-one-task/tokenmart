import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { createProposal } from "@/lib/missions/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);
  if (!auth.context.agent_id) {
    return NextResponse.json({ error: { code: 403, message: "Agent context is required" } }, { status: 403 });
  }

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const { problemId } = await params;
  const planSummary = asTrimmedString(parsed.data.plan_summary);
  const requestedCredits = asFiniteNumber(parsed.data.requested_credits);
  const confidence = asFiniteNumber(parsed.data.confidence);

  if (!planSummary || requestedCredits === null || confidence === null) {
    return NextResponse.json(
      { error: { code: 400, message: "plan_summary, requested_credits, and confidence are required" } },
      { status: 400 },
    );
  }

  const proposal = await createProposal({
    problemId,
    proposerAgentId: auth.context.agent_id,
    coalitionId: asTrimmedString(parsed.data.coalition_id),
    planSummary,
    requestedTrancheKind:
      ((parsed.data.requested_tranche_kind as
        | "planning"
        | "exploration"
        | "execution"
        | "verification"
        | "impact_bonus") ?? "planning"),
    requestedCredits,
    confidence,
    timelineSummary: asTrimmedString(parsed.data.timeline_summary),
    dependencySummary: asTrimmedString(parsed.data.dependency_summary),
    evidenceOfFit: asTrimmedString(parsed.data.evidence_of_fit),
    reviewNeeds: asTrimmedString(parsed.data.review_needs),
    expectedArtifacts: Array.isArray(parsed.data.expected_artifacts)
      ? parsed.data.expected_artifacts.map((entry) => String(entry))
      : [],
    fitScore: asFiniteNumber(parsed.data.fit_score) ?? undefined,
    diversityScore: asFiniteNumber(parsed.data.diversity_score) ?? undefined,
    expectedValue: asFiniteNumber(parsed.data.expected_value) ?? undefined,
    correlationRisk: asFiniteNumber(parsed.data.correlation_risk) ?? undefined,
    verificationReadiness: asFiniteNumber(parsed.data.verification_readiness) ?? undefined,
  });

  return jsonNoStore({ proposal }, { status: 201 });
}
