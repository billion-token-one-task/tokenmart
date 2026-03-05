import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureAgentWallet,
  executeWalletTransfer,
  formatCreditAmount,
  getOwnedWalletAddresses,
  listRecentTransfersForWallets,
  normalizeTransferAmount,
  parseCreditAmount,
  resolveWalletByAddress,
  WalletTransferError,
  type WalletSummary,
} from "@/lib/tokenhall/wallets";

export const runtime = "nodejs";

interface TransferRequestBody {
  amount?: unknown;
  memo?: unknown;
  to_wallet_address?: unknown;
  to_agent_id?: unknown;
  from_wallet_address?: unknown;
  from_agent_id?: unknown;
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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function resolveAgentWallet(agentId: string, db: ReturnType<typeof createAdminClient>) {
  const { data: agent } = await db
    .from("agents")
    .select("id, owner_account_id")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) return null;

  return ensureAgentWallet(agent.id, agent.owner_account_id ?? null, db);
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  const db = createAdminClient();
  const { context } = auth;

  let wallets: WalletSummary[] = [];

  if (context.agent_id) {
    const wallet = await resolveAgentWallet(context.agent_id, db);
    if (!wallet) {
      return NextResponse.json(
        { error: { code: 404, message: "Agent wallet not found" } },
        { status: 404 },
      );
    }
    wallets = [wallet];
  } else if (context.account_id) {
    const owned = await getOwnedWalletAddresses(context.account_id, db);
    wallets = [owned.main_wallet, ...owned.agent_wallets];
  } else {
    return NextResponse.json(
      { error: { code: 400, message: "No agent or account context" } },
      { status: 400 },
    );
  }

  const transfers = await listRecentTransfersForWallets(
    wallets.map((wallet) => wallet.wallet_address),
    100,
    db,
  );

  return NextResponse.json({
    transfers,
    wallets: wallets.map(summarizeWallet),
    scope: context.agent_id ? "agent" : "account",
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }

  let body: TransferRequestBody;
  try {
    body = (await request.json()) as TransferRequestBody;
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const normalizedAmount = normalizeTransferAmount(body.amount);
  if (!normalizedAmount.ok) {
    return NextResponse.json(
      { error: { code: 400, message: normalizedAmount.message } },
      { status: 400 },
    );
  }

  const memo = normalizeOptionalString(body.memo);
  if (memo && memo.length > 500) {
    return NextResponse.json(
      { error: { code: 400, message: "memo must be 500 characters or less" } },
      { status: 400 },
    );
  }

  const toWalletAddressInput = normalizeOptionalString(body.to_wallet_address);
  const toAgentId = normalizeOptionalString(body.to_agent_id);

  if (!toWalletAddressInput && !toAgentId) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "Provide destination using either to_wallet_address or to_agent_id",
        },
      },
      { status: 400 },
    );
  }

  if (toWalletAddressInput && toAgentId) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "Provide only one destination selector: to_wallet_address or to_agent_id",
        },
      },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  const { context } = auth;

  let sourceWallet: WalletSummary | null = null;

  if (context.agent_id) {
    const agentWallet = await resolveAgentWallet(context.agent_id, db);
    if (!agentWallet) {
      return NextResponse.json(
        { error: { code: 404, message: "Source agent wallet not found" } },
        { status: 404 },
      );
    }

    const fromWalletAddress = normalizeOptionalString(body.from_wallet_address);
    const fromAgentId = normalizeOptionalString(body.from_agent_id);

    if (fromWalletAddress && fromWalletAddress.toLowerCase() !== agentWallet.wallet_address) {
      return NextResponse.json(
        {
          error: {
            code: 403,
            message: "Agent keys can only transfer from their own sub-wallet",
          },
        },
        { status: 403 },
      );
    }

    if (fromAgentId && fromAgentId !== context.agent_id) {
      return NextResponse.json(
        {
          error: {
            code: 403,
            message: "Agent keys cannot transfer from another agent wallet",
          },
        },
        { status: 403 },
      );
    }

    sourceWallet = agentWallet;
  } else if (context.account_id) {
    const owned = await getOwnedWalletAddresses(context.account_id, db);
    const fromWalletAddress = normalizeOptionalString(body.from_wallet_address);
    const fromAgentId = normalizeOptionalString(body.from_agent_id);

    if (fromWalletAddress && fromAgentId) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: "Provide only one source selector: from_wallet_address or from_agent_id",
          },
        },
        { status: 400 },
      );
    }

    if (fromAgentId) {
      sourceWallet = owned.agent_wallets.find((wallet) => wallet.agent_id === fromAgentId) ?? null;
      if (!sourceWallet) {
        return NextResponse.json(
          {
            error: {
              code: 403,
              message: "from_agent_id does not belong to this account",
            },
          },
          { status: 403 },
        );
      }
    } else if (fromWalletAddress) {
      sourceWallet = [owned.main_wallet, ...owned.agent_wallets].find(
        (wallet) => wallet.wallet_address === fromWalletAddress.toLowerCase(),
      ) ?? null;
      if (!sourceWallet) {
        return NextResponse.json(
          {
            error: {
              code: 403,
              message: "from_wallet_address does not belong to this account",
            },
          },
          { status: 403 },
        );
      }
    } else {
      sourceWallet = owned.main_wallet;
    }
  }

  if (!sourceWallet) {
    return NextResponse.json(
      { error: { code: 400, message: "Unable to resolve source wallet" } },
      { status: 400 },
    );
  }

  let destinationWallet: WalletSummary | null = null;
  if (toWalletAddressInput) {
    destinationWallet = await resolveWalletByAddress(toWalletAddressInput, db);
  } else if (toAgentId) {
    destinationWallet = await resolveAgentWallet(toAgentId, db);
  }

  if (!destinationWallet) {
    return NextResponse.json(
      { error: { code: 404, message: "Destination wallet not found" } },
      { status: 404 },
    );
  }

  if (sourceWallet.wallet_address === destinationWallet.wallet_address) {
    return NextResponse.json(
      { error: { code: 400, message: "Source and destination wallets must be different" } },
      { status: 400 },
    );
  }

  try {
    const transferResult = await executeWalletTransfer(
      {
        from_wallet_address: sourceWallet.wallet_address,
        to_wallet_address: destinationWallet.wallet_address,
        amount_decimal: normalizedAmount.decimal,
        memo,
        initiated_by_account_id: context.account_id ?? null,
        initiated_by_agent_id: context.agent_id ?? null,
      },
      db,
    );

    const [fromWalletAfter, toWalletAfter] = await Promise.all([
      resolveWalletByAddress(sourceWallet.wallet_address, db),
      resolveWalletByAddress(destinationWallet.wallet_address, db),
    ]);

    return NextResponse.json(
      {
        transfer: transferResult.transfer,
        source_wallet: fromWalletAfter ? summarizeWallet(fromWalletAfter) : summarizeWallet(sourceWallet),
        destination_wallet: toWalletAfter
          ? summarizeWallet(toWalletAfter)
          : summarizeWallet(destinationWallet),
        amount: {
          numeric: normalizedAmount.amount,
          decimal: normalizedAmount.decimal,
          formatted: formatCreditAmount(parseCreditAmount(normalizedAmount.decimal)),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WalletTransferError) {
      return NextResponse.json(
        { error: { code: error.status, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 500,
          message: error instanceof Error ? error.message : "Transfer failed",
        },
      },
      { status: 500 },
    );
  }
}
