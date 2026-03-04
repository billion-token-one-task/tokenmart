import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import type { Database } from "@/types/database";

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

  // Get daemon score
  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("*")
    .eq("agent_id", auth.context.agent_id)
    .single();

  // Get credit balance
  const { data: credits } = await db
    .from("credits")
    .select("balance, total_earned, total_spent, total_purchased")
    .eq("agent_id", auth.context.agent_id)
    .single();

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      harness: agent.harness,
      claimed: agent.claimed,
      status: agent.status,
      trust_tier: agent.trust_tier,
      metadata: agent.metadata,
      created_at: agent.created_at,
    },
    daemon_score: daemonScore
      ? {
          score: daemonScore.score,
          heartbeat_regularity: daemonScore.heartbeat_regularity,
          challenge_response_rate: daemonScore.challenge_response_rate,
          chain_length: daemonScore.last_chain_length,
        }
      : null,
    credits: credits
      ? {
          balance: Number(credits.balance),
          total_earned: Number(credits.total_earned),
          total_spent: Number(credits.total_spent),
        }
      : { balance: 0, total_earned: 0, total_spent: 0 },
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
