import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { ensureAccountWallet, ensureAgentWallet } from "@/lib/tokenhall/wallets";
import type { Database } from "@/types/database";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("No agent associated with this account. Register an agent first.", 404);
  }

  const db = createAdminClient();

  const { data: agent } = await db
    .from("agents")
    .select("*")
    .eq("id", auth.context.agent_id)
    .single();

  if (!agent) {
    return authError("Agent not found", 404);
  }

  const typedAgent = agent as Database["public"]["Tables"]["agents"]["Row"];

  const typedDaemonScore = await getDaemonScore(auth.context.agent_id);

  let credits = null as {
    balance: string;
    total_earned: string;
    total_spent: string;
    total_purchased: string;
    wallet_address: string;
    total_transferred_in: string;
    total_transferred_out: string;
  } | null;

  try {
    const wallet = await ensureAgentWallet(typedAgent.id, typedAgent.owner_account_id ?? null, db);
    const { data: creditRow } = await db
      .from("credits")
      .select(
        "balance, total_earned, total_spent, total_purchased, wallet_address, total_transferred_in, total_transferred_out",
      )
      .eq("agent_id", auth.context.agent_id)
      .single();

    credits = creditRow ?? {
      balance: wallet.balance,
      total_earned: "0.00000000",
      total_spent: "0.00000000",
      total_purchased: "0.00000000",
      wallet_address: wallet.wallet_address,
      total_transferred_in: wallet.total_transferred_in,
      total_transferred_out: wallet.total_transferred_out,
    };
  } catch {
    credits = null;
  }

  let mainWalletAddress: string | null = null;
  if (typedAgent.owner_account_id) {
    try {
      const mainWallet = await ensureAccountWallet(typedAgent.owner_account_id, db);
      mainWalletAddress = mainWallet.wallet_address;
    } catch {
      mainWalletAddress = null;
    }
  }

  return NextResponse.json({
    agent: {
      id: typedAgent.id,
      name: typedAgent.name,
      description: typedAgent.description,
      harness: typedAgent.harness,
      claimed: typedAgent.claimed,
      status: typedAgent.status,
      trust_tier: typedAgent.trust_tier,
      metadata: typedAgent.metadata,
      created_at: typedAgent.created_at,
    },
    daemon_score: typedDaemonScore
      ? {
          score: typedDaemonScore.score,
          heartbeat_regularity: typedDaemonScore.heartbeat_regularity,
          challenge_response_rate: typedDaemonScore.challenge_response_rate,
          chain_length: typedDaemonScore.last_chain_length,
          runtime_mode: typedDaemonScore.runtime_mode,
          service_health_score: typedDaemonScore.service_health_score,
          orchestration_score: typedDaemonScore.orchestration_score,
          score_confidence: typedDaemonScore.score_confidence,
        }
      : null,
    service_health: typedDaemonScore?.service_health ?? null,
    orchestration_capability: typedDaemonScore?.orchestration_capability ?? null,
    market_trust: typedDaemonScore?.market_trust ?? {
      trust_score: 0,
      karma: 0,
      trust_tier: typedAgent.trust_tier,
    },
    credits: credits
      ? {
          balance: Number(credits.balance),
          total_earned: Number(credits.total_earned),
          total_spent: Number(credits.total_spent),
          total_purchased: Number(credits.total_purchased),
          wallet_address: credits.wallet_address,
          total_transferred_in: Number(credits.total_transferred_in),
          total_transferred_out: Number(credits.total_transferred_out),
          main_wallet_address: mainWalletAddress,
        }
      : {
          balance: 0,
          total_earned: 0,
          total_spent: 0,
          total_purchased: 0,
          wallet_address: null,
          total_transferred_in: 0,
          total_transferred_out: 0,
          main_wallet_address: mainWalletAddress,
        },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("No agent associated with this account", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const allowedFields = ["description", "metadata"] as const;
  const updates: Database["public"]["Tables"]["agents"]["Update"] = {};
  for (const field of allowedFields) {
    if (field in body) {
      (updates as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const db = createAdminClient();
  const { data, error } = await db
    .from("agents")
    .update(updates)
    .eq("id", auth.context.agent_id)
    .select("id, name, description, harness, status, trust_tier, metadata")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to update agent" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ agent: data });
}
