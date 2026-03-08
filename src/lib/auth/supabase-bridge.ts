import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPABASE_PASSWORD_SENTINEL = "__supabase_managed__";

function inferDisplayName(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  const candidate =
    metadata.full_name ??
    metadata.name ??
    metadata.user_name ??
    metadata.preferred_username ??
    null;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function inferProvider(user: User): string {
  const provider =
    typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider.toLowerCase()
      : user.identities?.[0]?.provider?.toLowerCase() ?? "unknown";

  if (provider === "google") return "google";
  if (provider === "email") return user.email_confirmed_at ? "magic_link" : "email_password";
  return "unknown";
}

export interface TokenBookAccountBridge {
  id: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  display_name: string | null;
}

export async function ensureAccountForSupabaseUser(
  user: User,
  db: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<TokenBookAccountBridge> {
  const supabaseUserId = user.id;
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Supabase user is missing an email address");
  }

  const provider = inferProvider(user);
  const displayName = inferDisplayName(user);

  const { data: bySupabaseId } = await db
    .from("accounts")
    .select("id, email, role, display_name")
    .eq("supabase_auth_user_id", supabaseUserId)
    .maybeSingle();

  if (bySupabaseId) {
    await db
      .from("accounts")
      .update({
        email,
        display_name: displayName ?? bySupabaseId.display_name,
        auth_provider: provider,
        email_verified: true,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", bySupabaseId.id);

    return {
      id: bySupabaseId.id,
      email,
      role: bySupabaseId.role as TokenBookAccountBridge["role"],
      display_name: displayName ?? bySupabaseId.display_name,
    };
  }

  const { data: byEmail } = await db
    .from("accounts")
    .select("id, email, role, display_name")
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    await db
      .from("accounts")
      .update({
        supabase_auth_user_id: supabaseUserId,
        auth_provider: provider,
        display_name: displayName ?? byEmail.display_name,
        email_verified: true,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", byEmail.id);

    return {
      id: byEmail.id,
      email: byEmail.email,
      role: byEmail.role as TokenBookAccountBridge["role"],
      display_name: displayName ?? byEmail.display_name,
    };
  }

  const { data: inserted, error } = await db
    .from("accounts")
    .insert({
      email,
      password_hash: SUPABASE_PASSWORD_SENTINEL,
      email_verified: true,
      display_name: displayName,
      role: "user",
      supabase_auth_user_id: supabaseUserId,
      auth_provider: provider,
      last_login_at: new Date().toISOString(),
    })
    .select("id, email, role, display_name")
    .single();

  if (error || !inserted) {
    throw new Error("Failed to create TokenBook account for Supabase user");
  }

  return {
    id: inserted.id,
    email: inserted.email,
    role: inserted.role as TokenBookAccountBridge["role"],
    display_name: inserted.display_name,
  };
}

export interface AccessibleAgentRecord {
  id: string;
  lifecycle_state: string;
  owner_account_id: string | null;
  bootstrap_account_id: string | null;
  harness: string;
  created_at: string;
}

export async function listAccessibleAgentsForAccount(
  accountId: string,
  db: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<AccessibleAgentRecord[]> {
  const { data } = await db
    .from("agents")
    .select(
      "id, lifecycle_state, owner_account_id, bootstrap_account_id, harness, created_at",
    )
    .or(`owner_account_id.eq.${accountId},bootstrap_account_id.eq.${accountId}`)
    .order("created_at", { ascending: false });

  return (data ?? []) as AccessibleAgentRecord[];
}

export async function resolveAccessibleAgentForAccount(
  accountId: string,
  requestedAgentId: string | null,
  db: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<string | null> {
  const agents = await listAccessibleAgentsForAccount(accountId, db);
  if (agents.length === 0) return null;

  if (requestedAgentId) {
    const owned = agents.find((agent) => agent.id === requestedAgentId);
    return owned?.id ?? null;
  }

  const claimed = agents.find((agent) => agent.lifecycle_state === "claimed");
  if (claimed) return claimed.id;

  const connected = agents.find(
    (agent) =>
      agent.lifecycle_state === "connected_unclaimed" || agent.lifecycle_state === "sandbox",
  );
  if (connected) return connected.id;

  return agents[0]?.id ?? null;
}
