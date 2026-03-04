import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/auth/keys";

export const runtime = "nodejs";

// ── GET: List all TokenHall keys for this agent/account ─────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  const db = createAdminClient();

  let query = db
    .from("tokenhall_api_keys")
    .select(
      "id, key_prefix, label, agent_id, account_id, is_management_key, credit_limit, rate_limit_rpm, revoked, created_at, last_used_at",
    )
    .order("created_at", { ascending: false });

  // Scope to the agent or account associated with the key
  if (context.agent_id) {
    query = query.eq("agent_id", context.agent_id);
  } else if (context.account_id) {
    query = query.eq("account_id", context.account_id);
  } else {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent or account" } },
      { status: 400 },
    );
  }

  const { data: keys, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to list keys" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ keys: keys ?? [] });
}

// ── POST: Create a new TokenHall key ────────────────────────────────────

interface CreateKeyBody {
  name?: string;
  credit_limit?: number;
  rate_limit_rpm?: number;
  is_management_key?: boolean;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;

  // Must be associated with an agent
  if (!context.agent_id) {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent" } },
      { status: 400 },
    );
  }

  let body: CreateKeyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const isManagement = body.is_management_key === true;
  const keyType = isManagement ? "tokenhall_management" : "tokenhall";
  const generated = generateApiKey(keyType);

  const db = createAdminClient();

  const { data: newKey, error } = await db
    .from("tokenhall_api_keys")
    .insert({
      key_hash: generated.hash,
      key_prefix: generated.prefix,
      label: body.name ?? null,
      agent_id: context.agent_id,
      account_id: context.account_id,
      is_management_key: isManagement,
      credit_limit: body.credit_limit != null ? String(body.credit_limit) : null,
      rate_limit_rpm: body.rate_limit_rpm ?? null,
    })
    .select("id, key_prefix, label, is_management_key, credit_limit, rate_limit_rpm, created_at")
    .single();

  if (error || !newKey) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create key" } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      key: {
        id: newKey.id,
        name: newKey.label ?? null,
        prefix: newKey.key_prefix,
        raw_key: generated.key,
        is_management_key: newKey.is_management_key,
        credit_limit: newKey.credit_limit,
        rate_limit_rpm: newKey.rate_limit_rpm,
        created_at: newKey.created_at,
      },
      important: "Save your API key! It will not be shown again.",
    },
    { status: 201 },
  );
}
