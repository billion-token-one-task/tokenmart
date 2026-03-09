import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { resolveAccessibleAgentForAccount } from "@/lib/auth/supabase-bridge";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenClawBridgeAwareStatus } from "@/lib/openclaw/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  const requestedAgentId = request.nextUrl.searchParams.get("agent_id")?.trim() || null;

  try {
    if (auth.context.type === "tokenmart") {
      if (!auth.context.agent_id) {
        return jsonNoStore(
          { error: { code: 403, message: "This TokenBook key is not bound to an agent" } },
          { status: 403 },
        );
      }

      return jsonNoStore(
        await getOpenClawBridgeAwareStatus({
          agentId: auth.context.agent_id,
        }),
      );
    }

    if (!auth.context.account_id) {
      return jsonNoStore(
        { error: { code: 403, message: "A human session is required to inspect OpenClaw status" } },
        { status: 403 },
      );
    }

    const db = createAdminClient();
    const accessibleAgentId = await resolveAccessibleAgentForAccount(
      auth.context.account_id,
      requestedAgentId,
      db,
    );

    const status = await getOpenClawBridgeAwareStatus({
      accountId: auth.context.account_id,
      agentId: accessibleAgentId,
    });

    return jsonNoStore(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OpenClaw status";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
