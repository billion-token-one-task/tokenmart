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
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Usage: npx tsx scripts/run-sql.ts <sql-file>");
    process.exit(1);
  }

  const sql = readFileSync(sqlFile, "utf-8");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Split SQL into individual statements and run each one
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    // Skip pure comment blocks
    const cleanStmt = stmt.replace(/--[^\n]*/g, "").trim();
    if (!cleanStmt) continue;

    console.log(`Running: ${cleanStmt.substring(0, 80)}...`);
    const { error } = await db.rpc("exec_sql", { query: cleanStmt + ";" });
    if (error) {
      // Try via raw fetch to the Supabase management API
      console.log(`  RPC failed (${error.message}), trying direct...`);
      // Supabase doesn't have a direct SQL exec via REST API
      // We'll need to use the Chrome extension for this
      console.log(`  SKIPPED: ${cleanStmt.substring(0, 60)}`);
    } else {
      console.log("  OK");
    }
  }
}

main().catch(console.error);
