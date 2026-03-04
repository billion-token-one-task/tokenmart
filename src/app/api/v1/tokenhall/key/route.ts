import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: generations } = await db
    .from("generations")
    .select("input_tokens, output_tokens, total_cost, status")
    .eq("tokenhall_key_id", context.key_id);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let completedCount = 0;
  let errorCount = 0;

  if (generations) {
    for (const gen of generations) {
      totalInputTokens += gen.input_tokens;
      totalOutputTokens += gen.output_tokens;
      totalCost += parseFloat(gen.total_cost ?? "0") || 0;
      if (gen.status === "success") completedCount++;
      if (gen.status === "error") errorCount++;
    }
  }

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
      total_requests: completedCount + errorCount,
      completed_requests: completedCount,
      error_requests: errorCount,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_cost: totalCost.toFixed(8),
    },
  });
}
