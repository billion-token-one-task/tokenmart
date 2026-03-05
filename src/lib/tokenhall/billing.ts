import { createAdminClient } from "@/lib/supabase/admin";
import type { CreditBalance } from "@/types/tokenhall";

// ─────────────────────────────────────────────────────────────────────────────
// Credit & billing utilities for TokenHall
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the credit cost of a generation based on the model's pricing and
 * the number of tokens consumed.
 *
 * Pricing is stored in the `models` table as dollars per 1 million tokens.
 * The function returns the cost in the same unit as credits (dollars).
 *
 * If the model is not found in the database the function returns 0 so that
 * unknown-model requests can still proceed (the generation will be recorded
 * at zero cost and can be reconciled later).
 */
export async function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const supabase = createAdminClient();

  let model:
    | {
        input_price_per_million: string;
        output_price_per_million: string;
      }
    | null
    | undefined;

  const activeResult = await supabase
    .from("models")
    .select("input_price_per_million, output_price_per_million")
    .eq("model_id", modelId)
    .eq("active", true)
    .single();

  if (!activeResult.error) {
    model = activeResult.data as typeof model;
  } else {
    // Backward compatibility for environments still using is_active.
    const legacyResult = await supabase
      .from("models")
      .select("input_price_per_million, output_price_per_million")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .single();
    model = legacyResult.data as typeof model;
  }

  if (!model) return 0;

  const inputPrice = parseFloat(model.input_price_per_million) || 0;
  const outputPrice = parseFloat(model.output_price_per_million) || 0;

  const inputCost = (inputTokens / 1_000_000) * inputPrice;
  const outputCost = (outputTokens / 1_000_000) * outputPrice;

  return inputCost + outputCost;
}

/**
 * Check whether an agent has enough credit balance to cover the estimated
 * cost of an upcoming generation.
 *
 * @returns `true` if the balance is sufficient, `false` otherwise.
 */
export async function checkBalance(
  agentId: string,
  estimatedCost: number,
  keyId?: string,
): Promise<boolean> {
  const balance = await getBalance(agentId);
  const available = parseFloat(balance.balance) || 0;
  if (available < estimatedCost) return false;

  if (keyId) {
    return checkKeyCreditLimit(keyId, estimatedCost);
  }

  return true;
}

/**
 * Deduct credits from an agent's balance.
 *
 * This calls the `deduct_credits` PostgreSQL function via Supabase RPC,
 * which atomically decrements the balance and creates a credit_transaction
 * row in a single transaction.
 *
 * @param agentId      The agent whose credits are debited.
 * @param amount       The positive amount to deduct.
 * @param description  Human-readable reason (e.g. "Generation: gpt-4o").
 * @param referenceId  Optional reference to the generations row.
 * @returns `true` if the deduction succeeded, `false` if it failed (e.g.
 *          insufficient balance or RPC error).
 */
export async function deductCredits(
  agentId: string,
  amount: number,
  description: string,
  referenceId?: string,
  keyId?: string,
): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) return true;

  const supabase = createAdminClient();

  if (keyId) {
    // Preferred keyed settlement path: atomically enforce key caps + balance deduction.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyedRpc = await (supabase.rpc as any)("deduct_credits_with_key_limit", {
      p_agent_id: agentId,
      p_key_id: keyId,
      p_amount: amount.toFixed(10),
      p_description: description,
      p_reference_id: referenceId ?? null,
    });

    if (!keyedRpc.error) {
      return Boolean(keyedRpc.data);
    }

    if (!isMissingRpcFunction(keyedRpc.error, "deduct_credits_with_key_limit")) {
      console.error(
        `deduct_credits_with_key_limit RPC failed (${keyedRpc.error.message})`,
      );
      return false;
    }
  }

  // Enforce optional per-key spending caps before legacy settlement paths.
  if (keyId) {
    const allowedByKeyLimit = await checkKeyCreditLimit(keyId, amount);
    if (!allowedByKeyLimit) return false;
  }

  // Try the RPC function first -- this is the preferred path because it
  // handles atomicity and balance checks in SQL.
  // Cast to `any` because the deduct_credits RPC function may not yet be
  // reflected in the generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)("deduct_credits", {
    p_agent_id: agentId,
    p_amount: amount.toFixed(10),
    p_description: description,
    p_reference_id: referenceId ?? null,
  });

  if (!rpcError) {
    if (keyId) {
      await incrementKeySpentCredits(keyId, amount);
    }
    return true;
  }

  // If the RPC function doesn't exist yet (e.g. migrations haven't run),
  // fall back to a manual two-step update.  This is NOT atomic but prevents
  // the system from being completely broken during development.
  console.warn(
    `deduct_credits RPC failed (${rpcError.message}), falling back to manual update`,
  );

  const { data: credit } = await supabase
    .from("credits")
    .select("id, balance, total_spent")
    .eq("agent_id", agentId)
    .single();

  if (!credit) return false;

  const currentBalance = parseFloat(credit.balance) || 0;
  if (currentBalance < amount) return false;

  const newBalance = (currentBalance - amount).toFixed(10);
  const newTotalSpent = (
    (parseFloat(credit.total_spent) || 0) + amount
  ).toFixed(10);

  const { error: updateError } = await supabase
    .from("credits")
    .update({
      balance: newBalance,
      total_spent: newTotalSpent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credit.id);

  if (updateError) return false;

  if (keyId) {
    await incrementKeySpentCredits(keyId, amount);
  }

  // Record the transaction.
  await supabase.from("credit_transactions").insert({
    agent_id: agentId,
    type: "api_usage",
    amount: (-amount).toFixed(10),
    description,
    reference_id: referenceId ?? null,
  });

  return true;
}

