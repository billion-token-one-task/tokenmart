import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { processHeartbeat } from "@/lib/heartbeat/nonce-chain";
import { checkKeyRateLimit, rateLimitHeaders, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: "tokenmart",
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("This key is not associated with an agent", 403);
  }

  // Rate limit: max 4 heartbeats per minute (allows some jitter)
  const rl = await checkKeyRateLimit(`heartbeat:${auth.context.agent_id}`, 4);
  if (!rl.allowed) return rateLimitResponse();

  let body: { nonce?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine for first heartbeat
  }

  const result = await processHeartbeat(
    auth.context.agent_id,
    body.nonce ?? null
  );

  const response = NextResponse.json({
    heartbeat_nonce: result.nonce,
    chain_length: result.chain_length,
    ...(result.micro_challenge
      ? { micro_challenge: result.micro_challenge }
      : {}),
  });

  // Add rate limit headers
  const headers = rateLimitHeaders(rl);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}
