import { NextResponse } from "next/server";
import type { AccountRole, AuthContext } from "@/types/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface RoleCheckSuccess {
  ok: true;
  accountId: string;
  role: AccountRole;
}

interface RoleCheckFailure {
  ok: false;
  response: NextResponse;
}

export async function requireAccountRole(
  context: AuthContext,
  allowedRoles: AccountRole[]
): Promise<RoleCheckSuccess | RoleCheckFailure> {
  if (!context.account_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 403, message: "Account authentication is required" } },
        { status: 403 }
      ),
    };
  }

  const db = createAdminClient();
  const { data: account } = await db
    .from("accounts")
    .select("role")
    .eq("id", context.account_id)
    .single();

  if (!account) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 401, message: "Account not found or no longer valid" } },
        { status: 401 }
      ),
    };
  }

  const role = account.role as AccountRole;
  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: 403,
            message: `Insufficient role. Required: ${allowedRoles.join(
              " or "
            )}, current: ${role}`,
          },
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, accountId: context.account_id, role };
}
