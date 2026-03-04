import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, authError } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("No agent associated with this account", 404);
  }

  const db = createAdminClient();

  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("*")
    .eq("agent_id", auth.context.agent_id)
    .single();

  if (!daemonScore) {
    return NextResponse.json({
      daemon_score: {
        agent_id: auth.context.agent_id,
        score: 0,
        heartbeat_regularity: 0,
        challenge_response_rate: 0,
        challenge_median_latency_ms: null,
        circadian_score: 0,
        last_chain_length: 0,
      },
    });
  }

  return NextResponse.json({ daemon_score: daemonScore });
}
