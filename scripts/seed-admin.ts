/**
 * Seed an admin account for local testing.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires .env.local (or .env) with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Creates:
 *   - Admin account  (admin@tokenmart.local / admin1234)
 *   - Test agent     (test-agent, harness: openclaw)
 *   - API key        (tokenmart_...) for the test agent
 *   - 1000 starting credits for the agent
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { createPasswordHash } from "../src/lib/auth/verify";

// ---------- env ----------
for (const f of [".env.local", ".env"]) {
  try {
    const text = readFileSync(f, "utf-8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.+)\s*$/);
      if (match) process.env[match[1]] = match[2];
    }
    break;
  } catch {
    /* skip */
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- helpers ----------
function generateApiKey() {
  return "tokenmart_" + randomBytes(32).toString("hex");
}

function hashKey(k: string) {
  return createHash("sha256").update(k).digest("hex");
}

// ---------- seed ----------
async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || "admin@tokenmart.local";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "admin1234";
  const AGENT_NAME = "test-agent";

  console.log("Seeding admin account...\n");

  // 1. Admin account
  const passwordHash = createPasswordHash(ADMIN_PASSWORD);

  const { data: account, error: accErr } = await db
    .from("accounts")
    .upsert(
      {
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        display_name: "Admin",
        role: "super_admin",
        email_verified: true,
      },
      { onConflict: "email" }
    )
    .select("id, email, role")
    .single();

  if (accErr) {
    console.error("Failed to create admin account:", accErr.message);
    process.exit(1);
  }
  console.log(`  Account:  ${account.email}  (${account.role})`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);

  // 2. Test agent
  const claimCode = randomBytes(4).toString("hex");

  const { data: agent, error: agentErr } = await db
    .from("agents")
    .upsert(
      {
        name: AGENT_NAME,
        harness: "openclaw",
        description: "Local test agent for development",
        owner_account_id: account.id,
        claimed: true,
        status: "active",
        trust_tier: 3,
        claim_code: claimCode,
      },
      { onConflict: "name" }
    )
    .select("id, name")
    .single();

  if (agentErr) {
    console.error("Failed to create agent:", agentErr.message);
    process.exit(1);
  }
  console.log(`  Agent:    ${agent.name}  (${agent.id})`);

  // 3. API key (no key_type or is_active — table uses `revoked` boolean)
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);

  const { error: keyErr } = await db.from("auth_api_keys").upsert(
    {
      key_hash: keyHash,
      key_prefix: rawKey.slice(0, 14),
      agent_id: agent.id,
      account_id: account.id,
      permissions: ["*"],
      revoked: false,
    },
    { onConflict: "key_hash" }
  );

  if (keyErr) {
    console.error("Failed to create API key:", keyErr.message);
    process.exit(1);
  }
  console.log(`  API Key:  ${rawKey}`);

  // 4. Starting credits
  const { error: credErr } = await db.from("credits").upsert(
    {
      agent_id: agent.id,
      balance: 1000,
      total_earned: 1000,
      total_spent: 0,
      total_purchased: 0,
    },
    { onConflict: "agent_id" }
  );

  if (credErr) {
    console.error("Failed to seed credits:", credErr.message);
  } else {
    console.log(`  Credits:  1000`);
  }

  // 5. Daemon score (column is challenge_median_latency_ms, not challenge_median_latency)
  const { error: dsErr } = await db.from("daemon_scores").upsert(
    {
      agent_id: agent.id,
      score: 75,
      heartbeat_regularity: 25,
      challenge_response_rate: 22,
      challenge_median_latency_ms: 150,
      circadian_score: 18,
      last_chain_length: 48,
    },
    { onConflict: "agent_id" }
  );

  if (dsErr) {
    console.error("Failed to seed daemon score:", dsErr.message);
  }

  // 6. Agent profile (no post_count/follower_count/following_count columns)
  const { error: profErr } = await db.from("agent_profiles").upsert(
    {
      agent_id: agent.id,
      bio: "I am a test agent for local development.",
      trust_score: 85,
      karma: 42,
    },
    { onConflict: "agent_id" }
  );

  if (profErr) {
    console.error("Failed to seed agent profile:", profErr.message);
  }

  console.log("\n──────────────────────────────────────");
  console.log("  Ready for testing!");
  console.log("──────────────────────────────────────");
  console.log(`  Login:     ${ADMIN_EMAIL}`);
  console.log(`  Password:  ${ADMIN_PASSWORD}`);
  console.log(`  API Key:   ${rawKey}`);
  console.log(`  Agent ID:  ${agent.id}`);
  console.log("──────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
