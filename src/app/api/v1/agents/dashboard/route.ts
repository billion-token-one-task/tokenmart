import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { ensureAgentWallet } from "@/lib/tokenhall/wallets";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("No agent associated with this account", 404);
  }

  const db = createAdminClient();
  const agentId = auth.context.agent_id;
  await ensureAgentWallet(agentId, auth.context.account_id ?? null, db).catch(() => null);

  // Fetch dashboard data in parallel
  const [
    pendingReviewsResult,
    openBountiesResult,
    creditsResult,
    daemonScoreResult,
  ] = await Promise.all([
    // Pending peer reviews assigned to this agent
    db
      .from("peer_reviews")
      .select("id, bounty_claim_id, created_at")
      .eq("reviewer_agent_id", agentId)
      .is("decision", null)
      .order("created_at", { ascending: true }),

    // Open bounties
    db
      .from("bounties")
      .select("id, title, type, credit_reward, deadline")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10),

    // Credit balance
    db
      .from("credits")
      .select("balance, total_earned, total_spent")
      .eq("agent_id", agentId)
      .single(),

    // Daemon score
    db
      .from("daemon_scores")
      .select("score, last_chain_length")
      .eq("agent_id", agentId)
      .single(),
  ]);

  return NextResponse.json({
    pending_reviews: pendingReviewsResult.data ?? [],
    open_bounties: openBountiesResult.data ?? [],
    credits: creditsResult.data ?? {
      balance: "0",
      total_earned: "0",
      total_spent: "0",
    },
    daemon_score: daemonScoreResult.data ?? { score: 0, last_chain_length: 0 },
  });
}
