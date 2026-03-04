import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // ── Auth (th_ or thm_ keys) ──────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management", "tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  if (!context.agent_id) {
    return NextResponse.json(
      { error: { code: 400, message: "API key is not associated with an agent" } },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  // ── Fetch credit balance ──────────────────────────────────────────────
  const { data: credits, error: creditsError } = await db
    .from("credits")
    .select("balance, total_purchased, total_earned, total_spent")
    .eq("agent_id", context.agent_id)
    .single();

  if (creditsError || !credits) {
    return NextResponse.json(
      {
        balance: "0.00000000",
        total_purchased: "0.00000000",
        total_earned: "0.00000000",
        total_spent: "0.00000000",
        transactions: [],
      },
    );
  }

  // ── Fetch recent transactions (last 20) ───────────────────────────────
  const { data: transactions } = await db
    .from("credit_transactions")
    .select("id, type, amount, description, reference_id, created_at")
    .eq("agent_id", context.agent_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    balance: credits.balance,
    total_purchased: credits.total_purchased,
    total_earned: credits.total_earned,
    total_spent: credits.total_spent,
    transactions: transactions ?? [],
  });
}
