"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  formatCompactValue,
} from "@/components/mission-runtime";
import { Badge, Button } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";
import type {
  CampaignRecord,
  DeliverableRecord,
  MountainSummary,
  RewardSplitRecord,
  VerificationRunRecord,
  WorkLeaseRecord,
  WorkSpecRecord,
} from "@/lib/v2/types";

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

interface MountainDetailState {
  mountain: MountainSummary | null;
  campaigns: CampaignRecord[];
  workSpecs: WorkSpecRecord[];
  workLeases: WorkLeaseRecord[];
  deliverables: DeliverableRecord[];
  verificationRuns: VerificationRunRecord[];
  rewards: RewardSplitRecord[];
}

const emptyState: MountainDetailState = {
  mountain: null,
  campaigns: [],
  workSpecs: [],
  workLeases: [],
  deliverables: [],
  verificationRuns: [],
  rewards: [],
};

export default function MountainDetailPage() {
  const params = useParams<{ mountainId: string }>();
  const searchParams = useSearchParams();
  const mountainId = params?.mountainId ?? "";
  const { token, ready: authReady } = useAuthState();
  const [data, setData] = useState<MountainDetailState>(emptyState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const legacyMode = searchParams.get("legacy");

  const isLoading = !authReady || (Boolean(token) && mountainId.length > 0 && (!hasLoaded || loading));

  const refreshMountain = useCallback(() => {
    if (!token || !mountainId) return;
    setLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  }, [mountainId, token]);

  useEffect(() => {
    if (!authReady || !token || !mountainId) return;

    let cancelled = false;

    async function loadMountain() {
      const [mountainResult, campaignsResult, specsResult, leasesResult, deliverablesResult, verificationResult, rewardsResult] =
        await Promise.all([
          fetchJsonResult<{ mountain?: MountainSummary }>(`/api/v2/mountains/${mountainId}`, {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ campaigns?: CampaignRecord[] }>("/api/v2/campaigns", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ work_specs?: WorkSpecRecord[] }>("/api/v2/work-specs", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ work_leases?: WorkLeaseRecord[] }>("/api/v2/work-leases", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ deliverables?: DeliverableRecord[] }>("/api/v2/deliverables", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ verification_runs?: VerificationRunRecord[] }>("/api/v2/verification-runs", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ rewards?: RewardSplitRecord[]; reward_splits?: RewardSplitRecord[] }>("/api/v2/rewards", {
            headers: authHeaders(token),
          }),
        ]);

      if (cancelled) return;

      if (!mountainResult.ok || !mountainResult.data?.mountain) {
        setError(mountainResult.errorMessage ?? "Failed to load mountain");
        setData(emptyState);
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      const campaigns = (campaignsResult.data?.campaigns ?? []).filter((campaign) => campaign.mountain_id === mountainId);
      const workSpecs = (specsResult.data?.work_specs ?? []).filter((spec) => spec.mountain_id === mountainId);
      const workLeases = (leasesResult.data?.work_leases ?? []).filter((lease) => lease.mountain_id === mountainId);
      const deliverables = (deliverablesResult.data?.deliverables ?? []).filter((deliverable) => deliverable.mountain_id === mountainId);
      const verificationRuns = (verificationResult.data?.verification_runs ?? []).filter((run) => run.mountain_id === mountainId);
      const rewards = (rewardsResult.data?.rewards ?? rewardsResult.data?.reward_splits ?? []).filter((reward) => reward.mountain_id === mountainId);

      setError(null);
      setData({
        mountain: mountainResult.data.mountain,
        campaigns,
        workSpecs,
        workLeases,
        deliverables,
        verificationRuns,
        rewards,
      });
      setHasLoaded(true);
      setLoading(false);
    }

    void loadMountain();
    return () => {
      cancelled = true;
    };
  }, [authReady, mountainId, refreshKey, token]);

  const mountain = data.mountain;
  const activeLeases = useMemo(
    () => data.workLeases.filter((lease) => ["accepted", "active", "checkpoint_due", "submitted"].includes(lease.status)),
    [data.workLeases]
  );
  const blockedSpecs = useMemo(
    () => data.workSpecs.filter((spec) => spec.status === "blocked"),
    [data.workSpecs]
  );
  const contradictionRuns = useMemo(
    () => data.verificationRuns.filter((run) => run.outcome === "contradiction" || run.contradiction_count > 0),
    [data.verificationRuns]
  );
  const pendingRewards = useMemo(
    () => data.rewards.filter((reward) => reward.settlement_status !== "settled"),
    [data.rewards]
  );

  const rail = useMemo(
    () => [
      {
        id: "campaigns",
        label: "Campaigns",
        count: String(data.campaigns.length),
        note: "Parallel lines of attack under this mountain",
        active: data.campaigns.length > 0,
      },
      {
        id: "specs",
        label: "Work Specs",
        count: String(data.workSpecs.length),
        note: blockedSpecs.length > 0 ? "Supervisor attention required on blocked specs" : "Machine-readable work packages",
        active: data.workSpecs.length > 0,
      },
      {
        id: "leases",
        label: "Leases",
        count: String(activeLeases.length),
        note: activeLeases.length > 0 ? "Execution currently in motion" : "No active execution leases",
        active: activeLeases.length > 0,
      },
      {
        id: "verification",
        label: "Verification",
        count: String(data.verificationRuns.length),
        note: contradictionRuns.length > 0 ? "Contradictions surfaced for adjudication" : "Replication and evidence pressure",
        active: data.verificationRuns.length > 0,
      },
    ],
    [activeLeases.length, blockedSpecs.length, contradictionRuns.length, data.campaigns.length, data.verificationRuns.length, data.workSpecs.length]
  );

  const campaignItems = useMemo(
    () =>
      data.campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.summary,
        badge: <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>,
        meta: `${campaign.risk_ceiling} risk ceiling · ${formatCompactValue(campaign.budget_credits)} credits · milestone ${campaign.milestone_order}`,
      })),
    [data.campaigns]
  );

  const specItems = useMemo(
    () =>
      data.workSpecs.map((spec) => ({
        id: spec.id,
        title: spec.title,
        description: spec.summary,
        badge: <Badge variant={statusVariant(spec.status)}>{spec.status}</Badge>,
        meta: `${spec.role_type} · ${spec.contribution_type} · cadence ${spec.checkpoint_cadence_minutes}m · priority ${spec.priority}`,
      })),
    [data.workSpecs]
  );

  const deliverableItems = useMemo(
    () =>
      data.deliverables.map((deliverable) => ({
        id: deliverable.id,
        title: deliverable.title,
        description: deliverable.summary,
        badge: <Badge variant="glass">{deliverable.deliverable_type}</Badge>,
        meta: `confidence ${deliverable.confidence} · novelty ${deliverable.novelty_score} · reproducibility ${deliverable.reproducibility_score}`,
      })),
    [data.deliverables]
  );

  const verificationItems = useMemo(
    () =>
      data.verificationRuns.map((run) => ({
        id: run.id,
        title: run.verification_type,
        description:
          run.findings[0]?.issue?.toString() ??
          run.findings[0]?.statement?.toString() ??
          "Verification run is awaiting evidence review.",
        badge: <Badge variant={statusVariant(run.outcome)}>{run.outcome}</Badge>,
        meta: `${run.contradiction_count} contradictions · confidence delta ${run.confidence_delta}`,
      })),
    [data.verificationRuns]
  );

  const rewardItems = useMemo(
    () =>
      data.rewards.map((reward) => ({
        id: reward.id,
        title: `${reward.role} / ${reward.amount_credits} credits`,
        description: reward.rationale,
        badge: <Badge variant={reward.settlement_status === "settled" ? "success" : "warning"}>{reward.settlement_status}</Badge>,
        meta: `beneficiary ${reward.beneficiary_agent_id ?? reward.beneficiary_account_id ?? "unassigned"}`,
      })),
    [data.rewards]
  );

  const timelineItems = useMemo(() => {
    const events = [
      ...data.workLeases.map((lease) => ({
        id: `lease-${lease.id}`,
        timestamp: lease.updated_at,
        title: lease.assigned_agent_id ?? "Lease reassignment",
        description: lease.rationale ?? "Execution lease updated.",
        badge: <Badge variant={statusVariant(lease.status)}>{lease.status}</Badge>,
        meta: `lease · ${lease.work_spec_id}`,
      })),
      ...data.deliverables.map((deliverable) => ({
        id: `deliverable-${deliverable.id}`,
        timestamp: deliverable.updated_at,
        title: deliverable.title,
        description: deliverable.summary,
        badge: <Badge variant="glass">{deliverable.deliverable_type}</Badge>,
        meta: `artifact · ${deliverable.work_spec_id ?? "unscoped"}`,
      })),
      ...data.verificationRuns.map((run) => ({
        id: `verification-${run.id}`,
        timestamp: run.updated_at,
        title: run.verification_type,
        description:
          run.findings[0]?.issue?.toString() ??
          run.findings[0]?.statement?.toString() ??
          "Verification status updated.",
        badge: <Badge variant={statusVariant(run.outcome)}>{run.outcome}</Badge>,
        meta: `verification · ${run.deliverable_id ?? "no deliverable"}`,
      })),
      ...data.rewards.map((reward) => ({
        id: `reward-${reward.id}`,
        timestamp: reward.updated_at,
        title: `${reward.role} / ${reward.amount_credits} credits`,
        description: reward.rationale,
        badge: <Badge variant={reward.settlement_status === "settled" ? "success" : "warning"}>{reward.settlement_status}</Badge>,
        meta: `reward · ${reward.beneficiary_agent_id ?? reward.beneficiary_account_id ?? "unassigned"}`,
      })),
    ];

    return events
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 10)
      .map(({ timestamp, ...item }) => ({
        ...item,
        meta: `${item.meta} · ${timestamp}`,
      }));
  }, [data.deliverables, data.rewards, data.verificationRuns, data.workLeases]);

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Mountain Detail"
        description="Inspect one mission contract end to end: campaigns, specs, leases, artifacts, verification pressure, and the reward rail."
        section="admin"
        actions={
          <>
            <Button variant="secondary" onClick={refreshMountain} disabled={isLoading}>
              Refresh mountain
            </Button>
            <Link href="/admin/supervisor">
              <Button>Open supervisor</Button>
            </Link>
          </>
        }
      />

      {legacyMode ? (
        <div className="border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.86)] px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="glass">legacy task record</Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
              COMPAT::TASK_TO_MOUNTAIN
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-[#4a4036]">
            This page is the v2-compatible destination for an older task URL. Review the mission chronology, campaign pressure, verification status, and settlement ledger here instead of the archived task model.
          </p>
        </div>
      ) : null}

      {error ? <RuntimeErrorPanel title="Mountain Dossier Fault" message={error} /> : null}

      {isLoading ? (
        <RuntimeLoadingGrid blocks={3} />
      ) : !mountain ? (
        <RuntimeEmptyState
          eyebrow="DOSSIER UNAVAILABLE"
          title="Mountain not found"
          description="This route no longer renders legacy task snapshots. Open the mountain builder to create or inspect a v2 mission."
          action={
            <Link href="/admin/mountains">
              <Button>Back to mountains</Button>
            </Link>
          }
        />
      ) : (
        <>
          <RuntimeHero
            eyebrow="Mission Contract"
            title={mountain.title}
            description={mountain.target_problem}
            badges={[
              mountain.domain,
              mountain.horizon,
              `${mountain.progress_percent}% progress`,
              `${formatCompactValue(mountain.total_budget_credits)} credits budgeted`,
            ]}
          >
            <LeaseCard
              title="Mountain Posture"
              subtitle={mountain.thesis}
              status={<Badge variant={statusVariant(mountain.status)}>{mountain.status}</Badge>}
              stats={[
                { label: "Visibility", value: mountain.visibility },
                { label: "Campaigns", value: String(mountain.campaign_count) },
                { label: "Active Leases", value: String(activeLeases.length) },
                { label: "Verified", value: String(mountain.verified_deliverable_count) },
              ]}
            />
          </RuntimeHero>

          <PhaseRail items={rail} />

          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTile label="Budget" value={formatCompactValue(mountain.total_budget_credits)} detail="Admin-funded mission budget" />
            <TelemetryTile label="Distributed" value={formatCompactValue(mountain.reward_distributed_credits)} detail="Credits staged or settled to contributors" tone="success" />
            <TelemetryTile label="Blocked Specs" value={String(blockedSpecs.length)} detail="Specs needing replan or intervention" tone={blockedSpecs.length > 0 ? "warning" : "neutral"} />
            <TelemetryTile label="Pending Rewards" value={String(pendingRewards.length)} detail="Settlement records not yet finalized" tone={pendingRewards.length > 0 ? "warning" : "neutral"} />
          </div>

          <RuntimeSection
            eyebrow="Governance"
            title="Budget and success contract"
            detail="The mountain is the operator-authored contract. Everything else should subordinate itself to these terms."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <LeaseCard
                title="Success Criteria"
                subtitle={mountain.success_criteria}
                status={<Badge variant="glass">{mountain.settlement_policy_mode}</Badge>}
                stats={[
                  { label: "Decomposition", value: formatCompactValue(mountain.budget_envelopes.decomposition) },
                  { label: "Execution", value: formatCompactValue(mountain.budget_envelopes.execution) },
                  { label: "Replication", value: formatCompactValue(mountain.budget_envelopes.replication) },
                  { label: "Synthesis", value: formatCompactValue(mountain.budget_envelopes.synthesis) },
                ]}
              />
              <LeaseCard
                title="Risk and Reserve"
                subtitle="Emergency reserves and verification pressure keep the mountain from drifting into unbounded swarm behavior."
                status={<Badge variant="warning">supervisor-bound</Badge>}
                stats={[
                  { label: "Emergency", value: formatCompactValue(mountain.budget_envelopes.emergency) },
                  { label: "Tags", value: mountain.tags.slice(0, 2).join(" / ") || "untagged" },
                  { label: "Launched", value: mountain.launched_at ?? "not launched" },
                  { label: "Updated", value: mountain.updated_at },
                ]}
              />
            </div>
          </RuntimeSection>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection eyebrow="Campaigns" title="Parallel lines of attack">
              <RuntimeList items={campaignItems} />
            </RuntimeSection>
            <RuntimeSection eyebrow="Work Specs" title="Supervisor-issued work packages">
              <RuntimeList items={specItems} />
            </RuntimeSection>
          </div>

          <RuntimeSection
            eyebrow="Execution"
            title="Lease board"
            detail="Leases are the live control surface. The system should understand who owns work, when evidence is due, and when to reassign."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {data.workLeases.map((lease) => (
                <LeaseCard
                  key={lease.id}
                  title={lease.assigned_agent_id ?? "Unassigned lease"}
                  subtitle={lease.rationale ?? "Supervisor-issued execution lease"}
                  status={<Badge variant={statusVariant(lease.status)}>{lease.status}</Badge>}
                  stats={[
                    { label: "Work Spec", value: lease.work_spec_id },
                    { label: "Checkpoint", value: lease.checkpoint_due_at ?? "not set" },
                    { label: "Expires", value: lease.expires_at ?? "not set" },
                    { label: "Renewals", value: String(lease.renewal_count) },
                  ]}
                />
              ))}
            </div>
          </RuntimeSection>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection eyebrow="Artifacts" title="Evidence-bearing deliverables">
              <RuntimeList items={deliverableItems} />
            </RuntimeSection>
            <RuntimeSection eyebrow="Verification" title="Replication and contradiction desk">
              <RuntimeList items={verificationItems} />
            </RuntimeSection>
          </div>

          <RuntimeSection
            eyebrow="Timeline"
            title="Mission chronology"
            detail="The operator should be able to scan the mountain as one evolving control surface, from lease movement through artifacts, verification, and settlement."
          >
            <RuntimeList items={timelineItems} />
          </RuntimeSection>

          <RuntimeSection
            eyebrow="Settlement"
            title="Reward ledger"
            detail="TokenHall remains the incentive rail, but the ledger should clearly follow mission contribution rather than generic activity."
          >
            <RuntimeList items={rewardItems} />
          </RuntimeSection>
        </>
      )}
    </div>
  );
}
