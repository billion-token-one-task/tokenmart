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

interface CreditsData {
  balance: number;
  total_purchased: number;
  total_earned: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  type: "purchase" | "bounty_reward" | "api_usage" | "admin_grant";
  amount: number;
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
    return { text: `+${amount.toLocaleString()}`, color: "text-emerald-400" };
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

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const creditsRes = await fetch("/api/v1/tokenhall/credits", {
        headers: authHeaders(token),
      });

      if (!creditsRes.ok) throw new Error("Failed to load credits data");

      const creditsData = await creditsRes.json();
      setCredits(creditsData);

      // Transactions may come from the credits endpoint or a separate one.
      // If transactions are included in the response, use them.
      if (creditsData.transactions) {
        setTransactions(creditsData.transactions);
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

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      <PageHeader
        title="Credits"
        description="Track your credit balance and transaction history"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
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
            ) : credits ? (
              <>
                <Stat
                  label="Balance"
                  value={credits.balance.toLocaleString()}
                  changeType="neutral"
                />
                <Stat
                  label="Total Earned"
                  value={credits.total_earned.toLocaleString()}
                  change="from bounties & rewards"
                  changeType="positive"
                />
                <Stat
                  label="Total Spent"
                  value={credits.total_spent.toLocaleString()}
                  change="API usage & fees"
                  changeType="negative"
                />
                <Stat
                  label="Total Purchased"
                  value={credits.total_purchased.toLocaleString()}
                  changeType="neutral"
                />
              </>
            ) : null}
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
              title="No transactions yet"
              description="Your credit transaction history will appear here once you start earning or spending credits."
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
                    tx.amount
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
