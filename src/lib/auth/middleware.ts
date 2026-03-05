import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashKey, detectKeyType } from "./keys";
import { extractBearerToken } from "./verify";
import type { AuthContext, KeyType } from "@/types/auth";

export interface AuthResult {
  success: true;
  context: AuthContext;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Authenticate a request using the Authorization header.
 * Supports tokenmart_, th_, thm_ key types AND session tokens (from human login).
 */
export async function authenticateRequest(
  request: NextRequest,
  options?: {
    requiredType?: KeyType | KeyType[];
    requiredPermissions?: string[];
  }
): Promise<AuthResult | AuthError> {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { success: false, error: "Missing Authorization header", status: 401 };
  }

  const keyType = detectKeyType(token);

  // No recognized prefix → try session-based auth (human login refresh token)
  if (!keyType) {
    return authenticateSession(token, options, request);
  }

  // Check if the key type is allowed
  if (options?.requiredType) {
    const allowed = Array.isArray(options.requiredType)
      ? options.requiredType
      : [options.requiredType];
    if (!allowed.includes(keyType as KeyType)) {
      return {
        success: false,
        error: `This endpoint requires a ${allowed.join(" or ")} key`,
        status: 403,
      };
    }
  }

  const keyHash = hashKey(token);
  const db = createAdminClient();

  let keyData: {
    id: string;
    agent_id: string | null;
    account_id: string | null;
    permissions: string[];
    revoked: boolean;
    expires_at: string | null;
  } | null = null;

  if (keyType === "tokenmart") {
    const { data } = await db
      .from("auth_api_keys")
      .select("id, agent_id, account_id, permissions, revoked, expires_at")
      .eq("key_hash", keyHash)
      .single();
    keyData = data;
  } else {
    // th_ or thm_ keys
    const primary = await db
      .from("tokenhall_api_keys")
      .select("id, agent_id, account_id, revoked, expires_at, is_management_key")
      .eq("key_hash", keyHash)
      .single();

    // Legacy schema fallback: some existing DBs may not have expires_at yet.
    const fallback = primary.error
      ? await db
          .from("tokenhall_api_keys")
          .select("id, agent_id, account_id, revoked, is_management_key")
          .eq("key_hash", keyHash)
          .single()
      : null;

    const data = (primary.data ??
      (fallback?.data
        ? { ...fallback.data, expires_at: null }
        : null)) as
      | {
          id: string;
          agent_id: string | null;
          account_id: string | null;
          revoked: boolean;
          expires_at: string | null;
          is_management_key: boolean;
        }
      | null;

    if (data) {
      const isManagement = data.is_management_key;
      if (keyType === "tokenhall_management" && !isManagement) {
        return { success: false, error: "Invalid management key", status: 403 };
      }
      if (keyType === "tokenhall" && isManagement) {
        return {
          success: false,
          error: "Management keys cannot be used for API calls. Use a th_ key.",
          status: 403,
        };
      }
      keyData = {
        id: data.id,
        agent_id: data.agent_id,
        account_id: data.account_id,
        permissions: isManagement ? ["manage"] : ["chat"],
        revoked: data.revoked,
        expires_at: data.expires_at,
      };
    }
  }

  if (!keyData) {
    return { success: false, error: "Invalid API key", status: 401 };
  }

  if (keyData.revoked) {
    return { success: false, error: "API key has been revoked", status: 401 };
  }

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { success: false, error: "API key has expired", status: 401 };
  }

  // Check required permissions
  if (options?.requiredPermissions) {
    const hasAll = options.requiredPermissions.every((p) =>
      keyData!.permissions.includes(p)
    );
    if (!hasAll) {
      return { success: false, error: "Insufficient permissions", status: 403 };
    }
  }

  // Update last_used_at (fire and forget)
  if (keyType === "tokenmart") {
    db.from("auth_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id)
      .then();
  } else {
    db.from("tokenhall_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id)
      .then();
  }

  return {
    success: true,
    context: {
      type: keyType as KeyType,
      agent_id: keyData.agent_id,
      account_id: keyData.account_id,
      key_id: keyData.id,
      permissions: keyData.permissions,
    },
  };
}

/**
 * Authenticate using a session refresh token (from human login).
 * Looks up the session, resolves the account, and finds the primary agent.
 */
async function authenticateSession(
  token: string,
  options?: {
    requiredType?: KeyType | KeyType[];
    requiredPermissions?: string[];
  },
  request?: NextRequest
): Promise<AuthResult | AuthError> {
  // Session auth is only valid for endpoints that accept "tokenmart" or "session" type
  if (options?.requiredType) {
    const allowed = Array.isArray(options.requiredType)
      ? options.requiredType
      : [options.requiredType];
    if (!allowed.includes("tokenmart") && !allowed.includes("session")) {
      return {
        success: false,
        error: `This endpoint requires a ${allowed.join(" or ")} key`,
        status: 403,
      };
    }
  }

  const tokenHash = hashKey(token);
  const db = createAdminClient();

  // Look up session by refresh_token_hash
  const { data: session } = await db
    .from("sessions")
    .select("id, account_id, expires_at")
    .eq("refresh_token_hash", tokenHash)
    .single();

  if (!session) {
    return { success: false, error: "Invalid or expired session", status: 401 };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { success: false, error: "Session has expired", status: 401 };
  }

  const requestedAgentId = request?.headers.get("x-agent-id")?.trim() || null;

  let resolvedAgentId: string | null = null;
  if (requestedAgentId) {
    const { data: ownedAgent } = await db
      .from("agents")
      .select("id")
      .eq("owner_account_id", session.account_id)
      .eq("id", requestedAgentId)
      .maybeSingle();

    if (!ownedAgent) {
      return {
        success: false,
        error: "X-Agent-Id does not belong to this account",
        status: 403,
      };
    }
    resolvedAgentId = requestedAgentId;
  } else {
    // Fast ambiguity check without loading full agent inventories.
    const { data: candidateAgents } = await db
      .from("agents")
      .select("id")
      .eq("owner_account_id", session.account_id)
      .order("created_at", { ascending: true })
      .limit(2);

    if ((candidateAgents ?? []).length === 1) {
      resolvedAgentId = candidateAgents![0].id;
    }
  }

  return {
    success: true,
    context: {
      type: "session",
      agent_id: resolvedAgentId,
      account_id: session.account_id,
      key_id: session.id,
      permissions: ["*"],
    },
  };
}

/**
 * Helper to create a JSON error response.
 */
export function authError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code: status, message } }, { status });
}
