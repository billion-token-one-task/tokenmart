import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { createMissionLane } from "@/lib/missions/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const { missionId } = await params;
  const laneKey = asTrimmedString(parsed.data.lane_key);
  const title = asTrimmedString(parsed.data.title);
  const budgetCeiling = asFiniteNumber(parsed.data.budget_ceiling);
  const perAgentCeiling = asFiniteNumber(parsed.data.per_agent_ceiling);
  const burstCeiling = asFiniteNumber(parsed.data.burst_ceiling);

  if (!laneKey || !title || budgetCeiling === null || perAgentCeiling === null || burstCeiling === null) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "lane_key, title, budget_ceiling, per_agent_ceiling, and burst_ceiling are required",
        },
      },
      { status: 400 },
    );
  }

  const mission = await createMissionLane({
    missionId,
    laneKey,
    title,
    summary: asTrimmedString(parsed.data.summary),
    budgetCeiling,
    perAgentCeiling,
    burstCeiling,
    sortOrder: Number(parsed.data.sort_order ?? 0),
    metadata:
      parsed.data.metadata && typeof parsed.data.metadata === "object" && !Array.isArray(parsed.data.metadata)
        ? (parsed.data.metadata as Record<string, unknown>)
        : undefined,
    initialProblem:
      parsed.data.initial_problem &&
      typeof parsed.data.initial_problem === "object" &&
      !Array.isArray(parsed.data.initial_problem)
        ? {
            title: asTrimmedString((parsed.data.initial_problem as Record<string, unknown>).title) ?? "Open problem",
            statement:
              asTrimmedString((parsed.data.initial_problem as Record<string, unknown>).statement) ??
              "Define the first mission problem for this lane.",
            desiredOutcome: asTrimmedString((parsed.data.initial_problem as Record<string, unknown>).desired_outcome),
            priority: Number((parsed.data.initial_problem as Record<string, unknown>).priority ?? 50),
          }
        : null,
    initialWorkPackage:
      parsed.data.initial_work_package &&
      typeof parsed.data.initial_work_package === "object" &&
      !Array.isArray(parsed.data.initial_work_package)
        ? {
            title:
              asTrimmedString((parsed.data.initial_work_package as Record<string, unknown>).title) ??
              "Initial work package",
            brief:
              asTrimmedString((parsed.data.initial_work_package as Record<string, unknown>).brief) ??
              "Open a first mission work package in this lane.",
            trancheKind:
              ((parsed.data.initial_work_package as Record<string, unknown>).tranche_kind as
                | "planning"
                | "exploration"
                | "execution"
                | "verification"
                | "impact_bonus") ?? "planning",
            postedReward: asFiniteNumber((parsed.data.initial_work_package as Record<string, unknown>).posted_reward) ?? 0,
            budgetCap: asFiniteNumber((parsed.data.initial_work_package as Record<string, unknown>).budget_cap) ?? 0,
            deliverableSpec:
              (parsed.data.initial_work_package as Record<string, unknown>).deliverable_spec &&
              typeof (parsed.data.initial_work_package as Record<string, unknown>).deliverable_spec === "object" &&
              !Array.isArray((parsed.data.initial_work_package as Record<string, unknown>).deliverable_spec)
                ? ((parsed.data.initial_work_package as Record<string, unknown>).deliverable_spec as Record<string, unknown>)
                : undefined,
            evaluationSpec:
              (parsed.data.initial_work_package as Record<string, unknown>).evaluation_spec &&
              typeof (parsed.data.initial_work_package as Record<string, unknown>).evaluation_spec === "object" &&
              !Array.isArray((parsed.data.initial_work_package as Record<string, unknown>).evaluation_spec)
                ? ((parsed.data.initial_work_package as Record<string, unknown>).evaluation_spec as Record<string, unknown>)
                : undefined,
            dependencies: Array.isArray((parsed.data.initial_work_package as Record<string, unknown>).dependencies)
              ? ((parsed.data.initial_work_package as Record<string, unknown>).dependencies as unknown[]).map((entry) => String(entry))
              : undefined,
            reviewRequired:
              typeof (parsed.data.initial_work_package as Record<string, unknown>).review_required === "boolean"
                ? Boolean((parsed.data.initial_work_package as Record<string, unknown>).review_required)
                : undefined,
          }
        : null,
  });

  return jsonNoStore({ mission }, { status: 201 });
}
