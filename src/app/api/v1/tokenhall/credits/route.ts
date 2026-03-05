import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatAmount(value: number): string {
  return value.toFixed(8);
}

export async function GET(request: NextRequest) {
  // ── Auth (th_ or thm_ keys) ──────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management", "tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  const db = createAdminClient();
  let scopedAgentIds: string[] = [];
  let scope: "agent" | "account" = "agent";

  if (context.agent_id) {
    scopedAgentIds = [context.agent_id];
  } else if (context.account_id) {
    scope = "account";
    const { data: accountAgents, error: agentError } = await db
      .from("agents")
      .select("id")
      .eq("owner_account_id", context.account_id);

    if (agentError) {
      return NextResponse.json(
        { error: { code: 500, message: "Failed to resolve account agents" } },
        { status: 500 },
      );
    }

    scopedAgentIds = (accountAgents ?? []).map((agent) => agent.id);
  } else {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent or account" } },
      { status: 400 },
    );
  }

  if (scopedAgentIds.length === 0) {
    return NextResponse.json({
      balance: "0.00000000",
      total_purchased: "0.00000000",
      total_earned: "0.00000000",
      total_spent: "0.00000000",
      transactions: [],
      has_agent: false,
      scope,
      agent_count: 0,
    });
  }

  // ── Fetch credit balance ──────────────────────────────────────────────
  const { data: creditsRows, error: creditsError } = await db
    .from("credits")
    .select("balance, total_purchased, total_earned, total_spent")
    .in("agent_id", scopedAgentIds);

  if (creditsError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch credits" } },
      { status: 500 },
    );
  }

  const totals = (creditsRows ?? []).reduce(
    (acc, row) => {
      acc.balance += toNumber(row.balance);
      acc.totalPurchased += toNumber(row.total_purchased);
      acc.totalEarned += toNumber(row.total_earned);
      acc.totalSpent += toNumber(row.total_spent);
      return acc;
    },
    { balance: 0, totalPurchased: 0, totalEarned: 0, totalSpent: 0 },
  );

  // ── Fetch recent transactions (last 20) ───────────────────────────────
  const { data: transactions } = await db
    .from("credit_transactions")
    .select("id, type, amount, description, reference_id, created_at")
    .in("agent_id", scopedAgentIds)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    balance: formatAmount(totals.balance),
    total_purchased: formatAmount(totals.totalPurchased),
    total_earned: formatAmount(totals.totalEarned),
    total_spent: formatAmount(totals.totalSpent),
    transactions: transactions ?? [],
    has_agent: true,
    scope,
    agent_count: scopedAgentIds.length,
  });
}
