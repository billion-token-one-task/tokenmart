import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type RpcClient = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{
  data: unknown;
  error: { message?: string } | null;
}>;

export type WalletOwnerType = "account" | "agent";

export interface WalletSummary {
  owner_type: WalletOwnerType;
  wallet_address: string;
  account_id: string | null;
  agent_id: string | null;
  balance: string;
  total_transferred_in: string;
  total_transferred_out: string;
}

export interface WalletTransfer {
  id: string;
  from_wallet_address: string;
  to_wallet_address: string;
  from_owner_type: WalletOwnerType;
  to_owner_type: WalletOwnerType;
  from_account_id: string | null;
  to_account_id: string | null;
  from_agent_id: string | null;
  to_agent_id: string | null;
  amount: string;
  memo: string | null;
  initiated_by_type: "account" | "agent" | "system";
  initiated_by_account_id: string | null;
  initiated_by_agent_id: string | null;
  created_at: string;
}

export class WalletTransferError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

export function parseCreditAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatCreditAmount(value: number): string {
  return Number.isFinite(value) ? value.toFixed(8) : "0.00000000";
}

function generateWalletAddress(prefix: "tmu" | "tma"): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function normalizeWalletAddress(walletAddress: string): string {
  return walletAddress.trim().toLowerCase();
}

export function normalizeTransferAmount(raw: unknown): {
  ok: true;
  amount: number;
  decimal: string;
} | {
  ok: false;
  message: string;
} {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      return { ok: false, message: "amount is required" };
    }
    if (!/^\d+(\.\d{1,8})?$/.test(value)) {
      return {
        ok: false,
        message: "amount must be a positive decimal with at most 8 decimal places",
      };
    }
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, message: "amount must be greater than 0" };
    }
    return { ok: true, amount, decimal: amount.toFixed(8) };
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) {
      return { ok: false, message: "amount must be greater than 0" };
    }
    const decimal = raw.toFixed(8);
    const normalized = Number.parseFloat(decimal);
    if (Math.abs(raw - normalized) > 1e-10) {
      return {
        ok: false,
        message: "amount precision exceeds 8 decimal places",
      };
    }
    return { ok: true, amount: normalized, decimal };
  }

  return { ok: false, message: "amount must be a number" };
}

function asWalletSummaryFromCreditRow(row: {
  wallet_address: string;
  account_id: string | null;
  agent_id: string;
  balance: string;
  total_transferred_in: string | null;
  total_transferred_out: string | null;
}): WalletSummary {
  return {
    owner_type: "agent",
    wallet_address: normalizeWalletAddress(row.wallet_address),
    account_id: row.account_id,
    agent_id: row.agent_id,
    balance: formatCreditAmount(parseCreditAmount(row.balance)),
    total_transferred_in: formatCreditAmount(parseCreditAmount(row.total_transferred_in)),
    total_transferred_out: formatCreditAmount(parseCreditAmount(row.total_transferred_out)),
  };
}

function asWalletSummaryFromAccountRow(row: {
  wallet_address: string;
  account_id: string;
  balance: string;
  total_transferred_in: string | null;
  total_transferred_out: string | null;
}): WalletSummary {
  return {
    owner_type: "account",
    wallet_address: normalizeWalletAddress(row.wallet_address),
    account_id: row.account_id,
    agent_id: null,
    balance: formatCreditAmount(parseCreditAmount(row.balance)),
    total_transferred_in: formatCreditAmount(parseCreditAmount(row.total_transferred_in)),
    total_transferred_out: formatCreditAmount(parseCreditAmount(row.total_transferred_out)),
  };
}

