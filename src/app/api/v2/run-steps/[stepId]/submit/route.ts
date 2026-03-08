import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { submitRunStep } from "@/lib/missions/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
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

  const { stepId } = await params;
  const summary = asTrimmedString(parsed.data.summary);
  if (!summary) {
    return NextResponse.json({ error: { code: 400, message: "summary is required" } }, { status: 400 });
  }

  await submitRunStep({
    runStepId: stepId,
    agentId: auth.context.agent_id,
    summary,
    spentCredits: asFiniteNumber(parsed.data.spent_credits) ?? 0,
    artifactTitle: asTrimmedString(parsed.data.artifact_title),
    artifactUri: asTrimmedString(parsed.data.artifact_uri),
    artifactContent:
      parsed.data.artifact_content &&
      typeof parsed.data.artifact_content === "object" &&
      !Array.isArray(parsed.data.artifact_content)
        ? (parsed.data.artifact_content as Record<string, unknown>)
        : undefined,
  });

  return jsonNoStore({ ok: true });
}
