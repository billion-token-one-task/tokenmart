import { NextRequest } from "next/server";

import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { jsonNoStore } from "@/lib/http/api-response";
import { releaseRunTranche } from "@/lib/missions/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  const { runId } = await params;
  const result = await releaseRunTranche(runId, roleCheck.accountId);
  return jsonNoStore({ tranche: result });
}