export async function ensureAccountWallet(
  accountId: string,
  db: AdminClient = createAdminClient(),
): Promise<WalletSummary> {
  const rpcClient = db.rpc.bind(db) as unknown as RpcClient;
  // Preferred atomic helper path.
  const rpcResult = await rpcClient("ensure_account_credit_wallet", {
    p_account_id: accountId,
  });

  if (!rpcResult.error && rpcResult.data) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return asWalletSummaryFromAccountRow(row);
  }

  const existing = await db
    .from("account_credit_wallets")
    .select("account_id, wallet_address, balance, total_transferred_in, total_transferred_out")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return asWalletSummaryFromAccountRow(existing.data);
  }

  for (let i = 0; i < 6; i += 1) {
    const walletAddress = generateWalletAddress("tmu");
    const insert = await db
      .from("account_credit_wallets")
      .insert({
        account_id: accountId,
        wallet_address: walletAddress,
        balance: "0.00000000",
        total_transferred_in: "0.00000000",
        total_transferred_out: "0.00000000",
      })
      .select("account_id, wallet_address, balance, total_transferred_in, total_transferred_out")
      .single();

    if (!insert.error && insert.data) {
      return asWalletSummaryFromAccountRow(insert.data);
    }

    const raceExisting = await db
      .from("account_credit_wallets")
      .select("account_id, wallet_address, balance, total_transferred_in, total_transferred_out")
      .eq("account_id", accountId)
      .maybeSingle();

    if (!raceExisting.error && raceExisting.data) {
      return asWalletSummaryFromAccountRow(raceExisting.data);
    }
  }

  throw new Error("Failed to ensure account wallet");
}

export async function ensureAgentWallet(
  agentId: string,
  accountId: string | null = null,
  db: AdminClient = createAdminClient(),
): Promise<WalletSummary> {
  const rpcClient = db.rpc.bind(db) as unknown as RpcClient;
  const rpcResult = await rpcClient("ensure_agent_credit_wallet", {
    p_agent_id: agentId,
    p_account_id: accountId,
  });

  if (!rpcResult.error && rpcResult.data) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return asWalletSummaryFromCreditRow(row);
  }

  const existing = await db
    .from("credits")
    .select(
      "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
    )
    .eq("agent_id", agentId)
    .maybeSingle();

  if (!existing.error && existing.data?.wallet_address) {
    if (accountId && existing.data.account_id !== accountId) {
      const updated = await db
        .from("credits")
        .update({ account_id: accountId, updated_at: new Date().toISOString() })
        .eq("agent_id", agentId)
        .select(
          "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
        )
        .single();

      if (!updated.error && updated.data) {
        return asWalletSummaryFromCreditRow(updated.data);
      }
    }

    return asWalletSummaryFromCreditRow(existing.data);
  }

  for (let i = 0; i < 6; i += 1) {
    const walletAddress = generateWalletAddress("tma");
    const insert = await db
      .from("credits")
      .insert({
        agent_id: agentId,
        account_id: accountId,
        wallet_address: walletAddress,
        balance: "0.00000000",
        total_purchased: "0.00000000",
        total_earned: "0.00000000",
        total_spent: "0.00000000",
        total_transferred_in: "0.00000000",
        total_transferred_out: "0.00000000",
      })
      .select(
        "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
      )
      .single();

    if (!insert.error && insert.data) {
      return asWalletSummaryFromCreditRow(insert.data);
    }

    const raceExisting = await db
      .from("credits")
      .select(
        "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
      )
      .eq("agent_id", agentId)
      .maybeSingle();

    if (!raceExisting.error && raceExisting.data?.wallet_address) {
      return asWalletSummaryFromCreditRow(raceExisting.data);
    }
  }

  throw new Error("Failed to ensure agent wallet");
}

export async function resolveWalletByAddress(
  walletAddress: string,
  db: AdminClient = createAdminClient(),
): Promise<WalletSummary | null> {
  const normalized = normalizeWalletAddress(walletAddress);

  const [agentWallet, accountWallet] = await Promise.all([
    db
      .from("credits")
      .select(
        "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
      )
      .eq("wallet_address", normalized)
      .maybeSingle(),
    db
      .from("account_credit_wallets")
      .select("account_id, wallet_address, balance, total_transferred_in, total_transferred_out")
      .eq("wallet_address", normalized)
      .maybeSingle(),
  ]);

  if (!agentWallet.error && agentWallet.data) {
    return asWalletSummaryFromCreditRow(agentWallet.data);
  }

  if (!accountWallet.error && accountWallet.data) {
    return asWalletSummaryFromAccountRow(accountWallet.data);
  }

  return null;
}

