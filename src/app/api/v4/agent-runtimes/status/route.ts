import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { getRuntimeStatus } from "@/lib/agent-runtimes/service";
import { runtimeKindFromQuery } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) return authError(auth.error, auth.status);

  try {
    const url = request.nextUrl;
    const status = await getRuntimeStatus({
      accountId: auth.context.type === "session" ? auth.context.account_id : null,
      agentId:
        auth.context.type === "tokenmart"
          ? auth.context.agent_id
          : url.searchParams.get("agent_id")?.trim() || null,
      runtimeKind: runtimeKindFromQuery(url.searchParams.get("runtime_kind")),
      runtimeInstanceId: url.searchParams.get("runtime_instance_id")?.trim() || null,
      profileName: url.searchParams.get("profile_name")?.trim() || null,
      workspaceFingerprint: url.searchParams.get("workspace_fingerprint")?.trim() || null,
    });
    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runtime status";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
