import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // ── Auth (th_ or thm_ keys) ──────────────────────────────────────────
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management", "tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  // ── Fetch active models ───────────────────────────────────────────────
  const db = createAdminClient();
  let models:
    | Array<{
        model_id: string;
        name: string;
        provider: string;
        input_price_per_million: string;
        output_price_per_million: string;
        context_length: number | null;
        max_output_tokens: number | null;
        supports_streaming: boolean;
        supports_tools: boolean;
        supports_vision: boolean;
        metadata: unknown;
      }>
    | null
    | undefined;
  let error: { message: string } | null = null;

  const activeQuery = await db
    .from("models")
    .select(
      "model_id, name, provider, input_price_per_million, output_price_per_million, context_length, max_output_tokens, supports_streaming, supports_tools, supports_vision, metadata",
    )
    .eq("active", true)
    .order("provider")
    .order("name");
  if (!activeQuery.error) {
    models = activeQuery.data as typeof models;
  } else {
    const legacyQuery = await db
      .from("models")
      .select(
        "model_id, name, provider, input_price_per_million, output_price_per_million, context_length, max_output_tokens, supports_streaming, supports_tools, supports_vision, metadata",
      )
      .eq("is_active", true)
      .order("provider")
      .order("name");
    models = legacyQuery.data as typeof models;
    error = legacyQuery.error;
  }

  if (!models && error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch models" } },
      { status: 500 },
    );
  }

  const data = (models ?? []).map((m) => ({
    id: m.model_id,
    name: m.name,
    provider: m.provider,
    description: (m.metadata as Record<string, unknown>)?.description ?? null,
    context_length: m.context_length ?? 0,
    max_output_tokens: m.max_output_tokens,
    pricing: {
      input: m.input_price_per_million,
      output: m.output_price_per_million,
    },
    supports_streaming: m.supports_streaming,
    supports_tools: m.supports_tools,
    supports_vision: m.supports_vision,
  }));

  return NextResponse.json({ models: data });
}
