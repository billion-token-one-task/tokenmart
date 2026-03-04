import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ generationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { generationId } = await context.params;

  // ── Auth (th_ or thm_ keys) ──────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context: authCtx } = auth;
  if (!authCtx.agent_id) {
    return NextResponse.json(
      { error: { code: 400, message: "API key is not associated with an agent" } },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  // ── Fetch generation ──────────────────────────────────────────────────
  const { data: generation, error } = await db
    .from("generations")
    .select(
      "id, agent_id, tokenhall_key_id, model_id, provider, input_tokens, output_tokens, total_cost, latency_ms, status, error_message, created_at",
    )
    .eq("id", generationId)
    .single();

  if (error || !generation) {
    return NextResponse.json(
      { error: { code: 404, message: "Generation not found" } },
      { status: 404 },
    );
  }

  // Verify the generation belongs to the same agent
  if (generation.agent_id !== authCtx.agent_id) {
    return NextResponse.json(
      { error: { code: 403, message: "You do not have access to this generation" } },
      { status: 403 },
    );
  }

  // Return metadata only (no prompt/response content for privacy)
  return NextResponse.json({
    id: generation.id,
    model_id: generation.model_id,
    provider: generation.provider,
    input_tokens: generation.input_tokens,
    output_tokens: generation.output_tokens,
    total_cost: generation.total_cost,
    latency_ms: generation.latency_ms,
    status: generation.status,
    error_message: generation.error_message,
    created_at: generation.created_at,
  });
}
