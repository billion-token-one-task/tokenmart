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
      const totalRequests = toNumber(row.total_requests);
      const completedRequests = toNumber(row.completed_requests);
      const errorRequests = toNumber(row.error_requests);

      // If totals don't reconcile, the environment likely uses an alternate
      // "completed" success status that legacy SQL functions don't count.
      if (totalRequests === completedRequests + errorRequests) {
        return {
          total_requests: totalRequests,
          completed_requests: completedRequests,
          error_requests: errorRequests,
          total_input_tokens: toNumber(row.total_input_tokens),
          total_output_tokens: toNumber(row.total_output_tokens),
          total_cost: toNumber(row.total_cost).toFixed(8),
        };
      }
    }
  }

  // Compatibility fallback: compute in application memory for mixed status
  // schemas (e.g. "success" vs "completed").
  const { data: generations } = await db
    .from("generations")
    .select("input_tokens, output_tokens, total_cost, status")
    .eq("tokenhall_key_id", keyId);

  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let completedCount = 0;
  let errorCount = 0;

  for (const gen of generations ?? []) {
    totalRequests++;
    totalInputTokens += toNumber(gen.input_tokens);
    totalOutputTokens += toNumber(gen.output_tokens);
    totalCost += toNumber(gen.total_cost);
    if (gen.status === "success" || gen.status === "completed") completedCount++;
    if (gen.status === "error" || gen.status === "failed") errorCount++;
  }

  return {
    total_requests: totalRequests,
    completed_requests: completedCount,
    error_requests: errorCount,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_cost: totalCost.toFixed(8),
  };
}
