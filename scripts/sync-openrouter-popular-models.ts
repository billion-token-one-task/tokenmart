/* eslint-disable no-console */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

interface RankedModel {
  rank: number;
  model_id: string;
  weekly_tokens: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

const SOURCE_DATE = "2026-03-05";
const SOURCE_URL = "https://openrouter.ai/models?order=most-popular";

// Curated from OpenRouter "Most Popular" ranking (March 2026 snapshot).
const POPULAR_MODELS_MAR_2026: RankedModel[] = [
  { rank: 1, model_id: "minimax/minimax-m2.5", weekly_tokens: "1.74T" },
  { rank: 2, model_id: "google/gemini-3-flash-preview", weekly_tokens: "1.13T" },
  { rank: 3, model_id: "moonshotai/kimi-k2.5", weekly_tokens: "896B" },
  { rank: 4, model_id: "deepseek/deepseek-v3.2", weekly_tokens: "798B" },
  { rank: 5, model_id: "anthropic/claude-opus-4.6", weekly_tokens: "730B" },
  { rank: 6, model_id: "anthropic/claude-sonnet-4.6", weekly_tokens: "723B" },
  { rank: 7, model_id: "x-ai/grok-4.1-fast", weekly_tokens: "691B" },
  { rank: 8, model_id: "arcee-ai/trinity-large-preview:free", weekly_tokens: "637B" },
  { rank: 9, model_id: "anthropic/claude-sonnet-4.5", weekly_tokens: "628B" },
  { rank: 10, model_id: "google/gemini-2.5-flash", weekly_tokens: "583B" },
];

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function toPerMillion(value: unknown): string {
  const parsed = Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(parsed) || parsed < 0) return "0.00000000";
  const perMillion = parsed * 1_000_000;
  return perMillion.toFixed(8);
}

function coerceArrayString(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const apply = Boolean(args.apply);
  const limit = Math.max(1, Number.parseInt(String(args.top ?? "10"), 10) || 10);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!openrouterKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const selected = POPULAR_MODELS_MAR_2026.slice(0, limit);

  console.log(`Syncing OpenRouter popular models (${SOURCE_DATE})`);
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);

  const modelsRes = await fetch("https://openrouter.ai/api/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!modelsRes.ok) {
    const body = await modelsRes.text();
    throw new Error(`OpenRouter /models failed (${modelsRes.status}): ${body}`);
  }

  const modelsJson = (await modelsRes.json()) as { data?: OpenRouterModel[] };
  const allModels = Array.isArray(modelsJson.data) ? modelsJson.data : [];
  const byId = new Map(allModels.map((m) => [m.id, m]));

  const rows = selected.map((item) => {
    const model = byId.get(item.model_id);
    if (!model) {
      throw new Error(`Model slug missing from OpenRouter /models: ${item.model_id}`);
    }

    const supportsTools = coerceArrayString(model.supported_parameters).includes("tools");
    const inputModalities = coerceArrayString(model.architecture?.input_modalities);
    const supportsVision = inputModalities.includes("image") || inputModalities.includes("image_url");

    const metadata = {
      source: "openrouter-most-popular",
      source_url: SOURCE_URL,
      source_snapshot_date: SOURCE_DATE,
      popularity_rank: item.rank,
      weekly_tokens: item.weekly_tokens,
      openrouter_name: model.name,
      openrouter_description: model.description ?? null,
      input_modalities: inputModalities,
      output_modalities: coerceArrayString(model.architecture?.output_modalities),
    };

    return {
      model_id: item.model_id,
      name: model.name || item.model_id,
      provider: "openrouter",
      input_price_per_million: toPerMillion(model.pricing?.prompt),
      output_price_per_million: toPerMillion(model.pricing?.completion),
      context_length: Number.isFinite(model.context_length) ? Number(model.context_length) : 0,
      max_output_tokens: Number.isFinite(model.top_provider?.max_completion_tokens)
        ? Number(model.top_provider?.max_completion_tokens)
        : null,
      supports_streaming: true,
      supports_tools: supportsTools,
      supports_vision: supportsVision,
      active: true,
      metadata,
    };
  });

  console.log("\nPlanned upserts:");
  for (const row of rows) {
    console.log(
      `- #${(row.metadata as { popularity_rank: number }).popularity_rank} ${row.model_id} ` +
        `(in=$${row.input_price_per_million}/M, out=$${row.output_price_per_million}/M, ctx=${row.context_length})`,
    );
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to upsert models.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingRows, error: existingError } = await supabase
    .from("models")
    .select("id, model_id")
    .in("model_id", rows.map((r) => r.model_id));

  if (existingError) {
    throw new Error(`Failed to fetch existing model rows: ${existingError.message}`);
  }

  const existingByModelId = new Map(
    (existingRows ?? []).map((row) => [row.model_id, row.id]),
  );

  const withIds = rows.map((row) => ({
    ...row,
    id: existingByModelId.get(row.model_id) ?? randomUUID(),
  }));

  const { error: upsertError } = await supabase
    .from("models")
    .upsert(withIds, { onConflict: "model_id" });

  if (upsertError) {
    throw new Error(`Supabase upsert failed: ${upsertError.message}`);
  }

  console.log(`\nApplied successfully. Upserted ${rows.length} model rows.`);
}

run().catch((err) => {
  console.error(`\nSync failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
