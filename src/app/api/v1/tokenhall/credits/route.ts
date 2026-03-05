import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureAccountWallet,
  ensureAgentWallet,
  formatCreditAmount,
  getOwnedWalletAddresses,
  listRecentTransfersForWallets,
  parseCreditAmount,
  type WalletSummary,
} from "@/lib/tokenhall/wallets";

export const runtime = "nodejs";

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function summarizeWallet(wallet: WalletSummary) {
  return {
    owner_type: wallet.owner_type,
    wallet_address: wallet.wallet_address,
    account_id: wallet.account_id,
    agent_id: wallet.agent_id,
    balance: wallet.balance,
    total_transferred_in: wallet.total_transferred_in,
    total_transferred_out: wallet.total_transferred_out,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenhall", "tokenhall_management", "tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const { context } = auth;
  const db = createAdminClient();

  let scopedAgentIds: string[] = [];
  let scope: "agent" | "account" = "agent";

  let mainWallet: WalletSummary | null = null;
  let agentWallets: WalletSummary[] = [];
  let primaryWallet: WalletSummary | null = null;
  let walletAddresses: string[] = [];

  if (context.agent_id) {
    scope = "agent";
    const { data: agentRow } = await db
      .from("agents")
      .select("owner_account_id")
      .eq("id", context.agent_id)
      .maybeSingle();

    const ownerAccountId = agentRow?.owner_account_id ?? null;
    const agentWallet = await ensureAgentWallet(context.agent_id, ownerAccountId, db);

    scopedAgentIds = [context.agent_id];
    agentWallets = [agentWallet];
    primaryWallet = agentWallet;
    walletAddresses = [agentWallet.wallet_address];

    if (ownerAccountId) {
      mainWallet = await ensureAccountWallet(ownerAccountId, db);
      walletAddresses.push(mainWallet.wallet_address);
    }
  } else if (context.account_id) {
    scope = "account";

    const owned = await getOwnedWalletAddresses(context.account_id, db);
    mainWallet = owned.main_wallet;
    agentWallets = owned.agent_wallets;
    scopedAgentIds = owned.agent_wallets
      .map((wallet) => wallet.agent_id)
      .filter((agentId): agentId is string => Boolean(agentId));

    primaryWallet = mainWallet;
    walletAddresses = owned.wallet_addresses;
  } else {
    return NextResponse.json(
      { error: { code: 400, message: "Key is not associated with an agent or account" } },
      { status: 400 },
    );
  }

  const hasAgent = scopedAgentIds.length > 0;

  const [{ data: creditsRows, error: creditsError }, transactionsResult, recentTransfers] =
    await Promise.all([
      hasAgent
        ? db
            .from("credits")
            .select("balance, total_purchased, total_earned, total_spent")
            .in("agent_id", scopedAgentIds)
        : Promise.resolve({ data: [], error: null }),
      hasAgent
        ? db
            .from("credit_transactions")
            .select("id, type, amount, description, reference_id, created_at")
            .in("agent_id", scopedAgentIds)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      listRecentTransfersForWallets(walletAddresses, 50, db),
    ]);

  if (creditsError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch credits" } },
      { status: 500 },
    );
  }

  const totals = (creditsRows ?? []).reduce(
    (acc, row) => {
      acc.balance += toNumber(row.balance);
      acc.totalPurchased += toNumber(row.total_purchased);
      acc.totalEarned += toNumber(row.total_earned);
      acc.totalSpent += toNumber(row.total_spent);
      return acc;
    },
    { balance: 0, totalPurchased: 0, totalEarned: 0, totalSpent: 0 },
  );

  const mainWalletBalance = parseCreditAmount(mainWallet?.balance);
  const agentWalletBalance = agentWallets.reduce(
    (sum, wallet) => sum + parseCreditAmount(wallet.balance),
    0,
  );
  const combinedWalletBalance = mainWalletBalance + agentWalletBalance;

  const responseBalance = scope === "account" ? combinedWalletBalance : agentWalletBalance;

  return NextResponse.json({
    balance: formatCreditAmount(responseBalance),
    total_purchased: formatCreditAmount(totals.totalPurchased),
    total_earned: formatCreditAmount(totals.totalEarned),
    total_spent: formatCreditAmount(totals.totalSpent),
    transactions: transactionsResult.data ?? [],
    wallet_transfers: recentTransfers,
    has_agent: hasAgent,
    scope,
    agent_count: scopedAgentIds.length,
    main_wallet_balance: formatCreditAmount(mainWalletBalance),
    sub_wallet_balance: formatCreditAmount(agentWalletBalance),
    combined_wallet_balance: formatCreditAmount(combinedWalletBalance),
    wallets: {
      primary: primaryWallet ? summarizeWallet(primaryWallet) : null,
      main: mainWallet ? summarizeWallet(mainWallet) : null,
      agents: agentWallets.map(summarizeWallet),
    },
  });
}
