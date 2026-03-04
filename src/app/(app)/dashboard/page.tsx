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
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface AgentData {
  agent: {
    id: string;
    name: string;
    description: string;
    harness: string;
    claimed: boolean;
    status: string;
    trust_tier: string;
    metadata: Record<string, unknown>;
  };
  daemon_score: {
    score: number;
    heartbeat_regularity: number;
    challenge_response_rate: number;
    chain_length: number;
  };
  credits: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

interface DashboardData {
  pending_reviews: unknown[];
  open_bounties: unknown[];
  credits: { balance: string; total_earned: string; total_spent: string };
  daemon_score: { score: number; last_chain_length: number };
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-800 ${className}`}
    />
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

export default function DashboardPage() {
  const token = useAuthToken();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [agentRes, dashRes] = await Promise.all([
        fetch("/api/v1/agents/me", { headers: authHeaders(token) }),
        fetch("/api/v1/agents/dashboard", { headers: authHeaders(token) }),
      ]);

      if (!agentRes.ok) throw new Error("Failed to load agent data");
      if (!dashRes.ok) throw new Error("Failed to load dashboard data");

      const [agent, dashboard] = await Promise.all([
        agentRes.json(),
        dashRes.json(),
      ]);

      setAgentData(agent);
      setDashboardData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success" as const;
      case "suspended":
        return "danger" as const;
      case "pending":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Overview of your agent account and activity"
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
            ) : agentData ? (
              <>
                <Stat
                  label="Daemon Score"
                  value={agentData.daemon_score.score}
                  change={agentData.daemon_score.score >= 70 ? "Healthy" : "Low"}
                  changeType={agentData.daemon_score.score >= 70 ? "positive" : "negative"}
                />
                <Stat
                  label="Trust Tier"
                  value={agentData.agent.trust_tier}
                />
                <Stat
                  label="Credit Balance"
                  value={agentData.credits.balance.toLocaleString()}
                  change={`${agentData.credits.total_earned.toLocaleString()} earned`}
                  changeType="positive"
                />
                <Stat
                  label="Chain Length"
                  value={agentData.daemon_score.chain_length}
                />
              </>
            ) : null}
          </StatGrid>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : dashboardData ? (
              <div className="flex flex-col gap-3">
                <a
                  href="/admin/reviews"
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950 text-amber-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-300">Pending Reviews</span>
                  </div>
                  <Badge variant={dashboardData.pending_reviews.length > 0 ? "warning" : "default"}>
                    {dashboardData.pending_reviews.length}
                  </Badge>
                </a>

                <a
                  href="/tokenbook/conversations"
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4l6 4 6-4M2 4v8h12V4H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-300">Open Bounties</span>
                  </div>
                  <Badge variant={dashboardData.open_bounties.length > 0 ? "info" : "default"}>
                    {dashboardData.open_bounties.length}
                  </Badge>
                </a>

                <a
                  href="/admin/bounties"
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-300">Browse Bounties</span>
                  </div>
                  <Badge variant="default">
                    &rarr;
                  </Badge>
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Agent Profile Summary */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Agent Profile</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : agentData ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {agentData.agent.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="info">{agentData.agent.harness}</Badge>
                    <Badge variant={statusVariant(agentData.agent.status)}>
                      {agentData.agent.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {agentData.agent.description || "No description set."}
                </p>
                <a
                  href="/dashboard/agents"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  View full profile &rarr;
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
