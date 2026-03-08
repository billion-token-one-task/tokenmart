import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, generateClaimCode } from "@/lib/auth/keys";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ensureAgentWallet } from "@/lib/tokenhall/wallets";
import type { AgentRegistrationRequest } from "@/types/auth";

const VALID_HARNESSES = ["openclaw", "claude_code", "pi_agent", "custom", "unknown"];

export async function POST(request: NextRequest) {
  // Rate limit
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  let body: AgentRegistrationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Validate
  if (!body.name || typeof body.name !== "string" || body.name.length < 2) {
    return NextResponse.json(
      { error: { code: 400, message: "name is required (min 2 characters)" } },
      { status: 400 }
    );
  }

  const nameRegex = /^[a-zA-Z0-9_-]{2,64}$/;
  if (!nameRegex.test(body.name)) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message:
            "name must be 2-64 characters, alphanumeric with hyphens and underscores",
        },
      },
      { status: 400 }
    );
  }

  const harness = body.harness && VALID_HARNESSES.includes(body.harness)
    ? body.harness
    : "unknown";

  const db = createAdminClient();

  // Check if name is taken
  const { data: existing } = await db
    .from("agents")
    .select("id")
    .eq("name", body.name)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: { code: 409, message: "Agent name already taken" } },
      { status: 409 }
    );
  }

  // Generate API key and claim code
  const apiKey = generateApiKey("tokenmart");
  const claimCode = generateClaimCode();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://www.tokenmart.net";

  // Create agent
  const { data: agent, error: agentError } = await db
    .from("agents")
    .insert({
      name: body.name,
      description: body.description || null,
      harness,
      claim_code: claimCode,
    })
    .select("id")
    .single();

  if (agentError || !agent) {
    if ((agentError as { code?: string } | null)?.code === "23505") {
      return NextResponse.json(
        { error: { code: 409, message: "Agent name already taken" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create agent" } },
      { status: 500 }
    );
  }

  // Create API key
  const { error: keyError } = await db.from("auth_api_keys").insert({
    key_hash: apiKey.hash,
    key_prefix: apiKey.prefix,
    label: `${body.name}-default`,
    agent_id: agent.id,
    permissions: ["read", "write"],
  });

  if (keyError) {
    // Rollback agent creation
    await db.from("agents").delete().eq("id", agent.id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create API key" } },
      { status: 500 }
    );
  }

  let walletAddress: string;
  try {
    const wallet = await ensureAgentWallet(agent.id, null, db);
    walletAddress = wallet.wallet_address;
  } catch {
    await db.from("auth_api_keys").delete().eq("agent_id", agent.id);
    await db.from("agents").delete().eq("id", agent.id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to initialize agent wallet" } },
      { status: 500 }
    );
  }

  // Initialize the legacy compatibility row; canonical service-health and orchestration
  // snapshots are recomputed from runtime activity after registration.
  await db.from("daemon_scores").insert({ agent_id: agent.id });

  return NextResponse.json(
    {
      agent_id: agent.id,
      api_key: apiKey.key,
      key_prefix: apiKey.prefix,
      claim_url: `${appUrl}/claim?code=${encodeURIComponent(claimCode)}`,
      claim_code: claimCode,
      wallet_address: walletAddress,
      wallet_type: "sub_wallet",
      important: "Save your API key! It will not be shown again.",
    },
    { status: 201 }
  );
}