export async function getOwnedWalletAddresses(
  accountId: string,
  db: AdminClient = createAdminClient(),
): Promise<{
  main_wallet: WalletSummary;
  agent_wallets: WalletSummary[];
  wallet_addresses: string[];
}> {
  const mainWallet = await ensureAccountWallet(accountId, db);

  const { data: accountAgentRows } = await db
    .from("agents")
    .select("id")
    .eq("owner_account_id", accountId);

  const agentIds = (accountAgentRows ?? []).map((row) => row.id);
  if (agentIds.length === 0) {
    return {
      main_wallet: mainWallet,
      agent_wallets: [],
      wallet_addresses: [mainWallet.wallet_address],
    };
  }

  const { data: creditRows } = await db
    .from("credits")
    .select(
      "agent_id, account_id, wallet_address, balance, total_transferred_in, total_transferred_out",
    )
    .in("agent_id", agentIds);

  const walletsByAgent = new Map<string, WalletSummary>();
  for (const row of creditRows ?? []) {
    if (!row.wallet_address) continue;
    walletsByAgent.set(row.agent_id, asWalletSummaryFromCreditRow(row));
  }

  for (const agentId of agentIds) {
    if (!walletsByAgent.has(agentId)) {
      const ensured = await ensureAgentWallet(agentId, accountId, db);
      walletsByAgent.set(agentId, ensured);
    }
  }

  const agentWallets = Array.from(walletsByAgent.values()).sort((a, b) =>
    (a.agent_id ?? "").localeCompare(b.agent_id ?? ""),
  );

  const walletAddresses = [
    mainWallet.wallet_address,
    ...agentWallets.map((wallet) => wallet.wallet_address),
  ];

  return {
    main_wallet: mainWallet,
    agent_wallets: agentWallets,
    wallet_addresses: walletAddresses,
  };
}

function transferErrorFromMessage(message: string): WalletTransferError {
  const normalized = message.toLowerCase();

  const knownCode = [
    "from_wallet_address_required",
    "to_wallet_address_required",
    "self_transfer_not_allowed",
    "invalid_amount",
    "amount_precision_exceeded",
    "from_wallet_not_found",
    "to_wallet_not_found",
    "insufficient_balance",
  ].find((code) => normalized.includes(code));

  switch (knownCode) {
    case "from_wallet_not_found":
    case "to_wallet_not_found":
      return new WalletTransferError(knownCode, 404, knownCode);
    case "insufficient_balance":
      return new WalletTransferError(knownCode, 400, knownCode);
    case "from_wallet_address_required":
    case "to_wallet_address_required":
    case "self_transfer_not_allowed":
    case "invalid_amount":
    case "amount_precision_exceeded":
      return new WalletTransferError(knownCode, 400, knownCode);
    default:
      return new WalletTransferError("transfer_failed", 500, message);
  }
}

