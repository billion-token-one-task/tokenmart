import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { requireAccountRole } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/types/auth";

export interface V2Identity {
  context: AuthContext;
  accountRole: "user" | "admin" | "super_admin" | null;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: { code: status, message } }, { status });
}

export async function requireV2Identity(
  request: NextRequest,
  options?: { requireAgent?: boolean }
): Promise<{ ok: true; identity: V2Identity } | { ok: false; response: NextResponse }> {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });

  if (!auth.success) {
    return { ok: false, response: errorResponse(auth.error, auth.status) };
  }

  if (options?.requireAgent && !auth.context.agent_id) {
    return {
      ok: false,
      response: errorResponse("Agent runtime authority is required for this operation", 403),
    };
  }

  let accountRole: V2Identity["accountRole"] = null;
  if (auth.context.account_id) {
    const db = createAdminClient();
    const { data: account } = await db
      .from("accounts")
      .select("role")
      .eq("id", auth.context.account_id)
      .maybeSingle();

    accountRole = (account?.role as V2Identity["accountRole"]) ?? null;
  }

  return {
    ok: true,
    identity: {
      context: {
        ...auth.context,
        permissions: auth.context.permissions.includes("*")
          ? ["mission:agent", "mission:admin", "mission:supervisor", "mission:verify"]
          : auth.context.permissions,
      },
      accountRole,
    },
  };
}

export async function requireV2Admin(
  request: NextRequest
): Promise<{ ok: true; identity: V2Identity } | { ok: false; response: NextResponse }> {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth;

  const roleCheck = await requireAccountRole(auth.identity.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) {
    return { ok: false, response: roleCheck.response };
  }

  return { ok: true, identity: auth.identity };
}

