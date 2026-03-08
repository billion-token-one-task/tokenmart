import { existsSync, readFileSync } from "node:fs";
import { bootstrapMetaculusSummit } from "../src/lib/v2/bootstrap";

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    if (!existsSync(envFile)) continue;
    const text = readFileSync(envFile, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
      if (!match) continue;
      if (process.env[match[1]] == null) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_EMAIL are required",
    );
  }

  const result = await bootstrapMetaculusSummit({
    supabaseUrl,
    serviceRoleKey,
    adminEmail,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