export async function executeWalletTransfer(
  params: {
    from_wallet_address: string;
    to_wallet_address: string;
    amount_decimal: string;
    memo?: string | null;
    initiated_by_account_id?: string | null;
    initiated_by_agent_id?: string | null;
  },
  db: AdminClient = createAdminClient(),
): Promise<{
  transfer: {
    id: string;
    from_wallet_address: string;
    to_wallet_address: string;
    amount: string;
    memo: string | null;
    from_owner_type: WalletOwnerType;
    to_owner_type: WalletOwnerType;
    from_account_id: string | null;
    to_account_id: string | null;
    from_agent_id: string | null;
    to_agent_id: string | null;
    from_balance_after: string;
    to_balance_after: string;
    created_at: string;
  };
}> {
  const rpcClient = db.rpc.bind(db) as unknown as RpcClient;
  const rpc = await rpcClient("transfer_wallet_credits", {
    p_from_wallet_address: normalizeWalletAddress(params.from_wallet_address),
    p_to_wallet_address: normalizeWalletAddress(params.to_wallet_address),
    p_amount: params.amount_decimal,
    p_memo: params.memo ?? null,
    p_initiated_by_account_id: params.initiated_by_account_id ?? null,
    p_initiated_by_agent_id: params.initiated_by_agent_id ?? null,
  });

  if (rpc.error) {
    throw transferErrorFromMessage(rpc.error.message ?? "transfer_failed");
  }

  const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
  if (!row) {
    throw new WalletTransferError("transfer_failed", 500, "No transfer result returned");
  }

  return {
    transfer: {
      id: row.transfer_id,
      from_wallet_address: normalizeWalletAddress(row.from_wallet_address),
      to_wallet_address: normalizeWalletAddress(row.to_wallet_address),
      amount: formatCreditAmount(parseCreditAmount(row.amount)),
      memo: row.memo ?? null,
      from_owner_type: row.from_owner_type,
      to_owner_type: row.to_owner_type,
      from_account_id: row.from_account_id ?? null,
      to_account_id: row.to_account_id ?? null,
      from_agent_id: row.from_agent_id ?? null,
      to_agent_id: row.to_agent_id ?? null,
      from_balance_after: formatCreditAmount(parseCreditAmount(row.from_balance_after)),
      to_balance_after: formatCreditAmount(parseCreditAmount(row.to_balance_after)),
      created_at: row.created_at,
    },
  };
}

export async function listRecentTransfersForWallets(
  walletAddresses: string[],
  limit = 50,
  db: AdminClient = createAdminClient(),
): Promise<WalletTransfer[]> {
  const normalizedAddresses = Array.from(
    new Set(
      walletAddresses
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (normalizedAddresses.length === 0) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const [outgoing, incoming] = await Promise.all([
    db
      .from("wallet_transfers")
      .select(
        "id, from_wallet_address, to_wallet_address, from_owner_type, to_owner_type, from_account_id, to_account_id, from_agent_id, to_agent_id, amount, memo, initiated_by_type, initiated_by_account_id, initiated_by_agent_id, created_at",
      )
      .in("from_wallet_address", normalizedAddresses)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    db
      .from("wallet_transfers")
      .select(
        "id, from_wallet_address, to_wallet_address, from_owner_type, to_owner_type, from_account_id, to_account_id, from_agent_id, to_agent_id, amount, memo, initiated_by_type, initiated_by_account_id, initiated_by_agent_id, created_at",
      )
      .in("to_wallet_address", normalizedAddresses)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
  ]);

  const merged = new Map<string, WalletTransfer>();
  for (const row of [...(outgoing.data ?? []), ...(incoming.data ?? [])]) {
    merged.set(row.id, {
      id: row.id,
      from_wallet_address: normalizeWalletAddress(row.from_wallet_address),
      to_wallet_address: normalizeWalletAddress(row.to_wallet_address),
      from_owner_type: row.from_owner_type,
      to_owner_type: row.to_owner_type,
      from_account_id: row.from_account_id ?? null,
      to_account_id: row.to_account_id ?? null,
      from_agent_id: row.from_agent_id ?? null,
      to_agent_id: row.to_agent_id ?? null,
      amount: formatCreditAmount(parseCreditAmount(row.amount)),
      memo: row.memo ?? null,
      initiated_by_type: row.initiated_by_type,
      initiated_by_account_id: row.initiated_by_account_id ?? null,
      initiated_by_agent_id: row.initiated_by_agent_id ?? null,
      created_at: row.created_at,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, safeLimit);
}
