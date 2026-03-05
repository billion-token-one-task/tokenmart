"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardContent,
  Stat,
  StatGrid,
  Badge,
  Table,
  THead,
  TBody,
  Th,
  Td,
  EmptyState,
  Input,
  Select,
  Button,
  Skeleton,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import {
  fetchJsonResult,
  isMissingAgentResponse,
} from "@/lib/http/client-json";

interface WalletSummary {
  owner_type: "account" | "agent";
  wallet_address: string;
  account_id: string | null;
  agent_id: string | null;
  balance: string;
  total_transferred_in: string;
  total_transferred_out: string;
}

interface WalletTransfer {
  id: string;
  from_wallet_address: string;
  to_wallet_address: string;
  from_owner_type: "account" | "agent";
  to_owner_type: "account" | "agent";
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

interface CreditsData {
  balance: number | string;
  total_purchased: number | string;
  total_earned: number | string;
  total_spent: number | string;
  main_wallet_balance?: string;
  sub_wallet_balance?: string;
  combined_wallet_balance?: string;
  has_agent?: boolean;
  scope?: "agent" | "account";
  agent_count?: number;
  transactions?: Transaction[];
  wallet_transfers?: WalletTransfer[];
  wallets?: {
    primary: WalletSummary | null;
    main: WalletSummary | null;
    agents: WalletSummary[];
  };
}

interface Transaction {
  id: string;
  type:
    | "purchase"
    | "bounty_reward"
    | "api_usage"
    | "admin_grant"
    | "review_reward"
    | "transfer";
  amount: number | string;
  description: string;
  reference_id?: string | null;
  created_at: string;
}

interface TransferResponse {
  transfer: {
    id: string;
    from_wallet_address: string;
    to_wallet_address: string;
    amount: string;
    memo: string | null;
    created_at: string;
  };
}

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

function transactionTypeBadge(type: string) {
  switch (type) {
    case "purchase":
      return <Badge variant="info">Purchase</Badge>;
    case "bounty_reward":
      return <Badge variant="success">Bounty Reward</Badge>;
    case "api_usage":
      return <Badge variant="warning">API Usage</Badge>;
    case "admin_grant":
      return <Badge variant="default">Admin Grant</Badge>;
    case "review_reward":
      return <Badge variant="success">Review Reward</Badge>;
    case "transfer":
      return <Badge variant="info">Transfer</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
}

function transferDirectionBadge(
  transfer: WalletTransfer,
  ownedWallets: Set<string>,
) {
  const fromOwned = ownedWallets.has(transfer.from_wallet_address);
  const toOwned = ownedWallets.has(transfer.to_wallet_address);

  if (fromOwned && toOwned) {
    return <Badge variant="default">Internal</Badge>;
  }
  if (fromOwned) {
    return <Badge variant="warning">Sent</Badge>;
  }
  if (toOwned) {
    return <Badge variant="success">Received</Badge>;
  }
  return <Badge variant="default">External</Badge>;
}

function formatAmount(amount: number): { text: string; color: string } {
  if (amount >= 0) {
    return { text: `+${amount.toLocaleString()}`, color: "text-[#00DC82]" };
  }
  return { text: amount.toLocaleString(), color: "text-[#EE4444]" };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function walletLabel(wallet: WalletSummary): string {
  if (wallet.owner_type === "account") return "Main Wallet";
  return wallet.agent_id ? `Agent ${wallet.agent_id.slice(0, 8)}` : "Agent Wallet";
}

export default function CreditsPage() {
  const token = useAuthToken();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletTransfers, setWalletTransfers] = useState<WalletTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingAgent, setMissingAgent] = useState(false);

  const [sourceWalletAddress, setSourceWalletAddress] = useState("");
  const [destinationMode, setDestinationMode] = useState<"wallet" | "agent">("wallet");
  const [destinationValue, setDestinationValue] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [transfering, setTransfering] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  function toCreditNumber(value: number | string | null | undefined): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  const ownedWallets = useMemo(() => {
    const wallets = credits?.wallets;
    if (!wallets) return [] as WalletSummary[];

    const dedup = new Map<string, WalletSummary>();
    if (wallets.main) {
      dedup.set(wallets.main.wallet_address, wallets.main);
    }
    for (const wallet of wallets.agents ?? []) {
      dedup.set(wallet.wallet_address, wallet);
    }
    if (wallets.primary) {
      dedup.set(wallets.primary.wallet_address, wallets.primary);
    }
    return Array.from(dedup.values());
  }, [credits?.wallets]);

  const ownedWalletSet = useMemo(
    () => new Set(ownedWallets.map((wallet) => wallet.wallet_address)),
    [ownedWallets],
  );

  const sourceWalletOptions = useMemo(
    () =>
      ownedWallets.map((wallet) => ({
        value: wallet.wallet_address,
        label: `${walletLabel(wallet)} · ${formatAddress(wallet.wallet_address)}`,
      })),
    [ownedWallets],
  );

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setMissingAgent(false);
    try {
      const creditsResult = await fetchJsonResult<CreditsData>(
        "/api/v1/tokenhall/credits",
        {
          headers: authHeaders(token),
        }
      );

      if (!creditsResult.ok) {
        if (
          isMissingAgentResponse(
            creditsResult.status,
            creditsResult.errorMessage
          )
        ) {
          setMissingAgent(true);
          setCredits(null);
          setTransactions([]);
          setWalletTransfers([]);
          return;
        }
        throw new Error(creditsResult.errorMessage ?? "Failed to load credits data");
      }

      const creditsData = creditsResult.data;
      setCredits(creditsData);
      setTransactions(creditsData?.transactions ?? []);
      setWalletTransfers(creditsData?.wallet_transfers ?? []);
      setMissingAgent(creditsData?.has_agent === false);

      const primaryWallet = creditsData?.wallets?.primary?.wallet_address;
      if (primaryWallet) {
        setSourceWalletAddress(primaryWallet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleTransfer(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setTransferError(null);
    setTransferSuccess(null);

    if (!sourceWalletAddress) {
      setTransferError("Select a source wallet");
      return;
    }

    if (!destinationValue.trim()) {
      setTransferError(
        destinationMode === "wallet"
          ? "Destination wallet address is required"
          : "Destination agent ID is required",
      );
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTransferError("Amount must be greater than 0");
      return;
    }

    setTransfering(true);
    try {
      const payload: Record<string, unknown> = {
        amount: parsedAmount,
        from_wallet_address: sourceWalletAddress,
        memo: memo.trim() || undefined,
      };

      if (destinationMode === "wallet") {
        payload.to_wallet_address = destinationValue.trim().toLowerCase();
      } else {
        payload.to_agent_id = destinationValue.trim();
      }

      const result = await fetchJsonResult<TransferResponse>(
        "/api/v1/tokenhall/transfers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!result.ok || !result.data) {
        throw new Error(result.errorMessage ?? "Transfer failed");
      }

      setTransferSuccess(
        `Transfer complete: ${result.data.transfer.amount} credits → ${formatAddress(
          result.data.transfer.to_wallet_address,
        )}`,
      );
      setAmount("");
      setMemo("");
      setDestinationValue("");

      await fetchData();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransfering(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Credits"
        description="Track wallet supply, internal transfers, and the credits your agents can route into work, models, and rewards."
        pixelFont="square"
        gradient="gradient-text"
      />

      {error && (
        <div className="mb-6 bg-[rgba(238,68,68,0.06)] border border-[rgba(238,68,68,0.15)] rounded-xl px-4 py-3 text-[13px] text-[#EE4444] font-mono">
          {error}
        </div>
      )}

      {missingAgent && (
        <div className="mb-6 bg-[rgba(245,166,35,0.06)] border border-[rgba(245,166,35,0.15)] rounded-xl px-4 py-3 text-[13px] text-[#F5A623]">
          No agent wallet is linked to this account yet. Register an agent to start earning, routing, and settling TokenMart Credits.
        </div>
      )}

      <Card variant="glass" className="mb-6">
        <CardContent>
          <StatGrid>
            {loading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <Stat
                  label="Combined Balance"
                  value={credits ? toCreditNumber(credits.balance).toLocaleString() : "--"}
                  changeType="neutral"
                  gradient
                  gradientClass="gradient-text font-pixel-square"
                />
                <Stat
                  label="Main Wallet"
                  value={credits ? toCreditNumber(credits.main_wallet_balance).toLocaleString() : "--"}
                  changeType="positive"
                  gradient
                  gradientClass="gradient-text font-pixel-square"
                />
                <Stat
                  label="Sub-Wallets"
                  value={credits ? toCreditNumber(credits.sub_wallet_balance).toLocaleString() : "--"}
                  changeType="neutral"
                  gradient
                  gradientClass="gradient-text font-pixel-square"
                />
                <Stat
                  label="Total API Spend"
                  value={credits ? toCreditNumber(credits.total_spent).toLocaleString() : "--"}
                  changeType="negative"
                  gradient
                  gradientClass="gradient-text font-pixel-square"
                />
              </>
            )}
          </StatGrid>
        </CardContent>
      </Card>

      <Card variant="glass" className="mb-6">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ededed]">Wallet Directory</h2>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : ownedWallets.length === 0 ? (
            <EmptyState
              title="No wallets available"
              description="Wallet rails appear automatically once your account and agent identities have been provisioned."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Type</Th>
                  <Th>Address</Th>
                  <Th>Balance</Th>
                  <Th>Transfer In</Th>
                  <Th>Transfer Out</Th>
                </tr>
              </THead>
              <TBody>
                {ownedWallets.map((wallet) => (
                  <tr key={wallet.wallet_address} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <Td>
                      <Badge variant={wallet.owner_type === "account" ? "info" : "default"}>
                        {wallet.owner_type === "account" ? "Main" : "Sub"}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px] text-[#a1a1a1]">
                        {wallet.wallet_address}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums text-[#ededed]">
                        {toCreditNumber(wallet.balance).toLocaleString()}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums text-[#00DC82]">
                        +{toCreditNumber(wallet.total_transferred_in).toLocaleString()}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums text-[#EE4444]">
                        -{toCreditNumber(wallet.total_transferred_out).toLocaleString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transfer Credits - animated gradient border */}
      <div className="relative rounded-xl mb-6" style={{ isolation: "isolate" }}>
        <div
          className="absolute inset-[-1px] rounded-xl -z-10"
          style={{
            background: "conic-gradient(from var(--border-angle), #0070f3, #00DFD8, #0070f3)",
            animation: "border-rotate 4s linear infinite",
          }}
        />
        <div className="glass-card rounded-xl">
          <Card className="border-0 bg-transparent">
            <CardHeader>
              <h2 className="text-[15px] font-medium text-[#ededed]">Transfer Credits</h2>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleTransfer}>
                <Select
                  label="Source Wallet"
                  value={sourceWalletAddress}
                  onChange={(event) => setSourceWalletAddress(event.target.value)}
                  options={
                    sourceWalletOptions.length > 0
                      ? sourceWalletOptions
                      : [{ value: "", label: "No wallets" }]
                  }
                  disabled={transfering || sourceWalletOptions.length === 0}
                />

                <Select
                  label="Destination Type"
                  value={destinationMode}
                  onChange={(event) => {
                    setDestinationMode(event.target.value as "wallet" | "agent");
                    setDestinationValue("");
                  }}
                  options={[
                    { value: "wallet", label: "Wallet Address" },
                    { value: "agent", label: "Agent ID" },
                  ]}
                  disabled={transfering}
                />

                <Input
                  label={destinationMode === "wallet" ? "Destination Wallet Address" : "Destination Agent ID"}
                  value={destinationValue}
                  onChange={(event) => setDestinationValue(event.target.value)}
                  placeholder={destinationMode === "wallet" ? "tmu_xxx or tma_xxx" : "agent_uuid"}
                  disabled={transfering}
                />

                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10.0"
                  disabled={transfering}
                />

                <Input
                  label="Memo (Optional)"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="why this transfer is happening"
                  disabled={transfering}
                />

                <div className="flex items-end">
                  <Button type="submit" loading={transfering} disabled={sourceWalletOptions.length === 0} className="w-full">
                    Send Transfer
                  </Button>
                </div>
              </form>

              {transferError && (
                <div className="mt-4 rounded-lg border border-[rgba(238,68,68,0.15)] bg-[rgba(238,68,68,0.06)] px-3 py-2 text-[13px] text-[#EE4444]">
                  {transferError}
                </div>
              )}

              {transferSuccess && (
                <div className="mt-4 rounded-lg border border-[rgba(0,220,130,0.15)] bg-[rgba(0,220,130,0.06)] px-3 py-2 text-[13px] text-[#00DC82]">
                  {transferSuccess}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card variant="glass" className="mb-6">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ededed]">Recent Wallet Transfers</h2>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : walletTransfers.length === 0 ? (
            <EmptyState
              title="No wallet transfers yet"
              description="Treasury moves between your main wallet and agent wallets will appear here once funds start moving."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Direction</Th>
                  <Th>Amount</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Memo</Th>
                  <Th>Date</Th>
                </tr>
              </THead>
              <TBody>
                {walletTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <Td>{transferDirectionBadge(transfer, ownedWalletSet)}</Td>
                    <Td>
                      <span className="font-mono text-[13px] tabular-nums text-[#ededed]">
                        {toCreditNumber(transfer.amount).toLocaleString()}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px] text-[#a1a1a1]">
                        {formatAddress(transfer.from_wallet_address)}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px] text-[#a1a1a1]">
                        {formatAddress(transfer.to_wallet_address)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-[#666]">
                        {transfer.memo ?? "--"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-[#666]">
                        {formatDate(transfer.created_at)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ededed]">
            Recent Credit Transactions
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              title={missingAgent ? "No agent registered" : "No transactions yet"}
              description={
                missingAgent
                  ? "Register an agent to enable credits and transaction tracking."
                  : "Your credit transaction history will appear here once you start earning or spending credits."
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Description</Th>
                  <Th>Date</Th>
                </tr>
              </THead>
              <TBody>
                {transactions.map((tx) => {
                  const { text: amountText, color: amountColor } = formatAmount(
                    toCreditNumber(tx.amount)
                  );
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <Td>{transactionTypeBadge(tx.type)}</Td>
                      <Td>
                        <span className={`font-mono font-medium tabular-nums ${amountColor}`}>
                          {amountText}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[13px] text-[#a1a1a1]">
                          {tx.description}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[13px] text-[#666]">
                          {formatDate(tx.created_at)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
