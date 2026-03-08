import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { getMissionDetail } from "@/lib/missions/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const { missionId } = await params;
  const mission = await getMissionDetail(missionId);
  if (!mission) {
    return NextResponse.json({ error: { code: 404, message: "Mission not found" } }, { status: 404 });
  }

  return jsonNoStore({ mission });
}
