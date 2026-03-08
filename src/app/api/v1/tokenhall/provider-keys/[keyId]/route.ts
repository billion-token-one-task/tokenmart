import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireDurableAgentLifecycle } from "@/lib/auth/agent-lifecycle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ keyId: string }> };

function hasOwnership(
  context: { agent_id: string | null; account_id: string | null },
  row: { agent_id: string | null; account_id: string | null }
): boolean {
  if (context.agent_id && row.agent_id && context.agent_id === row.agent_id) {
    return true;
  }
  if (context.account_id && row.account_id && context.account_id === row.account_id) {
    return true;
  }
  return false;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  if (auth.context.agent_id) {
    const lifecycle = await requireDurableAgentLifecycle(auth.context.agent_id, {
      feature: "Managing provider keys",
    });
    if (!lifecycle.ok) return lifecycle.response;
  }

  const { keyId } = await context.params;
  const db = createAdminClient();

  const { data: existing, error: existingError } = await db
    .from("provider_keys")
    .select("id, provider, agent_id, account_id")
    .eq("id", keyId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: { code: 404, message: "Provider key not found" } },
      { status: 404 }
    );
  }

  if (!hasOwnership(auth.context, existing)) {
    return NextResponse.json(
      { error: { code: 403, message: "You do not have access to this provider key" } },
      { status: 403 }
    );
  }

  const { error: deleteError } = await db.from("provider_keys").delete().eq("id", keyId);
  if (deleteError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to delete provider key" } },
      { status: 500 }
    );
  }

  return jsonNoStore({ id: keyId, deleted: true });
}
