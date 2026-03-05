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

  const currentBalance = Number(credit?.balance ?? 0);
  const nextBalance = currentBalance + amount;
  const currentPurchased = Number(credit?.total_purchased ?? 0);
  const currentEarned = Number(credit?.total_earned ?? 0);
  const nextPurchased =
    txType === "purchase" ? currentPurchased + amount : currentPurchased;
  const nextEarned = txType === "purchase" ? currentEarned : currentEarned + amount;

  let creditId = credit?.id ?? null;
  if (!credit) {
    const { data: agent } = await db
      .from("agents")
      .select("owner_account_id")
      .eq("id", agentId)
      .maybeSingle();

    const insertCredit = await db
      .from("credits")
      .insert({
        agent_id: agentId,
        account_id: agent?.owner_account_id ?? null,
        balance: nextBalance.toFixed(8),
        total_purchased: nextPurchased.toFixed(8),
        total_earned: nextEarned.toFixed(8),
      })
      .select("id")
      .single();

    if (insertCredit.error || !insertCredit.data) {
      console.error(`Manual credit insert failed for agent ${agentId}:`, insertCredit.error);
      return false;
    }
    creditId = insertCredit.data.id;
  } else {
    const updateCredit = await db
      .from("credits")
      .update({
        balance: nextBalance.toFixed(8),
        total_purchased: nextPurchased.toFixed(8),
        total_earned: nextEarned.toFixed(8),
        updated_at: new Date().toISOString(),
      })
      .eq("id", credit.id);

    if (updateCredit.error) {
      console.error(`Manual credit update failed for agent ${agentId}:`, updateCredit.error);
      return false;
    }
  }

  // Audit insert is best-effort because older production schemas may require
  // additional columns (e.g. balance_before/balance_after).
  const txBase = {
    agent_id: agentId,
    type: txType,
    amount: amount.toFixed(8),
    description,
    reference_id: referenceId ?? null,
  };
  const txInsert = await db.from("credit_transactions").insert(txBase);
  if (txInsert.error) {
    // Some deployments include additional audit columns like
    // balance_before/balance_after; use an untyped insert fallback.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withBalances = await (db.from("credit_transactions") as any).insert({
      ...txBase,
      balance_before: currentBalance.toFixed(8),
      balance_after: nextBalance.toFixed(8),
      credit_id: creditId,
    });

    if (withBalances.error) {
      console.warn(
        `Manual grant succeeded but credit transaction audit insert failed for agent ${agentId}:`,
        withBalances.error,
      );
    }
  }

  return true;
}
