import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, readJsonObject } from "@/lib/http/input";
import { getKeyUsageStats } from "@/lib/tokenhall/key-usage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ keyId: string }> };

// ── GET: Get specific key info ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const { keyId } = await context.params;

  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const db = createAdminClient();

  const { data: keyData, error } = await db
    .from("tokenhall_api_keys")
    .select(
      "id, key_prefix, label, agent_id, account_id, is_management_key, credit_limit, rate_limit_rpm, revoked, created_at, last_used_at",
    )
    .eq("id", keyId)
    .single();

  if (error || !keyData) {
    return NextResponse.json(
      { error: { code: 404, message: "Key not found" } },
      { status: 404 },
    );
  }

  // Verify ownership: the requesting key must belong to the same agent/account
  if (!verifyOwnership(auth.context, keyData)) {
    return NextResponse.json(
      { error: { code: 403, message: "You do not have access to this key" } },
      { status: 403 },
    );
  }

  const usage = await getKeyUsageStats(keyId);

  return jsonNoStore({
    id: keyData.id,
    key_prefix: keyData.key_prefix,
    agent_id: keyData.agent_id,
    account_id: keyData.account_id,
    is_management_key: keyData.is_management_key,
    credit_limit: keyData.credit_limit,
    rate_limit_rpm: keyData.rate_limit_rpm,
    revoked: keyData.revoked,
    created_at: keyData.created_at,
    usage: {
      total_requests: usage.total_requests,
      completed_requests: usage.completed_requests,
      error_requests: usage.error_requests,
      total_input_tokens: usage.total_input_tokens,
      total_output_tokens: usage.total_output_tokens,
      total_cost: usage.total_cost,
    },
  });
}

// ── PATCH: Update key (credit_limit, rate_limit_rpm, revoked) ────

interface PatchKeyBody {
  credit_limit?: number | null;
  rate_limit_rpm?: number | null;
  revoked?: boolean;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { keyId } = await context.params;

  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const db = createAdminClient();

  // Verify the target key exists
  const { data: existing, error: fetchError } = await db
    .from("tokenhall_api_keys")
    .select("id, agent_id, account_id")
    .eq("id", keyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 404, message: "Key not found" } },
      { status: 404 },
    );
  }

  if (!verifyOwnership(auth.context, existing)) {
    return NextResponse.json(
      { error: { code: 403, message: "You do not have access to this key" } },
      { status: 403 },
    );
  }

  const parsedBody = await readJsonObject<PatchKeyBody>(request);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: { code: 400, message: parsedBody.error } },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  // Build update object
  const updates: Record<string, unknown> = {};
  if (body.credit_limit !== undefined) {
    if (body.credit_limit === null) {
      updates.credit_limit = null;
    } else {
      const creditLimit = asFiniteNumber(body.credit_limit);
      if (creditLimit === null || creditLimit < 0) {
        return NextResponse.json(
          { error: { code: 400, message: "credit_limit must be a non-negative number" } },
          { status: 400 },
        );
      }
      updates.credit_limit = String(creditLimit);
    }
  }
  if (body.rate_limit_rpm !== undefined) {
    if (body.rate_limit_rpm === null) {
      updates.rate_limit_rpm = null;
    } else {
      const rateLimitRpm = asFiniteNumber(body.rate_limit_rpm);
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
      updates.rate_limit_rpm = rateLimitRpm;
    }
  }
  if (body.revoked !== undefined) updates.revoked = body.revoked;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "No valid fields to update" } },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await db
    .from("tokenhall_api_keys")
    .update(updates)
    .eq("id", keyId)
    .select(
      "id, key_prefix, is_management_key, credit_limit, rate_limit_rpm, revoked, created_at",
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to update key" } },
      { status: 500 },
    );
  }

  return jsonNoStore(updated);
}

// ── DELETE: Revoke a key (soft delete) ──────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { keyId } = await context.params;

  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const db = createAdminClient();

  // Verify the target key exists
  const { data: existing, error: fetchError } = await db
    .from("tokenhall_api_keys")
    .select("id, agent_id, account_id")
    .eq("id", keyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 404, message: "Key not found" } },
      { status: 404 },
    );
  }

  if (!verifyOwnership(auth.context, existing)) {
    return NextResponse.json(
      { error: { code: 403, message: "You do not have access to this key" } },
      { status: 403 },
    );
  }

  // Prevent revoking your own management key
  if (keyId === auth.context.key_id) {
    return NextResponse.json(
      { error: { code: 400, message: "Cannot revoke the key you are currently using" } },
      { status: 400 },
    );
  }

  const { error: updateError } = await db
    .from("tokenhall_api_keys")
    .update({ revoked: true })
    .eq("id", keyId);

  if (updateError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to revoke key" } },
      { status: 500 },
    );
  }

  return jsonNoStore({ id: keyId, revoked: true });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function verifyOwnership(
  authContext: { agent_id: string | null; account_id: string | null },
  targetKey: { agent_id: string | null; account_id: string | null },
): boolean {
  // The requesting key's agent/account must match the target key's
  if (authContext.agent_id && authContext.agent_id === targetKey.agent_id) {
    return true;
  }
  if (
    authContext.account_id &&
    authContext.account_id === targetKey.account_id
  ) {
    return true;
  }
  return false;
}
