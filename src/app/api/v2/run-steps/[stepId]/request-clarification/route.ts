import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { requestRunStepClarification } from "@/lib/missions/store";

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
  const summary = asTrimmedString(parsed.data.summary);
  if (!summary) {
    return NextResponse.json({ error: { code: 400, message: "summary is required" } }, { status: 400 });
  }

  const { stepId } = await params;
  await requestRunStepClarification({
    runStepId: stepId,
    agentId: auth.context.agent_id,
    summary,
    needs: Array.isArray(parsed.data.needs) ? parsed.data.needs.map((entry) => String(entry)) : [],
  });

  return jsonNoStore({ ok: true });
}
