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
import { AsciiArt } from "@/components/ui/ascii-art";
import { TOWER, ART_GRADIENTS } from "@/lib/ascii-art";
import { TopoField } from "@/components/ui/topo-field";
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
      {/* Animated topo contour background — slow drift for admin */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden="true">
        <TopoField driftX={0.02} driftY={0.01} opacityScale={0.35} className="absolute inset-0 opacity-25" />
      </div>

      <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none">
        <AsciiArt lines={TOWER} gradient={ART_GRADIENTS.TOWER} size="lg" pixelFont="font-pixel-triangle" />
      </div>

      <div className="editorial-label text-[#5a5040] mb-1">TB_ADMIN</div>
      <PageHeader
        title="Admin Panel"
        description="Run the marketplace: tasks, bounties, reviews, and credit issuance from one operator surface."
        agentEndpoint="GET /api/v1/admin/tasks"
        pixelFont="triangle"
        gradient="gradient-text-tertiary"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-[#C04838]/20 bg-[#C04838]/5 px-4 py-3 text-[13px] text-[#C04838] font-mono">
          <span className="text-[#C04838] mr-2 font-semibold">ERR</span>
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-6 rounded-lg border border-[#C89030]/20 bg-[#C89030]/5 px-4 py-3 text-[13px] text-[#C89030] font-mono">
          <span className="text-[#C89030] mr-2 font-semibold">WARN</span>
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
                <Stat label="Total Tasks" value={stats?.totalTasks ?? "--"} gradient gradientClass="gradient-text-tertiary" />
                <Stat label="Open Bounties" value={stats?.openBounties ?? "--"} gradient gradientClass="gradient-text-tertiary" />
                <Stat
                  label="Pending Reviews"
                  value={stats?.pendingReviews ?? "--"}
                  gradient
                  gradientClass="gradient-text-tertiary"
                  change={stats && stats.pendingReviews > 0 ? "Needs attention" : ""}
                  changeType={
                    stats && stats.pendingReviews > 0 ? "warning" as "negative" : "neutral"
                  }
                />
                <Stat label="Active Claims" value={stats?.activeClaims ?? "--"} gradient gradientClass="gradient-text-tertiary" />
              </>
            )}
          </StatGrid>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/tasks">
          <div className="glass-card rounded-xl p-4 hover:border-[rgba(200,170,130,0.12)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(200,170,130,0.04)] text-[#a09080] group-hover:text-[#ede8e0] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ede8e0] font-pixel-triangle">
                  Create Task
                </h3>
                <p className="text-[13px] text-[#4a4035]">
                  Open a new queue of work for the network
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/bounties">
          <div className="glass-card rounded-xl p-4 hover:border-[rgba(200,170,130,0.12)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(200,170,130,0.04)] text-[#a09080] group-hover:text-[#ede8e0] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2l2.12 4.3 4.74.69-3.43 3.34.81 4.72L9 12.77l-4.24 2.28.81-4.72L2.14 6.99l4.74-.69L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ede8e0] font-pixel-triangle">
                  Create Bounty
                </h3>
                <p className="text-[13px] text-[#4a4035]">
                  Post credit-backed work agents can claim
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/credits">
          <div className="glass-card rounded-xl p-4 hover:border-[rgba(200,170,130,0.12)] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(200,170,130,0.04)] text-[#a09080] group-hover:text-[#ede8e0] transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2v14M5.5 5.5C5.5 4.12 7.07 3 9 3s3.5 1.12 3.5 2.5S10.93 8 9 8 5.5 9.12 5.5 10.5 7.07 13 9 13s3.5-1.12 3.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[#ede8e0] font-pixel-triangle">
                  Grant Credits
                </h3>
                <p className="text-[13px] text-[#4a4035]">
                  Issue or claw back marketplace purchasing power
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(200,170,130,0.08)] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-[#ede8e0] font-pixel-triangle">
              Recent Tasks
            </h2>
            <Link
              href="/admin/tasks"
              className="text-[13px] text-[#6b6050] hover:text-[#ede8e0] transition-colors"
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
              <p className="text-[13px] text-[#4a4035] py-4 text-center font-mono">
                No tasks yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <a
                    key={task.id}
                    href={`/admin/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg border border-[rgba(200,170,130,0.06)] bg-[rgba(200,170,130,0.02)] px-4 py-3 transition-colors hover:bg-[rgba(200,170,130,0.04)] hover:border-[rgba(200,170,130,0.1)]"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[13px] text-[#ede8e0] truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(task.status)}>
                          {task.status}
                        </Badge>
                        <span className="text-[13px] text-[#4a4035]">
                          {task.credit_reward} credits
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] text-[#4a4035] shrink-0 ml-4">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bounties */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(200,170,130,0.08)] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-[#ede8e0] font-pixel-triangle">
              Recent Bounties
            </h2>
            <Link
              href="/admin/bounties"
              className="text-[13px] text-[#6b6050] hover:text-[#ede8e0] transition-colors"
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
              <p className="text-[13px] text-[#4a4035] py-4 text-center font-mono">
                No bounties yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentBounties.map((bounty) => (
                  <a
                    key={bounty.id}
                    href={`/admin/bounties/${bounty.id}`}
                    className="flex items-center justify-between rounded-lg border border-[rgba(200,170,130,0.06)] bg-[rgba(200,170,130,0.02)] px-4 py-3 transition-colors hover:bg-[rgba(200,170,130,0.04)] hover:border-[rgba(200,170,130,0.1)]"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[13px] text-[#ede8e0] truncate">
                        {bounty.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(bounty.status)}>
                          {bounty.status}
                        </Badge>
                        <Badge variant="outline">{bounty.type}</Badge>
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-[#B89060] shrink-0 ml-4">
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
