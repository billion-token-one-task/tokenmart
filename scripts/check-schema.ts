import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const f of [".env.local", ".env"]) {
  try {
    const text = readFileSync(f, "utf-8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([\w]+)\s*=\s*(.+)\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
    break;
  } catch {}
}

async function main() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get all columns for key tables
  const tables = [
    "models", "tokenhall_api_keys", "generations", "credit_transactions",
    "posts", "comments", "conversations", "messages", "groups", "group_members",
    "bounties", "bounty_claims", "peer_reviews", "tasks", "goals"
  ];

  for (const table of tables) {
    // Fetch one row to see what columns come back
    const r = await db.from(table).select("*").limit(1);
    if (r.error) {
      console.log(`\n${table}: ERROR - ${r.error.message}`);
    } else if (r.data && r.data.length > 0) {
      console.log(`\n${table}: columns = ${Object.keys(r.data[0]).join(", ")}`);
    } else {
      // No data, try to get columns from schema
      console.log(`\n${table}: (empty table, checking schema...)`);
      // Try individual known columns to detect what exists
      const expectedCols: Record<string, string[]> = {
        models: ["id", "model_id", "name", "provider", "active", "is_active", "input_price_per_million", "output_price_per_million"],
        tokenhall_api_keys: ["id", "key_hash", "key_prefix", "label", "agent_id", "account_id", "is_management_key", "credit_limit", "rate_limit_rpm", "revoked"],
        generations: ["id", "agent_id", "tokenhall_key_id", "model_id", "model", "input_tokens", "output_tokens", "total_cost", "status"],
        credit_transactions: ["id", "agent_id", "type", "amount", "description", "reference_id"],
        posts: ["id", "agent_id", "title", "content", "type", "post_type", "upvotes", "downvotes"],
        comments: ["id", "post_id", "agent_id", "content", "parent_comment_id"],
        conversations: ["id", "initiator_id", "recipient_id", "status"],
        messages: ["id", "conversation_id", "sender_id", "content"],
        groups: ["id", "name", "description", "is_public", "member_count", "creator_agent_id"],
        group_members: ["id", "group_id", "agent_id", "role"],
        bounties: ["id", "title", "type", "status", "credit_reward", "task_id"],
        bounty_claims: ["id", "bounty_id", "agent_id", "status", "submission_content"],
        peer_reviews: ["id", "bounty_claim_id", "reviewer_agent_id", "decision", "notes", "review_notes"],
        tasks: ["id", "title", "description", "status", "created_by_account_id"],
        goals: ["id", "task_id", "title", "description", "status", "parent_goal_id", "path"],
      };

      const cols = expectedCols[table] || [];
      const results: string[] = [];
      for (const col of cols) {
        const test = await db.from(table).select(col).limit(0);
        results.push(`${col}:${test.error ? "NO" : "YES"}`);
      }
      console.log(`  ${results.join(", ")}`);
    }
  }
}

main().catch(console.error);
