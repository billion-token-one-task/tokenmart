import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptProviderKey } from "@/lib/tokenhall/encryption";

export const runtime = "nodejs";

type KeyScope = "agent" | "account";

interface CreateProviderKeyBody {
  provider?: string;
  key?: string;
  label?: string;
  scope?: KeyScope;
}

function normalizeProvider(provider?: string): string | null {
  const normalized = provider?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (!/^[a-z0-9._-]{2,64}$/.test(normalized)) return null;
  return normalized;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  if (!context.agent_id && !context.account_id) {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent or account" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  let query = db
    .from("provider_keys")
    .select("id, provider, label, agent_id, account_id, created_at")
    .order("created_at", { ascending: false });

  if (context.agent_id && context.account_id) {
    query = query.or(`agent_id.eq.${context.agent_id},account_id.eq.${context.account_id}`);
  } else if (context.agent_id) {
    query = query.eq("agent_id", context.agent_id);
  } else if (context.account_id) {
    query = query.eq("account_id", context.account_id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to list provider keys" } },
      { status: 500 }
    );
  }

  const keys = (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    label: row.label,
    scope: row.agent_id ? "agent" : "account",
    agent_id: row.agent_id,
    account_id: row.account_id,
    created_at: row.created_at,
  }));

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  if (!context.agent_id && !context.account_id) {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent or account" } },
      { status: 400 }
    );
  }

  let body: CreateProviderKeyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const provider = normalizeProvider(body.provider);
  if (!provider) {
    return NextResponse.json(
      { error: { code: 400, message: "provider is required and must match [a-z0-9._-]{2,64}" } },
      { status: 400 }
    );
  }

  const plaintextKey = body.key?.trim();
  if (!plaintextKey) {
    return NextResponse.json(
      { error: { code: 400, message: "key is required" } },
      { status: 400 }
    );
  }

  const requestedScope: KeyScope = body.scope === "account" ? "account" : "agent";
  const scope: KeyScope = requestedScope === "agent" && context.agent_id ? "agent" : "account";

  if (scope === "account" && !context.account_id) {
    return NextResponse.json(
      { error: { code: 400, message: "No account available for account-scoped key" } },
      { status: 400 }
    );
  }

  if (scope === "agent" && !context.agent_id) {
    return NextResponse.json(
      { error: { code: 400, message: "No agent selected for agent-scoped key" } },
      { status: 400 }
    );
  }

  const encrypted = encryptProviderKey(plaintextKey);
  const db = createAdminClient();

  const existingQuery = db
    .from("provider_keys")
    .select("id")
    .eq("provider", provider)
    .limit(1);

  const existingScoped =
    scope === "agent"
      ? existingQuery.eq("agent_id", context.agent_id as string).is("account_id", null)
      : existingQuery.eq("account_id", context.account_id as string).is("agent_id", null);

  const { data: existingRows, error: existingError } = await existingScoped;
  if (existingError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to inspect existing provider keys" } },
      { status: 500 }
    );
  }

  const existing = (existingRows ?? [])[0];
  const payload = {
    provider,
    label: body.label?.trim() || null,
    encrypted_key: encrypted.encrypted,
    iv: encrypted.iv,
    agent_id: scope === "agent" ? context.agent_id : null,
    account_id: scope === "account" ? context.account_id : null,
  };

  const mutation = existing
    ? db.from("provider_keys").update(payload).eq("id", existing.id)
    : db.from("provider_keys").insert(payload);

  const { data: saved, error: saveError } = await mutation
    .select("id, provider, label, agent_id, account_id, created_at")
    .single();

  if (saveError || !saved) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to save provider key" } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      key: {
        id: saved.id,
        provider: saved.provider,
        label: saved.label,
        scope: saved.agent_id ? "agent" : "account",
        agent_id: saved.agent_id,
        account_id: saved.account_id,
        created_at: saved.created_at,
      },
      updated: Boolean(existing),
    },
    { status: existing ? 200 : 201 }
  );
}