/**
 * Enforce key-level spending caps using tokenhall_api_keys.credit_limit.
 * Limit semantics: total successful generations for the key + additionalCost <= credit_limit.
 */
async function checkKeyCreditLimit(
  keyId: string,
  additionalCost: number,
): Promise<boolean> {
  if (!Number.isFinite(additionalCost) || additionalCost <= 0) return true;

  const supabase = createAdminClient();

  const { data: keyRow, error: keyError } = await supabase
    .from("tokenhall_api_keys")
    .select("credit_limit, spent_credits")
    .eq("id", keyId)
    .single();

  if (keyError || !keyRow) {
    return legacyCheckKeyCreditLimit(keyId, additionalCost);
  }

  const parsedKeyRow = keyRow as {
    credit_limit?: string | number | null;
    spent_credits?: string | number | null;
  };

  const rawLimit =
    typeof parsedKeyRow.credit_limit === "number"
      ? parsedKeyRow.credit_limit
      : parseFloat(parsedKeyRow.credit_limit ?? "NaN");
  if (!Number.isFinite(rawLimit)) return true;
  if (rawLimit <= 0) return false;

  const trackedSpent =
    typeof parsedKeyRow.spent_credits === "number"
      ? parsedKeyRow.spent_credits
      : parseFloat(parsedKeyRow.spent_credits ?? "NaN");
  if (Number.isFinite(trackedSpent)) {
    return trackedSpent + additionalCost <= rawLimit + 1e-9;
  }

  return legacyCheckKeyCreditLimit(keyId, additionalCost);
}

async function legacyCheckKeyCreditLimit(
  keyId: string,
  additionalCost: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: keyRow, error: keyError } = await supabase
    .from("tokenhall_api_keys")
    .select("credit_limit")
    .eq("id", keyId)
    .single();

  if (keyError || !keyRow) return true;

  const rawLimit =
    typeof keyRow.credit_limit === "number"
      ? keyRow.credit_limit
      : parseFloat(keyRow.credit_limit ?? "NaN");
  if (!Number.isFinite(rawLimit)) return true;
  if (rawLimit <= 0) return false;

  const { data: generationRows, error: genError } = await supabase
    .from("generations")
    .select("total_cost")
    .eq("tokenhall_key_id", keyId)
    .eq("status", "success");

  if (genError) return true;

  const spent = (generationRows ?? []).reduce((sum, row) => {
    const cost =
      typeof row.total_cost === "number"
        ? row.total_cost
        : parseFloat(row.total_cost ?? "0");
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);

  return spent + additionalCost <= rawLimit + 1e-9;
}

function isMissingRpcFunction(error: { code?: string; message?: string }, fnName: string): boolean {
  const message = error.message ?? "";
  return error.code === "PGRST202" || message.includes(fnName);
}

async function incrementKeySpentCredits(keyId: string, amount: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: keyRow } = await supabase
    .from("tokenhall_api_keys")
    .select("spent_credits")
    .eq("id", keyId)
    .maybeSingle();
  const previousSpent = parseFloat(
    (keyRow as { spent_credits?: string } | null)?.spent_credits ?? "0",
  ) || 0;
  try {
    await supabase
      .from("tokenhall_api_keys")
      .update({
        spent_credits: (previousSpent + amount).toFixed(10),
      } as never)
      .eq("id", keyId);
  } catch {
    // Best-effort in legacy fallback paths.
  }
}

/**
 * Retrieve the current credit balance for an agent.
 */
export async function getBalance(agentId: string): Promise<CreditBalance> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("credits")
    .select("total_purchased, total_earned, total_spent, balance")
    .eq("agent_id", agentId)
    .single();

  if (error || !data) {
    return {
      total_purchased: "0",
      total_earned: "0",
      total_spent: "0",
      balance: "0",
    };
  }

  return {
    total_purchased: data.total_purchased,
    total_earned: data.total_earned,
    total_spent: data.total_spent,
    balance: data.balance,
  };
}
