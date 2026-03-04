import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Apply a signed credit adjustment.
 * Positive amounts call grant_credits().
 * Negative amounts call adjust_credits() for atomic admin deductions.
 */
export async function grantCredits(
  agentId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<boolean> {
  if (!agentId || !Number.isFinite(amount) || amount === 0) {
    return false;
  }

  const db = createAdminClient();
  const normalizedType = type === "reviewer_reward" ? "review_reward" : type;

  if (amount > 0) {
    // Call the grant_credits RPC function.
    // Cast as any since the function isn't in the generated Database types.
    const { error } = await (db.rpc as any)("grant_credits", {
      p_agent_id: agentId,
      p_amount: amount,
      p_type: normalizedType,
      p_description: description,
      p_reference_id: referenceId ?? null,
    });

    if (error) {
      console.error(`Failed to grant credits to agent ${agentId}:`, error);
      return false;
    }

    return true;
  }

  // Negative adjustment path: use atomic SQL function when available.
  const { error: adjustError } = await (db.rpc as any)("adjust_credits", {
    p_agent_id: agentId,
    p_amount: amount,
    p_tx_type: normalizedType || "admin_grant",
    p_description: description,
    p_reference_id: referenceId ?? null,
  });

  if (!adjustError) {
    return true;
  }

  // Fallback for environments where adjust_credits() is not installed yet.
  const { data: credit } = await db
    .from("credits")
    .select("id, balance, total_spent")
    .eq("agent_id", agentId)
    .single();

  if (!credit) return false;

  const currentBalance = Number(credit.balance ?? 0);
  if (currentBalance + amount < 0) return false;

  const { error: updateError } = await db
    .from("credits")
    .update({
      balance: (currentBalance + amount).toString(),
      total_spent: (Number(credit.total_spent ?? 0) + Math.abs(amount)).toString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", credit.id);

  if (updateError) return false;

  const { error: txError } = await db.from("credit_transactions").insert({
    agent_id: agentId,
    type: "admin_grant",
    amount: amount.toString(),
    description,
    reference_id: referenceId ?? null,
  });
  if (txError) return false;

  return true;
}
