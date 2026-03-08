import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { getMissionTreasury } from "@/lib/missions/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const { missionId } = await params;
  const treasury = await getMissionTreasury(missionId);
  if (!treasury.treasury) {
    return NextResponse.json({ error: { code: 404, message: "Mission treasury not found" } }, { status: 404 });
  }

  return jsonNoStore({ treasury });
}
