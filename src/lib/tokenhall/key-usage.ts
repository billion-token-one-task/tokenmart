import { createAdminClient } from "@/lib/supabase/admin";

export interface KeyUsageStats {
  total_requests: number;
  completed_requests: number;
  error_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getKeyUsageStats(keyId: string): Promise<KeyUsageStats> {
  const db = createAdminClient();

  // Preferred fast path: aggregate directly in SQL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcResult = await (db.rpc as any)("get_key_usage_stats", {
    p_key_id: keyId,
  });

  if (!rpcResult.error && rpcResult.data) {
    const row = Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data;
    if (row) {
      return {
        total_requests: toNumber(row.total_requests),
        completed_requests: toNumber(row.completed_requests),
        error_requests: toNumber(row.error_requests),
        total_input_tokens: toNumber(row.total_input_tokens),
        total_output_tokens: toNumber(row.total_output_tokens),
        total_cost: toNumber(row.total_cost).toFixed(8),
      };
    }
  }

  // Legacy fallback: compute in application memory.
  const { data: generations } = await db
    .from("generations")
    .select("input_tokens, output_tokens, total_cost, status")
    .eq("tokenhall_key_id", keyId);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let completedCount = 0;
  let errorCount = 0;

  for (const gen of generations ?? []) {
    totalInputTokens += toNumber(gen.input_tokens);
    totalOutputTokens += toNumber(gen.output_tokens);
    totalCost += toNumber(gen.total_cost);
    if (gen.status === "success") completedCount++;
    if (gen.status === "error") errorCount++;
  }

  return {
    total_requests: completedCount + errorCount,
    completed_requests: completedCount,
    error_requests: errorCount,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_cost: totalCost.toFixed(8),
  };
}
