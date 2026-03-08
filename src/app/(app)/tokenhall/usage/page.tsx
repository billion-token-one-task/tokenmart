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
  InlineNotice,
  Skeleton,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import {
  fetchJsonResult,
  isMissingAgentResponse,
} from "@/lib/http/client-json";

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
  has_agent?: boolean;
  scope?: "agent" | "account";
  agent_count?: number;
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
  const [missingAgent, setMissingAgent] = useState(false);

  const usageTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.type === "api_usage"),
    [transactions],
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchData() {
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
          throw new Error(creditsResult.errorMessage ?? "Failed to fetch credits");
        }

        const creditsData = creditsResult.data;
        setCredits(creditsData);
        setTransactions(creditsData?.transactions ?? []);
        setMissingAgent(creditsData?.has_agent === false);
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

      const dayTxns = usageTransactions.filter(
        (t) => t.created_at.split("T")[0] === dateStr
      );
      days.push({
        date: dateStr,
        cost: dayTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
        calls: dayTxns.length,
      });
    }

    return days;
  }, [usageTransactions]);

  // Compute stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTxns = usageTransactions.filter(
    (t) => t.created_at.split("T")[0] === todayStr
  );
  const todayCalls = todayTxns.length;
  const todayCost = todayTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTxns = usageTransactions.filter(
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
          description="Audit call volume, routed spend, and credit burn across TokenHall exchange traffic."
        />
        <Card>
          <CardContent>
            <p className="text-[#666] text-[13px] text-center py-8">
              Please log in to view usage analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="Audit call volume, routed spend, and credit burn across TokenHall exchange traffic."
        />
        <StatGrid className="mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </StatGrid>
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="Audit call volume, routed spend, and credit burn across TokenHall exchange traffic."
        />
        <InlineNotice tone="error" title="Usage Fault" message={error} />
      </div>
    );
  }

  if (missingAgent) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="Audit call volume, routed spend, and credit burn across TokenHall exchange traffic."
        />
        <Card>
          <CardContent>
            <p className="py-2 text-[13px] leading-6 text-[#4a4036]">
              This account does not have an agent yet, so there is no usage data to
              display. Register an agent to start tracking API calls and spend.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Audit call volume, routed spend, and credit burn across TokenHall exchange traffic."
      />

      {/* Stats */}
      <StatGrid className="mb-8">
        <Card variant="glass">
          <CardContent>
            <Stat label="Today's Calls" value={todayCalls} />
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <Stat label="Today's Cost" value={formatCost(todayCost)} />
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <Stat label="This Week Cost" value={formatCost(weekCost)} />
          </CardContent>
        </Card>
        <Card variant="glass">
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
      <Card variant="glass" className="mb-8">
        <CardHeader>
          <h2 className="font-display text-[1.1rem] uppercase leading-none text-[#0a0a0a]">
            Daily spending
          </h2>
          <p className="mt-1 text-[13px] text-[#4a4036]">
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
                  <span className="font-mono text-[12px] tabular-nums text-[#8a7a68]">
                    {day.cost > 0 ? formatCost(day.cost) : ""}
                  </span>
                  <div className="w-full flex justify-center" style={{ height: "120px" }}>
                    <div
                      className="w-full max-w-12 rounded-t-md transition-all duration-300"
                      style={{
                        height: `${Math.max(heightPercent, day.cost > 0 ? 4 : 0)}%`,
                        backgroundColor:
                          day.cost > 0
                            ? "#e5005a"
                            : "rgba(229,0,90,0.08)",
                        alignSelf: "flex-end",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[12px] text-[#8a7a68]">
                    {formatDayLabel(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions Table */}
      <Card variant="glass">
        <CardHeader>
          <h2 className="font-display text-[1.1rem] uppercase leading-none text-[#0a0a0a]">
            Recent transactions
          </h2>
          <p className="mt-1 text-[13px] text-[#4a4036]">
            Your most recent credit transactions
          </p>
        </CardHeader>
        {transactions.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No transactions yet"
              description="Send the first routed request to generate a ledger of spend, usage, and settlement."
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
                      <span className="font-medium text-[#0a0a0a] text-[13px] capitalize">
                        {txn.type}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums text-[13px]">
                        {formatCost(Math.abs(parseFloat(txn.amount)))}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[#4a4036] text-[13px]">
                        {txn.description || "--"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums text-[13px]">
                        {formatDate(txn.created_at)}
                      </span>
                    </Td>
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
