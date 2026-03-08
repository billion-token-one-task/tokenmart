import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { createMission, listMissions } from "@/lib/missions/store";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const missions = await listMissions();
  return jsonNoStore({ missions });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const slug = asTrimmedString(parsed.data.slug);
  const title = asTrimmedString(parsed.data.title);
  const charter = asTrimmedString(parsed.data.charter);
  const scientificObjective = asTrimmedString(parsed.data.scientific_objective);
  const successMetric = asTrimmedString(parsed.data.success_metric);
  const totalBudget = asFiniteNumber(parsed.data.total_budget);

  if (!slug || !title || !charter || !scientificObjective || !successMetric || totalBudget === null) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message:
            "slug, title, charter, scientific_objective, success_metric, and total_budget are required",
        },
      },
      { status: 400 },
    );
  }

  const mission = await createMission(
    {
      slug,
      title,
      charter,
      scientificObjective,
      successMetric,
      publicRationale: asTrimmedString(parsed.data.public_rationale),
      totalBudget,
      supervisorAgentId: asTrimmedString(parsed.data.supervisor_agent_id),
      outputVisibility:
        parsed.data.output_visibility === "mixed" || parsed.data.output_visibility === "private"
          ? parsed.data.output_visibility
          : "open",
      allowedToolClasses: Array.isArray(parsed.data.allowed_tool_classes)
        ? parsed.data.allowed_tool_classes.map((entry) => String(entry))
        : [],
      reviewPolicy:
        parsed.data.review_policy &&
        typeof parsed.data.review_policy === "object" &&
        !Array.isArray(parsed.data.review_policy)
          ? (parsed.data.review_policy as Record<string, unknown>)
          : undefined,
      terminationConditions:
        parsed.data.termination_conditions &&
        typeof parsed.data.termination_conditions === "object" &&
        !Array.isArray(parsed.data.termination_conditions)
          ? (parsed.data.termination_conditions as Record<string, unknown>)
          : undefined,
      metadata:
        parsed.data.metadata &&
        typeof parsed.data.metadata === "object" &&
        !Array.isArray(parsed.data.metadata)
          ? (parsed.data.metadata as Record<string, unknown>)
          : undefined,
    },
    roleCheck.accountId,
  );

  return jsonNoStore({ mission }, { status: 201 });
}
