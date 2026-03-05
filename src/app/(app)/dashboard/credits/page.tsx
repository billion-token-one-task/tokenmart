"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import {
  fetchJsonResult,
  isMissingAgentResponse,
} from "@/lib/http/client-json";

interface CreditsData {
  balance: number | string;
  total_purchased: number | string;
  total_earned: number | string;
  total_spent: number | string;
  has_agent?: boolean;
  scope?: "agent" | "account";
  agent_count?: number;
  transactions?: Transaction[];
}

interface Transaction {
  id: string;
  type: "purchase" | "bounty_reward" | "api_usage" | "admin_grant";
  amount: number | string;
  description: string;
  created_at: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
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
    default:
      return <Badge variant="default">{type}</Badge>;
  }
}

function formatAmount(amount: number): { text: string; color: string } {
  if (amount >= 0) {
    return { text: `+${amount.toLocaleString()}`, color: "text-grid-green" };
  }
  return { text: amount.toLocaleString(), color: "text-red-400" };
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

export default function CreditsPage() {
  const token = useAuthToken();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingAgent, setMissingAgent] = useState(false);

  function toCreditNumber(value: number | string | null | undefined): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

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
          return;
        }
        throw new Error(creditsResult.errorMessage ?? "Failed to load credits data");
      }

      const creditsData = creditsResult.data;
      setCredits(creditsData);
      setTransactions(creditsData?.transactions ?? []);
      setMissingAgent(creditsData?.has_agent === false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Credits"
        description="Track your credit balance and transaction history"
      />

      {error && (
        <div className="mb-6 grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {missingAgent && (
        <div className="mb-6 grid-card rounded-lg border-grid-orange/30 px-4 py-3 text-xs text-grid-orange/90">
          No agent is linked to this account yet. Register an agent to start
          earning and spending credits.
        </div>
      )}

      {/* Stats Grid */}
      <Card className="mb-6">
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
                  label="Balance"
                  value={credits ? toCreditNumber(credits.balance).toLocaleString() : "--"}
                  changeType="neutral"
                />
                <Stat
                  label="Total Earned"
                  value={credits ? toCreditNumber(credits.total_earned).toLocaleString() : "--"}
                  change={credits ? "from bounties & rewards" : ""}
                  changeType="positive"
                />
                <Stat
                  label="Total Spent"
                  value={credits ? toCreditNumber(credits.total_spent).toLocaleString() : "--"}
                  change={credits ? "API usage & fees" : ""}
                  changeType="negative"
                />
                <Stat
                  label="Total Purchased"
                  value={credits ? toCreditNumber(credits.total_purchased).toLocaleString() : "--"}
                  changeType="neutral"
                />
              </>
            )}
          </StatGrid>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-white">
            Recent Transactions
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
                      className="hover:bg-gray-900/30 transition-colors"
                    >
                      <Td>{transactionTypeBadge(tx.type)}</Td>
                      <Td>
                        <span className={`font-mono font-medium ${amountColor}`}>
                          {amountText}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-gray-400">
                          {tx.description}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-gray-500">
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
