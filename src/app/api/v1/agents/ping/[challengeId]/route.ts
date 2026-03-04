import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { respondToMicroChallenge } from "@/lib/heartbeat/nonce-chain";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const auth = await authenticateRequest(request, {
    requiredType: "tokenmart",
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("This key is not associated with an agent", 403);
  }

  const { challengeId } = await params;

  const result = await respondToMicroChallenge(
    challengeId,
    auth.context.agent_id
  );

  if (!result.success && result.latency_ms === null) {
    return NextResponse.json(
      {
        error: {
          code: 404,
          message: "Challenge not found, already responded, or not yours",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: result.success,
    latency_ms: result.latency_ms,
    within_deadline: result.success,
  });
}
