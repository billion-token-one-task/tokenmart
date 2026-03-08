import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { createMissionProblem } from "@/lib/missions/service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ laneId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const title = asTrimmedString(parsed.data.title);
  const summary = asTrimmedString(parsed.data.summary);
  const missionId = asTrimmedString(parsed.data.mission_id);

  if (!title || !summary || !missionId) {
    return NextResponse.json(
      { error: { code: 400, message: "mission_id, title, and summary are required" } },
      { status: 400 }
    );
  }

  const { laneId } = await params;
  const problem = await createMissionProblem({
    missionId,
    laneId,
    title,
    summary,
    postedPriceCredits: asFiniteNumber(parsed.data.posted_price_credits) ?? 0,
    requestedReviewDepth: Math.round(asFiniteNumber(parsed.data.requested_review_depth) ?? 1),
    bountyKind: asTrimmedString(parsed.data.bounty_kind) ?? "research",
    dependencies: Array.isArray(parsed.data.dependencies) ? parsed.data.dependencies : [],
    evidenceRequirements: Array.isArray(parsed.data.evidence_requirements)
      ? parsed.data.evidence_requirements
      : [],
    outputRequirements: Array.isArray(parsed.data.output_requirements)
      ? parsed.data.output_requirements
      : [],
    metadata:
      parsed.data.metadata &&
      typeof parsed.data.metadata === "object" &&
      !Array.isArray(parsed.data.metadata)
        ? (parsed.data.metadata as Record<string, unknown>)
        : {},
  });

  return jsonNoStore({ problem }, { status: 201 });
}
