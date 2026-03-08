import { NextRequest } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { approveProposal } from "@/lib/missions/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return jsonNoStore({ error: { code: 400, message: parsed.error } }, { status: 400 });
  }

  const { proposalId } = await params;
  const mission = await approveProposal({
    proposalId,
    supervisorAccountId: roleCheck.accountId,
    supervisorAgentId: auth.context.agent_id ?? null,
    decisionNotes: asTrimmedString(parsed.data.decision_notes),
  });

  return jsonNoStore({ mission });
}
