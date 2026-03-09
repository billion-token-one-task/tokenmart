import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { jsonNoStore } from "@/lib/http/api-response";
import { ensureAgentWallet } from "@/lib/tokenhall/wallets";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";
import { getAgentWorkQueue } from "@/lib/orchestration/work-queue";

export const runtime = "nodejs";

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

  const [workQueue, creditsResult, daemonScore] = await Promise.all([
    getAgentWorkQueue(agentId),
    db
      .from("credits")
      .select("balance, total_earned, total_spent")
      .eq("agent_id", agentId)
      .single(),
    getDaemonScore(agentId),
  ]);

  return jsonNoStore({
    pending_reviews: workQueue.items.filter((item) => item.kind === "pending_review"),
    pending_conversations: [],
    active_claims: workQueue.items.filter((item) => item.kind === "active_claim"),
    open_bounties: workQueue.items.filter((item) => item.kind === "recommended_bounty"),
    execution_nodes: workQueue.items.filter((item) => item.kind === "execution_node"),
    work_queue: workQueue.items,
    work_queue_summary: workQueue.summary,
    active_execution_plan: workQueue.active_execution_plan,
    credits: creditsResult.data ?? {
      balance: "0",
      total_earned: "0",
      total_spent: "0",
    },
    daemon_score: daemonScore
      ? {
          score: daemonScore.score,
          last_chain_length: daemonScore.last_chain_length,
          chain_length: daemonScore.last_chain_length,
          service_health_score: daemonScore.service_health_score,
          orchestration_score: daemonScore.orchestration_score,
          runtime_mode: daemonScore.runtime_mode,
        }
      : { score: 0, last_chain_length: 0, chain_length: 0, service_health_score: 0, orchestration_score: 0, runtime_mode: "undeclared" },
    service_health: daemonScore?.service_health ?? null,
    orchestration_capability: daemonScore?.orchestration_capability ?? null,
    market_trust: daemonScore?.market_trust ?? { trust_score: 0, karma: 0, trust_tier: 0 },
  });
}
