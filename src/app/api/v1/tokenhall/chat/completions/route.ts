import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkKeyRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { routeRequest, RouterError } from "@/lib/tokenhall/router";
import type { ChatCompletionRequest, ChatCompletionResponse } from "@/types/tokenhall";
import { ProviderError } from "@/lib/tokenhall/providers/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function openaiError(message: string, type: string, code: number) {
  return Response.json(
    { error: { message, type, code } },
    { status: code },
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: "tokenhall",
  });
  if (!auth.success) {
    return openaiError(auth.error, "authentication_error", auth.status);
  }

  const { context } = auth;
  if (!context.agent_id) {
    return openaiError("API key is not associated with an agent", "invalid_request_error", 400);
  }

  // ── Rate limit ────────────────────────────────────────────────────────
  const db = createAdminClient();
  const { data: keyRow } = await db
    .from("tokenhall_api_keys")
    .select("rate_limit_rpm")
    .eq("id", context.key_id)
    .single();

  const rpm = keyRow?.rate_limit_rpm ?? 60;
  const rl = await checkKeyRateLimit(context.key_id, rpm);
  if (!rl.allowed) {
    return openaiError("Rate limit exceeded", "rate_limit_error", 429);
  }

  // ── Parse body ────────────────────────────────────────────────────────
  let body: ChatCompletionRequest;
  try {
    body = await request.json();
  } catch {
    return openaiError("Invalid JSON body", "invalid_request_error", 400);
  }

  if (!body.model || !body.messages || !Array.isArray(body.messages)) {
    return openaiError(
      "model and messages are required",
      "invalid_request_error",
      400,
    );
  }

  // ── Route to provider ─────────────────────────────────────────────────
  // The router handles balance checks, billing, credit deduction, and
  // generation recording internally.

  const rlHeaders = rateLimitHeaders(rl);
  const baseHeaders: Record<string, string> = {
    "X-Request-Id": requestId,
    "Cache-Control": "no-cache",
    ...rlHeaders,
  };

  try {
    const result = await routeRequest(body, context.agent_id, context.key_id);

    if (result instanceof ReadableStream) {
      // ── Streaming response ──────────────────────────────────────────
      // The router returns an SSE-formatted ReadableStream when
      // request.stream is true.
      return new Response(result, {
        headers: {
          "Content-Type": "text/event-stream",
          "Connection": "keep-alive",
          ...baseHeaders,
        },
      });
    } else {
      // ── Non-streaming response ────────────────────────────────────
      const response = result as ChatCompletionResponse;
      return Response.json(response, {
        headers: {
          "Content-Type": "application/json",
          ...baseHeaders,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";

    if (err instanceof RouterError) {
      return openaiError(
        message,
        err.status >= 500 ? "server_error" : "invalid_request_error",
        err.status,
      );
    }

    if (err instanceof ProviderError) {
      return openaiError(message, "provider_error", err.status);
    }

    return openaiError(message, "server_error", 500);
  }
}
