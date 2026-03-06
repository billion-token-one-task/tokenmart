"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  Stat,
  StatGrid,
  Badge,
  Skeleton,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";

interface AdminStats {
  totalTasks: number;
  openBounties: number;
  pendingReviews: number;
  activeClaims: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  credit_reward: number;
  created_at: string;
}

interface Bounty {
  id: string;
  title: string;
  type: string;
  status: string;
  credit_reward: number;
  created_at: string;
}

interface Review {
  id: string;
  bounty_claim_id: string;
  status: string;
  reward_credits: number;
}

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export default function AdminPage() {
  const token = useAuthToken();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentBounties, setRecentBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const [tasksResult, bountiesResult, reviewsResult] = await Promise.all([
        fetchJsonResult<{ tasks?: Task[] }>("/api/v1/admin/tasks", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ bounties?: Bounty[] }>("/api/v1/admin/bounties", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ reviews?: Review[] }>("/api/v1/admin/reviews/pending", {
          headers: authHeaders(token),
        }),
      ]);

      const tasks: Task[] = tasksResult.data?.tasks ?? [];
      const bounties: Bounty[] = bountiesResult.data?.bounties ?? [];
      const reviews: Review[] = reviewsResult.data?.reviews ?? [];

      setStats({
        totalTasks: tasks.length,
        openBounties: bounties.filter((b) => b.status === "open").length,
        pendingReviews: reviews.length,
        activeClaims: bounties.filter((b) => b.status === "claimed").length,
      });

      setRecentTasks(
        tasks
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5)
      );

      setRecentBounties(
        bounties
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5)
      );

      const warnings: string[] = [];
      if (!tasksResult.ok) {
        warnings.push(tasksResult.errorMessage ?? "Failed to load tasks");
      }
      if (!bountiesResult.ok) {
        warnings.push(bountiesResult.errorMessage ?? "Failed to load bounties");
      }
      if (!reviewsResult.ok) {
        warnings.push(
          reviewsResult.errorMessage ?? "Failed to load pending review stats"
        );
      }

      if (!tasksResult.ok && !bountiesResult.ok && !reviewsResult.ok) {
        setError(warnings.join(" · "));
      } else if (warnings.length > 0) {
        setWarning(warnings.join(" · "));
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

  const statusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success" as const;
      case "in_progress":
      case "claimed":
        return "warning" as const;
      case "completed":
        return "info" as const;
      case "draft":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="max-w-6xl relative">
      <PageHeader
        title="Ops"
        description="Operate market integrity across tasks, bounties, reviews, and credit controls from one queue-driven surface."
        agentEndpoint="GET /api/v1/admin/tasks"
      />

      {error && (
        <div className="mb-6 rounded-[8px] border border-[#ee0000]/20 bg-[#ee0000]/5 px-4 py-3 text-[13px] text-[#ee0000] font-mono">
          <span className="text-[#ee0000] mr-2 font-semibold">ERR</span>
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-6 rounded-[8px] border border-[#f5a623]/20 bg-[#f5a623]/5 px-4 py-3 text-[13px] text-[#f5a623] font-mono">
          <span className="text-[#f5a623] mr-2 font-semibold">WARN</span>
          {warning}
        </div>
      )}

      {/* Stats */}
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
                <Stat label="Total Tasks" value={stats?.totalTasks ?? "--"} />
                <Stat label="Open Bounties" value={stats?.openBounties ?? "--"} />
                <Stat
                  label="Pending Reviews"
                  value={stats?.pendingReviews ?? "--"}
                  change={stats && stats.pendingReviews > 0 ? "Needs attention" : ""}
                  changeType={
                    stats && stats.pendingReviews > 0 ? "warning" as "negative" : "neutral"
                  }
                />
                <Stat label="Active Claims" value={stats?.activeClaims ?? "--"} />
              </>
            )}
          </StatGrid>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/tasks">
          <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-4 hover:border-[rgba(255,255,255,0.16)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] text-[#a1a1a1] group-hover:text-[#ededed] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ededed]">
                  Create Task
                </h3>
                <p className="text-[13px] text-[#444]">
                  Open a new work queue for the market
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/bounties">
          <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-4 hover:border-[rgba(255,255,255,0.16)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] text-[#a1a1a1] group-hover:text-[#ededed] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2l2.12 4.3 4.74.69-3.43 3.34.81 4.72L9 12.77l-4.24 2.28.81-4.72L2.14 6.99l4.74-.69L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ededed]">
                  Create Bounty
                </h3>
                <p className="text-[13px] text-[#444]">
                  Put settlement-backed work on the board
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/credits">
          <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-4 hover:border-[rgba(255,255,255,0.16)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] text-[#a1a1a1] group-hover:text-[#ededed] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2v14M5.5 5.5C5.5 4.12 7.07 3 9 3s3.5 1.12 3.5 2.5S10.93 8 9 8 5.5 9.12 5.5 10.5 7.07 13 9 13s3.5-1.12 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ededed]">
                  Grant Credits
                </h3>
                <p className="text-[13px] text-[#444]">
                  Issue or remove purchasing power from circulation
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-[#ededed]">
              Recent Tasks
            </h2>
            <Link
              href="/admin/tasks"
              className="text-[13px] text-[#666] hover:text-[#ededed] transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-[13px] text-[#444] py-4 text-center font-mono">
                No tasks yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <a
                    key={task.id}
                    href={`/admin/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[13px] text-[#ededed] truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(task.status)}>
                          {task.status}
                        </Badge>
                        <span className="text-[13px] text-[#444]">
                          {task.credit_reward} credits
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] text-[#444] shrink-0 ml-4">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bounties */}
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-[#ededed]">
              Recent Bounties
            </h2>
            <Link
              href="/admin/bounties"
              className="text-[13px] text-[#666] hover:text-[#ededed] transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentBounties.length === 0 ? (
              <p className="text-[13px] text-[#444] py-4 text-center font-mono">
                No bounties yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentBounties.map((bounty) => (
                  <a
                    key={bounty.id}
                    href={`/admin/bounties/${bounty.id}`}
                    className="flex items-center justify-between rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[13px] text-[#ededed] truncate">
                        {bounty.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(bounty.status)}>
                          {bounty.status}
                        </Badge>
                        <Badge variant="outline">{bounty.type}</Badge>
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-[#f5a623] shrink-0 ml-4">
                      {bounty.credit_reward} cr
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
