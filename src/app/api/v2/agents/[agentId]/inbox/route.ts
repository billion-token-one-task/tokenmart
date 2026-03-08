import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { getAgentMissionInbox } from "@/lib/missions/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  const { agentId } = await params;
  if (auth.context.agent_id !== agentId) {
    const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
    if (!roleCheck.ok) {
      return NextResponse.json(
        { error: { code: 403, message: "You may only read your own inbox unless you are admin" } },
        { status: 403 },
      );
    }
  }

  const inbox = await getAgentMissionInbox(agentId);
  return jsonNoStore({ inbox });
}
