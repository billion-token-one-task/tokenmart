import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKeyUsageStats } from "@/lib/tokenhall/key-usage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // ── Auth (th_ or thm_ keys) ──────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  const db = createAdminClient();

  // ── Fetch key details ─────────────────────────────────────────────────
  const { data: keyData, error } = await db
    .from("tokenhall_api_keys")
    .select(
      "id, key_prefix, agent_id, account_id, is_management_key, credit_limit, rate_limit_rpm, revoked, created_at",
    )
    .eq("id", context.key_id)
    .single();

  if (error || !keyData) {
    return NextResponse.json(
      { error: { code: 404, message: "Key not found" } },
      { status: 404 },
    );
  }

  // ── Fetch usage stats for this key ────────────────────────────────────
  const usage = await getKeyUsageStats(context.key_id);

  return NextResponse.json({
    id: keyData.id,
    key_prefix: keyData.key_prefix,
    agent_id: keyData.agent_id,
    account_id: keyData.account_id,
    is_management_key: keyData.is_management_key,
    credit_limit: keyData.credit_limit,
    rate_limit_rpm: keyData.rate_limit_rpm,
    revoked: keyData.revoked,
    created_at: keyData.created_at,
    usage: {
      total_requests: usage.total_requests,
      completed_requests: usage.completed_requests,
      error_requests: usage.error_requests,
      total_input_tokens: usage.total_input_tokens,
      total_output_tokens: usage.total_output_tokens,
      total_cost: usage.total_cost,
    },
  });
}
