"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardContent,
  Stat,
  StatGrid,
  Table,
  THead,
  TBody,
  Th,
  Td,
  EmptyState,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  reference_id: string | null;
  created_at: string;
}

interface CreditsData {
  balance: string;
  total_purchased: string;
  total_earned: string;
  total_spent: string;
  transactions: Transaction[];
}

interface DailySpend {
  date: string;
  cost: number;
  calls: number;
}

export default function TokenHallUsagePage() {
  const token = useAuthToken();

  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const creditsRes = await fetch("/api/v1/tokenhall/credits", {
          headers: authHeaders(token),
        });

        if (!creditsRes.ok) throw new Error("Failed to fetch credits");

        const creditsData = await creditsRes.json();
        setCredits(creditsData);
        setTransactions(creditsData.transactions ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load usage data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  // Compute daily spending from transactions
  const dailySpend = useMemo((): DailySpend[] => {
    const days: DailySpend[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayTxns = transactions.filter(
        (t) => t.created_at.split("T")[0] === dateStr
      );
      days.push({
        date: dateStr,
        cost: dayTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
        calls: dayTxns.length,
      });
    }

    return days;
  }, [transactions]);

  // Compute stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTxns = transactions.filter(
    (t) => t.created_at.split("T")[0] === todayStr
  );
  const todayCalls = todayTxns.length;
  const todayCost = todayTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTxns = transactions.filter(
    (t) => new Date(t.created_at) >= weekAgo
  );
  const weekCost = weekTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const maxDailyCost = Math.max(...dailySpend.map((d) => d.cost), 1);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDayLabel(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  function formatCost(cost: number): string {
    if (cost === 0) return "0 cr";
    if (cost < 1) return `${cost.toFixed(4)} cr`;
    return `${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} cr`;
  }

  if (!token) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="API call history and spending"
        />
        <div className="rounded-lg grid-card px-6 py-12 text-center">
          <p className="text-gray-400">
            Please log in to view usage analytics.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="API call history and spending"
        />
        <div className="flex items-center justify-center py-20">
          <svg
            className="animate-spin h-6 w-6 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="API call history and spending"
        />
        <div className="grid-card rounded-lg border-red-900/30 px-6 py-4 text-xs text-red-400 font-mono">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Usage"
        description="API call history and spending"
      />

      {/* Stats */}
      <StatGrid className="mb-8">
        <Card>
          <CardContent>
            <Stat label="Today's Calls" value={todayCalls} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat label="Today's Cost" value={formatCost(todayCost)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat label="This Week Cost" value={formatCost(weekCost)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat
              label="Total Cost"
              value={
                credits
                  ? formatCost(parseFloat(credits.total_spent))
                  : "--"
              }
            />
          </CardContent>
        </Card>
      </StatGrid>

      {/* Spending Chart */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">
            Daily Spending
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Credits spent over the last 7 days
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-40">
            {dailySpend.map((day) => {
              const heightPercent =
                maxDailyCost > 0 ? (day.cost / maxDailyCost) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs text-gray-500">
                    {day.cost > 0 ? formatCost(day.cost) : ""}
                  </span>
                  <div className="w-full flex justify-center" style={{ height: "120px" }}>
                    <div
                      className="w-full max-w-12 rounded-t-md transition-all duration-300"
                      style={{
                        height: `${Math.max(heightPercent, day.cost > 0 ? 4 : 0)}%`,
                        backgroundColor:
                          day.cost > 0
                            ? "rgb(52, 211, 153)"
                            : "rgb(31, 41, 55)",
                        alignSelf: "flex-end",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDayLabel(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">
            Recent Transactions
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Your most recent credit transactions
          </p>
        </CardHeader>
        {transactions.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No transactions yet"
              description="Make your first API call to see transaction history here."
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
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
                {transactions.slice(0, 50).map((txn) => (
                  <tr key={txn.id}>
                    <Td>
                      <span className="font-medium text-white text-xs capitalize">
                        {txn.type}
                      </span>
                    </Td>
                    <Td>
                      <span className="tabular-nums">
                        {formatCost(Math.abs(parseFloat(txn.amount)))}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-gray-300 text-xs">
                        {txn.description || "--"}
                      </span>
                    </Td>
                    <Td>{formatDate(txn.created_at)}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
