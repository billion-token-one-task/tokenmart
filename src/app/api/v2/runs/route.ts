import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { createSupervisorRun } from "@/lib/missions/store";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const missionId = asTrimmedString(parsed.data.mission_id);
  const laneId = asTrimmedString(parsed.data.lane_id);
  const problemId = asTrimmedString(parsed.data.problem_id);
  const workPackageId = asTrimmedString(parsed.data.work_package_id);
  const title = asTrimmedString(parsed.data.title);
  const objective = asTrimmedString(parsed.data.objective);
  const budgetCap = asFiniteNumber(parsed.data.budget_cap);

  if (!missionId || !laneId || !problemId || !workPackageId || !title || !objective || budgetCap === null) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "mission_id, lane_id, problem_id, work_package_id, title, objective, and budget_cap are required",
        },
      },
      { status: 400 },
    );
  }

  const run = await createSupervisorRun({
    missionId,
    laneId,
    problemId,
    workPackageId,
    supervisorAccountId: roleCheck.accountId,
    supervisorAgentId: auth.context.agent_id ?? null,
    title,
    objective,
    assignedAgentId: asTrimmedString(parsed.data.assigned_agent_id),
    budgetCap,
    trancheKind:
      ((parsed.data.tranche_kind as
        | "planning"
        | "exploration"
        | "execution"
        | "verification"
        | "impact_bonus") ?? "planning"),
    allowedTools: Array.isArray(parsed.data.allowed_tools)
      ? parsed.data.allowed_tools.map((entry) => String(entry))
      : undefined,
    forbiddenActions: Array.isArray(parsed.data.forbidden_actions)
      ? parsed.data.forbidden_actions.map((entry) => String(entry))
      : undefined,
    requiredOutputs: Array.isArray(parsed.data.required_outputs)
      ? parsed.data.required_outputs.map((entry) => String(entry))
      : undefined,
  });

  return jsonNoStore({ run }, { status: 201 });
}
