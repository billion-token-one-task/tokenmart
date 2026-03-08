"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  LeaseCard,
  RuntimeHero,
  RuntimeList,
  RuntimeSection,
  TelemetryTile,
} from "@/components/mission-runtime";
import { Badge, Button, Input, Select, Skeleton, Textarea, useToast } from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";
import type { MountainSummary, RewardSplitRecord } from "@/lib/v2/types";

const rewardRoleOptions = [
  { value: "executor", label: "Executor" },
  { value: "verifier", label: "Verifier" },
  { value: "synthesizer", label: "Synthesizer" },
  { value: "coalition", label: "Coalition" },
  { value: "reviewer", label: "Reviewer" },
];

export default function TreasuryPage() {
  const { token, ready: authReady } = useAuthState();
  const { toast } = useToast();
  const [mountains, setMountains] = useState<MountainSummary[]>([]);
  const [rewards, setRewards] = useState<RewardSplitRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mountainId, setMountainId] = useState("");
  const [role, setRole] = useState("executor");
  const [amount, setAmount] = useState("0");
  const [rationale, setRationale] = useState("");
  const [beneficiaryAgentId, setBeneficiaryAgentId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isLoading = !authReady || (Boolean(token) && (!hasLoaded || loading));

  useEffect(() => {
    if (!authReady || !token) return;

    let cancelled = false;

    async function loadTreasury() {
      const [mountainsResult, rewardsResult] = await Promise.all([
        fetchJsonResult<{ mountains?: MountainSummary[] }>("/api/v2/mountains", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ reward_splits?: RewardSplitRecord[] }>("/api/v2/rewards", {
          headers: authHeaders(token),
        }),
      ]);

      if (cancelled) return;

      if (mountainsResult.ok) {
        const nextMountains = mountainsResult.data?.mountains ?? [];
        setMountains(nextMountains);
        setMountainId((current) => current || nextMountains[0]?.id || current);
      }

      if (rewardsResult.ok) {
        setRewards(rewardsResult.data?.reward_splits ?? []);
      }

      setHasLoaded(true);
      setLoading(false);
    }

    void loadTreasury();

    return () => {
      cancelled = true;
    };
  }, [authReady, refreshKey, token]);

  const handleRefresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setRefreshKey((value) => value + 1);
  }, [token]);

  const pendingRewards = useMemo(
    () => rewards.filter((reward) => reward.settlement_status !== "settled"),
    [rewards]
  );

  const totalBudget = useMemo(
    () => mountains.reduce((sum, mountain) => sum + mountain.total_budget_credits, 0),
    [mountains]
  );

  const totalDistributed = useMemo(
    () => mountains.reduce((sum, mountain) => sum + mountain.reward_distributed_credits, 0),
    [mountains]
  );

  const handleIssueReward = async () => {
    if (!token || !mountainId || !role || !rationale.trim()) return;

    setSubmitting(true);
    const result = await fetchJsonResult<{ reward_split?: RewardSplitRecord }>("/api/v2/rewards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({
        mountain_id: mountainId,
        beneficiary_agent_id: beneficiaryAgentId || null,
        role,
        amount_credits: Number(amount),
        rationale,
      }),
    });
    setSubmitting(false);

    if (!result.ok) {
      toast(result.errorMessage ?? "Failed to create reward split", "error");
      return;
    }

    toast("Reward split staged", "success");
    setAmount("0");
    setRationale("");
    setBeneficiaryAgentId("");
    void handleRefresh();
  };

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Treasury Console"
        description="Allocate mission budgets, track burn, and stage reward splits so TokenHall stays the incentive rail rather than the product center."
        section="admin"
        actions={
          <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
            Refresh treasury
          </Button>
        }
      />

      <RuntimeHero
        eyebrow="Mission Treasury"
        title="Budget the climb, not the chatter."
        description="Mission budgets should privilege decomposition, execution, replication, synthesis, and emergency reserves. Reward records should follow verified contribution, not generic engagement."
        badges={[
          `${mountains.length} funded mountains`,
          `${pendingRewards.length} unsettled rewards`,
          "TokenHall = incentive rail",
          "Mission-weighted settlement",
        ]}
      />

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-none" />
          <Skeleton className="h-64 rounded-none" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTile label="Total Budget" value={String(totalBudget)} detail="Credits committed across mountains" />
            <TelemetryTile label="Distributed" value={String(totalDistributed)} detail="Credits already assigned to rewards" />
            <TelemetryTile label="Pending Rewards" value={String(pendingRewards.length)} detail="Settlement records awaiting closure" tone="warning" />
            <TelemetryTile label="Active Missions" value={String(mountains.filter((mountain) => mountain.status === "active").length)} detail="Live mountains with ongoing spend" tone="success" />
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <RuntimeSection
              eyebrow="Issue Reward"
              title="Stage settlement"
              detail="Use structured reward splits so execution, verification, synthesis, and coalition work settle explicitly."
            >
              <div className="space-y-4 border-2 border-[#0a0a0a] bg-white px-4 py-4">
                <Select
                  label="Mountain"
                  value={mountainId}
                  onChange={(event) => setMountainId(event.target.value)}
                  options={mountains.map((mountain) => ({ value: mountain.id, label: mountain.title }))}
                />
                <Select
                  label="Role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  options={rewardRoleOptions}
                />
                <Input label="Beneficiary agent id" value={beneficiaryAgentId} onChange={(event) => setBeneficiaryAgentId(event.target.value)} />
                <Input label="Amount credits" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <Textarea label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={() => void handleIssueReward()} loading={submitting} disabled={!mountainId || !rationale.trim()}>
                    Stage reward
                  </Button>
                </div>
              </div>
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Budget Envelope"
              title="Mountain treasury state"
              detail="Each mountain exposes its mission budget so frontend budget views and future TokenHall settlement logic can stay aligned."
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {mountains.map((mountain) => (
                  <LeaseCard
                    key={mountain.id}
                    title={mountain.title}
                    subtitle={mountain.success_criteria}
                    status={<Badge variant={mountain.status === "active" ? "success" : "outline"}>{mountain.status}</Badge>}
                    stats={[
                      { label: "Budget", value: String(mountain.total_budget_credits) },
                      { label: "Distributed", value: String(mountain.reward_distributed_credits) },
                      { label: "Progress", value: `${mountain.progress_percent}%` },
                      { label: "Campaigns", value: String(mountain.campaign_count) },
                    ]}
                  />
                ))}
              </div>
            </RuntimeSection>
          </div>

          <RuntimeSection eyebrow="Reward Ledger" title="Pending and recent splits">
            <RuntimeList
              items={rewards.map((reward) => ({
                id: reward.id,
                title: `${reward.role} / ${reward.amount_credits} credits`,
                description: reward.rationale,
                badge: <Badge variant={reward.settlement_status === "settled" ? "success" : "warning"}>{reward.settlement_status}</Badge>,
                meta: `beneficiary ${reward.beneficiary_agent_id ?? "unassigned"} · mountain ${reward.mountain_id}`,
              }))}
            />
          </RuntimeSection>
        </>
      )}
    </div>
  );
}
