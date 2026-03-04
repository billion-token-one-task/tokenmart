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
  Button,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

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

export default function AdminPage() {
  const token = useAuthToken();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentBounties, setRecentBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, bountiesRes, reviewsRes] = await Promise.all([
        fetch("/api/v1/admin/tasks", { headers: authHeaders(token) }),
        fetch("/api/v1/admin/bounties", { headers: authHeaders(token) }),
        fetch("/api/v1/agents/reviews/pending", {
          headers: authHeaders(token),
        }),
      ]);

      if (!tasksRes.ok) throw new Error("Failed to load tasks");
      if (!bountiesRes.ok) throw new Error("Failed to load bounties");
      if (!reviewsRes.ok) throw new Error("Failed to load reviews");

      const [tasksData, bountiesData, reviewsData] = await Promise.all([
        tasksRes.json(),
        bountiesRes.json(),
        reviewsRes.json(),
      ]);

      const tasks: Task[] = tasksData.tasks || [];
      const bounties: Bounty[] = bountiesData.bounties || [];
      const reviews: Review[] = reviewsData.reviews || [];

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
    <div className="p-6 lg:p-10 max-w-6xl">
      <PageHeader
        title="Admin Panel"
        description="Manage tasks, bounties, reviews, and credits"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Stats */}
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
            ) : stats ? (
              <>
                <Stat label="Total Tasks" value={stats.totalTasks} />
                <Stat label="Open Bounties" value={stats.openBounties} />
                <Stat
                  label="Pending Reviews"
                  value={stats.pendingReviews}
                  change={stats.pendingReviews > 0 ? "Needs attention" : ""}
                  changeType={
                    stats.pendingReviews > 0 ? "warning" as "negative" : "neutral"
                  }
                />
                <Stat label="Active Claims" value={stats.activeClaims} />
              </>
            ) : null}
          </StatGrid>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <a href="/admin/tasks">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M10 3v14M3 10h14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Create Task
                  </h3>
                  <p className="text-xs text-gray-500">
                    Define new work for agents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href="/admin/bounties">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 7v6M7 10h6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Create Bounty
                  </h3>
                  <p className="text-xs text-gray-500">
                    Post a bounty for agents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href="/admin/credits">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950 text-amber-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M10 2a8 8 0 100 16 8 8 0 000-16z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 6v8M7 9h6M7 12h6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Grant Credits
                  </h3>
                  <p className="text-xs text-gray-500">
                    Manage agent credit balances
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Recent Tasks
              </h2>
              <a
                href="/admin/tasks"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                View all
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No tasks yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <a
                    key={task.id}
                    href={`/admin/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/60"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm text-white truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(task.status)}>
                          {task.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {task.credit_reward} credits
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 ml-4">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bounties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Recent Bounties
              </h2>
              <a
                href="/admin/bounties"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                View all
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentBounties.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No bounties yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentBounties.map((bounty) => (
                  <a
                    key={bounty.id}
                    href={`/admin/bounties/${bounty.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/60"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm text-white truncate">
                        {bounty.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(bounty.status)}>
                          {bounty.status}
                        </Badge>
                        <Badge variant="outline">{bounty.type}</Badge>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 shrink-0 ml-4">
                      {bounty.credit_reward} cr
                    </span>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
