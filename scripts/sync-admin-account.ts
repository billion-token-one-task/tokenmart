import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { createPasswordHash } from "../src/lib/auth/verify";
import { planAdminAccountSync } from "./lib/sync-admin-account";

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

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

async function main() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const configuredEmail = String(args["admin-email"] ?? process.env.ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const configuredPassword = String(
    args["admin-password"] ?? process.env.ADMIN_PASSWORD ?? ""
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  if (!configuredEmail || !configuredPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: configuredAccount, error: configuredError }, { data: superAdmins, error: superError }] =
    await Promise.all([
      db
        .from("accounts")
        .select("id, email, role")
        .eq("email", configuredEmail)
        .maybeSingle(),
      db
        .from("accounts")
        .select("id, email, role")
        .eq("role", "super_admin"),
    ]);

  if (configuredError) {
    throw new Error(`Failed to query configured admin account: ${configuredError.message}`);
  }
  if (superError) {
    throw new Error(`Failed to query super admins: ${superError.message}`);
  }

  const plan = planAdminAccountSync({
    configuredEmail,
    configuredAccount,
    superAdmins: superAdmins ?? [],
  });
  const passwordHash = createPasswordHash(configuredPassword);

  if (plan.action === "update-configured" || plan.action === "migrate-single-super-admin") {
    const payload = {
      email: plan.targetEmail,
      password_hash: passwordHash,
      display_name: "Admin",
      role: "super_admin",
      email_verified: true,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from("accounts")
      .update(payload)
      .eq("id", plan.targetId)
      .select("id, email, role, display_name, email_verified")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update admin account: ${error?.message ?? "unknown error"}`);
    }

    console.log(
      JSON.stringify(
        {
          action: plan.action,
          account: data,
        },
        null,
        2
      )
    );
    return;
  }

  const { data, error } = await db
    .from("accounts")
    .insert({
      email: plan.targetEmail,
      password_hash: passwordHash,
      display_name: "Admin",
      role: "super_admin",
      email_verified: true,
    })
    .select("id, email, role, display_name, email_verified")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create admin account: ${error?.message ?? "unknown error"}`);
  }

  console.log(
    JSON.stringify(
      {
        action: plan.action,
        reason: plan.reason,
        account: data,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
