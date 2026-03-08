import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/auth/keys";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { requireDurableAgentLifecycle } from "@/lib/auth/agent-lifecycle";

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
  if (context.agent_id) {
    const lifecycle = await requireDurableAgentLifecycle(context.agent_id, {
      feature: "Viewing TokenHall keys",
    });
    if (!lifecycle.ok) return lifecycle.response;
  }
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

  return jsonNoStore({ keys: keys ?? [] });
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
  if (context.agent_id) {
    const lifecycle = await requireDurableAgentLifecycle(context.agent_id, {
      feature: "Creating TokenHall keys",
    });
    if (!lifecycle.ok) return lifecycle.response;
  }

  // Must be associated with an agent
  if (!context.agent_id) {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent" } },
      { status: 400 },
    );
  }

  const parsedBody = await readJsonObject<CreateKeyBody>(request);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: { code: 400, message: parsedBody.error } },
      { status: 400 },
    );
  }

  const body = parsedBody.data;
  const name = asTrimmedString(body.name);
  if (!name) {
    return NextResponse.json(
      { error: { code: 400, message: "name is required" } },
      { status: 400 },
    );
  }

  let creditLimit: number | null = null;
  if (body.credit_limit !== undefined) {
    creditLimit = asFiniteNumber(body.credit_limit);
    if (creditLimit === null || creditLimit < 0) {
      return NextResponse.json(
        { error: { code: 400, message: "credit_limit must be a non-negative number" } },
        { status: 400 },
      );
    }
  }

  let rateLimitRpm: number | null = null;
  if (body.rate_limit_rpm !== undefined) {
    rateLimitRpm = asFiniteNumber(body.rate_limit_rpm);
    if (
      rateLimitRpm === null ||
      !Number.isInteger(rateLimitRpm) ||
      rateLimitRpm < 1
    ) {
      return NextResponse.json(
        { error: { code: 400, message: "rate_limit_rpm must be a positive integer" } },
        { status: 400 },
      );
    }
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
      label: name,
      agent_id: context.agent_id,
      account_id: context.account_id,
      is_management_key: isManagement,
      credit_limit: creditLimit == null ? null : String(creditLimit),
      rate_limit_rpm: rateLimitRpm ?? null,
    })
    .select("id, key_prefix, label, is_management_key, credit_limit, rate_limit_rpm, created_at")
    .single();

  if (error || !newKey) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create key" } },
      { status: 500 },
    );
  }

  return jsonNoStore(
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
