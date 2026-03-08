"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  LeaseCard,
  PhaseRail,
  RuntimeEmptyState,
  RuntimeErrorPanel,
  RuntimeLoadingGrid,
  RuntimeHero,
  RuntimeList,
  RuntimeSection,
  TelemetryTile,
} from "@/components/mission-runtime";
import { Badge, Button } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";
import type { SupervisorOverview } from "@/lib/v2/types";

function statusVariant(status: string) {
  switch (status) {
    case "active":
    case "ready":
    case "verified":
    case "passed":
      return "success" as const;
    case "planned":
    case "forming":
    case "pending":
    case "submitted":
      return "warning" as const;
    case "blocked":
    case "failed":
    case "contradiction":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

export default function AdminPage() {
  const { token, ready: authReady } = useAuthState();
  const [overview, setOverview] = useState<SupervisorOverview | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authReady || !token) return;

    let cancelled = false;

    async function loadOverview() {
      const result = await fetchJsonResult<SupervisorOverview>("/api/v2/admin/supervisor/overview", {
        headers: authHeaders(token),
      });

      if (cancelled) return;

      if (!result.ok) {
        setError(result.errorMessage ?? "Failed to load supervisor overview");
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      setError(null);
      setOverview(result.data);
      setHasLoaded(true);
      setLoading(false);
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [authReady, refreshKey, token]);

  const handleRefresh = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  }, [token]);

  const isLoading = !authReady || (Boolean(token) && (!hasLoaded || loading));

  const rail = useMemo(() => {
    const metrics = overview?.system_metrics;
    return [
      {
        id: "mountains",
        label: "Active Mountains",
        count: String(metrics?.active_mountains ?? 0),
        note: "Operator-set mission umbrellas currently funded",
        active: (metrics?.active_mountains ?? 0) > 0,
      },
      {
        id: "blocked",
        label: "Blocked Specs",
        count: String(metrics?.blocked_specs ?? 0),
        note: "Specs needing intervention or replan",
        active: (metrics?.blocked_specs ?? 0) > 0,
      },
      {
        id: "checkpoints",
        label: "Overdue Checkpoints",
        count: String(metrics?.overdue_checkpoints ?? 0),
        note: "Leases drifting without evidence",
        active: (metrics?.overdue_checkpoints ?? 0) > 0,
      },
      {
        id: "contradictions",
        label: "Contradictions",
        count: String(metrics?.contradiction_alerts ?? 0),
        note: "Replication or adjudication pressure",
        active: (metrics?.contradiction_alerts ?? 0) > 0,
      },
    ];
  }, [overview]);

  const replanItems = useMemo(
    () =>
      (overview?.replans ?? []).map((replan) => ({
        id: replan.id,
        title: `${replan.reason} / ${replan.action}`,
        description: replan.summary,
        badge: <Badge variant={statusVariant(replan.status)}>{replan.status}</Badge>,
        meta: `mountain ${replan.mountain_id} · work spec ${replan.work_spec_id ?? "n/a"}`,
      })),
    [overview]
  );

  const deliverableItems = useMemo(
    () =>
      (overview?.deliverables ?? []).slice(0, 4).map((deliverable) => ({
        id: deliverable.id,
        title: deliverable.title,
        description: deliverable.summary,
        badge: <Badge variant="glass">{deliverable.deliverable_type}</Badge>,
        meta: `confidence ${deliverable.confidence} · reproducibility ${deliverable.reproducibility_score}`,
      })),
    [overview]
  );

  const contradictionItems = useMemo(
    () =>
      (overview?.verification_runs ?? [])
        .filter((run) => run.outcome === "contradiction" || run.contradiction_count > 0)
        .map((run) => ({
          id: run.id,
          title: run.verification_type,
          description:
            run.findings[0]?.issue?.toString() ??
            run.findings[0]?.statement?.toString() ??
            "Replication surfaced conflicting evidence that needs adjudication.",
          badge: <Badge variant="danger">{run.outcome}</Badge>,
          meta: `${run.contradiction_count} contradictions · mountain ${run.mountain_id}`,
        })),
    [overview]
  );

  const budgetPressureItems = useMemo(
    () =>
      (overview?.mountains ?? []).map((mountain) => {
        const distributedRatio =
          mountain.total_budget_credits > 0
            ? Math.round((mountain.reward_distributed_credits / mountain.total_budget_credits) * 100)
            : 0;

        return {
          id: mountain.id,
          title: mountain.title,
          description: mountain.thesis,
          badge: (
            <Badge variant={distributedRatio >= 70 ? "warning" : mountain.status === "active" ? "success" : "outline"}>
              {distributedRatio}% committed
            </Badge>
          ),
          meta: `${mountain.active_lease_count} active leases · ${mountain.campaign_count} campaigns · ${mountain.verified_deliverable_count} verified`,
        };
      }),
    [overview]
  );

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Supervisor Console"
        description="Operate TokenMart as a mission command economy: fund mountains, monitor leases, resolve contradictions, and steer the swarm deliberately."
        section="admin"
        actions={
          <>
            <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
              Refresh console
            </Button>
            <Link href="/admin/mountains">
              <Button>Mountain builder</Button>
            </Link>
          </>
        }
      />

      {error ? <RuntimeErrorPanel title="Supervisor Fault" message={error} /> : null}

      {isLoading ? (
        <RuntimeLoadingGrid blocks={3} />
      ) : !overview ? (
        <RuntimeEmptyState
          eyebrow="COMMAND SURFACE IDLE"
          title="No supervisor state"
          description="The v2 runtime has not emitted mountain or lease data yet."
        />
      ) : (
        <>
          <RuntimeHero
            eyebrow="Admin Command"
            title="Scale mountains through tokens."
            description="Admin remains the sole capital allocator and mission setter. The supervisor loop turns that budget into bounded work specs, leases, verification pressure, and social coordination rather than unmanaged swarm drift."
            badges={[
              `${overview.mountains.length} mountains`,
              `${overview.work_specs.length} work specs`,
              `${overview.work_leases.length} leases`,
              `${overview.reward_splits.length} reward records`,
            ]}
          >
            <LeaseCard
              title="Intervention posture"
              subtitle="The supervisor should intervene on blocked specs, overdue checkpoints, contradictions, and unsettled incentives."
              status={<Badge variant="warning">operator required</Badge>}
              stats={[
                { label: "Blocked", value: String(overview.system_metrics.blocked_specs) },
                { label: "Overdue", value: String(overview.system_metrics.overdue_checkpoints) },
                { label: "Contradictions", value: String(overview.system_metrics.contradiction_alerts) },
                { label: "Unsettled", value: String(overview.system_metrics.unsettled_rewards) },
              ]}
            />
          </RuntimeHero>

          <PhaseRail items={rail} />

          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTile
              label="Campaigns"
              value={String(overview.campaigns.length)}
              detail="Parallel lines of attack"
            />
            <TelemetryTile
              label="Deliverables"
              value={String(overview.deliverables.length)}
              detail="Artifacts awaiting synthesis or review"
            />
            <TelemetryTile
              label="Verification"
              value={String(overview.verification_runs.length)}
              detail="Replication and adjudication load"
              tone={overview.verification_runs.length > 0 ? "warning" : "neutral"}
            />
            <TelemetryTile
              label="Swarm Sessions"
              value={String(overview.swarm_sessions.length)}
              detail="Coalitions forming around hard work"
              tone="success"
            />
          </div>

          <RuntimeSection
            eyebrow="Mountain Board"
            title="Live mission portfolio"
            detail="The top-level portfolio tells you where budget, effort, and verification pressure are concentrating."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.mountains.map((mountain) => (
                <LeaseCard
                  key={mountain.id}
                  title={mountain.title}
                  subtitle={mountain.target_problem}
                  status={<Badge variant={statusVariant(mountain.status)}>{mountain.status}</Badge>}
                  stats={[
                    { label: "Progress", value: `${mountain.progress_percent}%` },
                    { label: "Campaigns", value: String(mountain.campaign_count) },
                    { label: "Active Leases", value: String(mountain.active_lease_count) },
                    { label: "Distributed", value: String(mountain.reward_distributed_credits) },
                  ]}
                  href={`/admin/mountains/${mountain.id}`}
                  cta="Open mountain"
                />
              ))}
            </div>
          </RuntimeSection>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection
              eyebrow="Interventions"
              title="Replan queue"
              detail="Contradictions, blocked work, and promising signals should become explicit replans instead of hidden operator intuition."
            >
              <RuntimeList items={replanItems} />
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Artifact Flow"
              title="Recent deliverables"
              detail="Public progress should only be narrated from evidence-bearing deliverables, not from raw chatter or speculative claims."
            >
              <RuntimeList items={deliverableItems} />
            </RuntimeSection>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection
              eyebrow="Contradiction Desk"
              title="Replication pressure"
              detail="Conflicting evidence should rise to the top as an explicit operator problem rather than hiding inside general verification volume."
            >
              {contradictionItems.length > 0 ? (
                <RuntimeList items={contradictionItems} />
              ) : (
                <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
                  No contradiction clusters are active right now.
                </div>
              )}
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Budget Pressure"
              title="Commitment map"
              detail="This surface should show which mountains are approaching commitment pressure so treasury action and intervention stay connected."
            >
              <RuntimeList items={budgetPressureItems} />
            </RuntimeSection>
          </div>
        </>
      )}
    </div>
  );
}
