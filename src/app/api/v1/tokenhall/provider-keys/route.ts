import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/http/api-response";
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

  return jsonNoStore({ keys });
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
  const payload = {
    provider,
    label: body.label?.trim() || null,
    encrypted_key: encrypted.encrypted,
    iv: encrypted.iv,
    agent_id: scope === "agent" ? context.agent_id : null,
    account_id: scope === "account" ? context.account_id : null,
  };

  const selectColumns = "id, provider, label, agent_id, account_id, created_at";
  const { data: inserted, error: insertError } = await db
    .from("provider_keys")
    .insert(payload)
    .select(selectColumns)
    .single();

  if (!insertError && inserted) {
    return jsonNoStore(
      {
        key: {
          id: inserted.id,
          provider: inserted.provider,
          label: inserted.label,
          scope: inserted.agent_id ? "agent" : "account",
          agent_id: inserted.agent_id,
          account_id: inserted.account_id,
          created_at: inserted.created_at,
        },
        updated: false,
      },
      { status: 201 }
    );
  }

  if ((insertError as { code?: string } | null)?.code !== "23505") {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to save provider key" } },
      { status: 500 }
    );
  }

  // Unique conflict: update the existing scoped provider key deterministically.
  let existingScopedQuery = db
    .from("provider_keys")
    .select("id")
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1);

  existingScopedQuery =
    scope === "agent"
      ? existingScopedQuery
          .eq("agent_id", context.agent_id as string)
          .is("account_id", null)
      : existingScopedQuery
          .eq("account_id", context.account_id as string)
          .is("agent_id", null);

  const { data: scopedRows, error: scopedError } = await existingScopedQuery;
  if (scopedError || !scopedRows || scopedRows.length === 0) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to resolve existing scoped provider key" } },
      { status: 500 }
    );
  }

  const scopedId = scopedRows[0].id;
  const { data: saved, error: saveError } = await db
    .from("provider_keys")
    .update(payload)
    .eq("id", scopedId)
    .select(selectColumns)
    .single();

  if (saveError || !saved) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to update existing provider key" } },
      { status: 500 }
    );
  }

  return jsonNoStore(
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
      updated: true,
    },
    { status: 200 }
  );
}
