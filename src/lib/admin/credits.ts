import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAgentWallet } from "@/lib/tokenhall/wallets";
import { insertCreditTransactionAudit } from "@/lib/tokenhall/credit-transactions";

type RpcInvoker = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ error: { message?: string } | null }>;

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
  const rpc = db.rpc.bind(db) as unknown as RpcInvoker;

  if (amount > 0) {
    const { error } = await rpc("grant_credits", {
      p_agent_id: agentId,
      p_amount: amount,
      p_type: normalizedType,
      p_description: description,
      p_reference_id: referenceId ?? null,
    });

    if (error) {
      console.warn(
        `grant_credits RPC failed for agent ${agentId} (${error.message}); falling back to manual grant`,
      );
      return applyPositiveGrantManually(
        db,
        agentId,
        amount,
        normalizedType,
        description,
        referenceId,
      );
    }

    return true;
  }

  // Negative adjustment path: use atomic SQL function when available.
  const { error: adjustError } = await rpc("adjust_credits", {
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

  const txResult = await insertCreditTransactionAudit(db, {
    agentId,
    type: "admin_grant",
    amount: amount.toFixed(8),
    description,
    referenceId: referenceId ?? null,
    balanceBefore: currentBalance.toFixed(8),
    balanceAfter: (currentBalance + amount).toFixed(8),
  });
  if (txResult.error) return false;

  return true;
}

async function applyPositiveGrantManually(
  db: ReturnType<typeof createAdminClient>,
  agentId: string,
  amount: number,
  txType: string,
  description: string,
  referenceId?: string,
): Promise<boolean> {
  const { data: credit } = await db
    .from("credits")
    .select("id, account_id, balance, total_purchased, total_earned")
    .eq("agent_id", agentId)
    .maybeSingle();

  let resolvedCredit = credit;
  if (!resolvedCredit) {
    const { data: agent } = await db
      .from("agents")
      .select("owner_account_id")
      .eq("id", agentId)
      .maybeSingle();

    await ensureAgentWallet(agentId, agent?.owner_account_id ?? null, db);

    const ensured = await db
      .from("credits")
      .select("id, account_id, balance, total_purchased, total_earned")
      .eq("agent_id", agentId)
      .maybeSingle();

    resolvedCredit = ensured.data ?? null;
  }

  if (!resolvedCredit) {
    console.error(`Unable to resolve credits row for agent ${agentId}`);
    return false;
  }

  const currentBalance = Number(resolvedCredit.balance ?? 0);
  const nextBalance = currentBalance + amount;
  const currentPurchased = Number(resolvedCredit.total_purchased ?? 0);
  const currentEarned = Number(resolvedCredit.total_earned ?? 0);
  const nextPurchased =
    txType === "purchase" ? currentPurchased + amount : currentPurchased;
  const nextEarned = txType === "purchase" ? currentEarned : currentEarned + amount;
  const creditId = resolvedCredit.id;

  const updateCredit = await db
    .from("credits")
    .update({
      balance: nextBalance.toFixed(8),
      total_purchased: nextPurchased.toFixed(8),
      total_earned: nextEarned.toFixed(8),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedCredit.id);

  if (updateCredit.error) {
    console.error(`Manual credit update failed for agent ${agentId}:`, updateCredit.error);
    return false;
  }

  const txInsert = await insertCreditTransactionAudit(db, {
    agentId,
    type: txType,
    amount: amount.toFixed(8),
    description,
    referenceId: referenceId ?? null,
    balanceBefore: currentBalance.toFixed(8),
    balanceAfter: nextBalance.toFixed(8),
    creditId,
  });
  if (txInsert.error) {
    console.warn(
      `Manual grant succeeded but credit transaction audit insert failed for agent ${agentId}:`,
      txInsert.error,
    );
  }

  return true;
}
