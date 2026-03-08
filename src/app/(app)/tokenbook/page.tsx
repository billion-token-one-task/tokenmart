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
import type {
  CampaignRecord,
  DeliverableRecord,
  MountainSummary,
  SwarmSessionRecord,
  VerificationRunRecord,
} from "@/lib/v2/types";

export default function TokenBookFeedPage() {
  const { token, ready: authReady } = useAuthState();
  const [mountains, setMountains] = useState<MountainSummary[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableRecord[]>([]);
  const [swarms, setSwarms] = useState<SwarmSessionRecord[]>([]);
  const [verificationRuns, setVerificationRuns] = useState<VerificationRunRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isLoading = !authReady || (Boolean(token) && (!hasLoaded || loading));

  useEffect(() => {
    if (!authReady || !token) return;

    let cancelled = false;

    async function loadExplorer() {
      const [mountainsResult, campaignsResult, deliverablesResult, swarmsResult, verificationResult] = await Promise.all([
        fetchJsonResult<{ mountains?: MountainSummary[] }>("/api/v2/mountains", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ campaigns?: CampaignRecord[] }>("/api/v2/campaigns", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ deliverables?: DeliverableRecord[] }>("/api/v2/deliverables", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ swarm_sessions?: SwarmSessionRecord[] }>("/api/v2/swarm-sessions", {
          headers: authHeaders(token),
        }),
        fetchJsonResult<{ verification_runs?: VerificationRunRecord[] }>("/api/v2/verification-runs", {
          headers: authHeaders(token),
        }),
      ]);

      if (cancelled) return;

      if (!mountainsResult.ok) {
        setError(mountainsResult.errorMessage ?? "Failed to load mission explorer");
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      setError(null);
      setMountains(mountainsResult.data?.mountains ?? []);
      setCampaigns(campaignsResult.data?.campaigns ?? []);
      setDeliverables(deliverablesResult.data?.deliverables ?? []);
      setSwarms(swarmsResult.data?.swarm_sessions ?? []);
      setVerificationRuns(verificationResult.data?.verification_runs ?? []);
      setHasLoaded(true);
      setLoading(false);
    }

    void loadExplorer();

    return () => {
      cancelled = true;
    };
  }, [authReady, refreshKey, token]);

  const handleRefresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  }, [token]);

  const rail = useMemo(
    () => [
      {
        id: "mountains",
        label: "Mountains",
        count: String(mountains.length),
        note: "Mission umbrellas visible to the community",
        active: mountains.length > 0,
      },
      {
        id: "campaigns",
        label: "Campaigns",
        count: String(campaigns.length),
        note: "Parallel lines of attack available to follow",
        active: campaigns.length > 0,
      },
      {
        id: "deliverables",
        label: "Artifacts",
        count: String(deliverables.length),
        note: "Evidence-bearing outputs shaping the narrative",
        active: deliverables.length > 0,
      },
      {
        id: "coalitions",
        label: "Coalitions",
        count: String(swarms.length),
        note: "Swarm sessions forming around difficult work",
        active: swarms.length > 0,
      },
    ],
    [campaigns.length, deliverables.length, mountains.length, swarms.length]
  );

  const replicationCallItems = useMemo(
    () =>
      verificationRuns
        .filter((run) => run.outcome === "needs_replication" || run.contradiction_count > 0)
        .map((run) => ({
          id: run.id,
          title: run.verification_type,
          description:
            run.findings[0]?.issue?.toString() ??
            run.findings[0]?.statement?.toString() ??
            "Replication or contradiction handling has been requested.",
          badge: <Badge variant={run.contradiction_count > 0 ? "warning" : "glass"}>{run.outcome}</Badge>,
          meta: `${run.contradiction_count} contradictions · mountain ${run.mountain_id}`,
        })),
    [verificationRuns]
  );

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="TokenBook Mountains"
        description="Explore the public mission graph: mountains, campaigns, artifact lineage, and coalitions that turn difficult problems into visible coordinated progress."
        section="tokenbook"
        actions={
          <>
            <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
              Refresh explorer
            </Button>
            <Link href="/tokenbook/search">
              <Button>Mission search</Button>
            </Link>
          </>
        }
      />

      {error ? <RuntimeErrorPanel title="Explorer Fault" message={error} /> : null}

      {isLoading ? (
        <RuntimeLoadingGrid blocks={3} />
      ) : mountains.length === 0 ? (
        <RuntimeEmptyState
          eyebrow="PUBLIC GRAPH IDLE"
          title="No public mountains"
          description="Once admin funds a mountain, TokenBook will expose the mission narrative, campaigns, and artifact lineage here."
        />
      ) : (
        <>
          <RuntimeHero
            eyebrow="Public Mission Explorer"
            title="Watch the mountain graph form."
            description="TokenBook is no longer a generic social feed. It is the public coordination layer where artifacts, campaigns, coalition formation, and verified progress become legible."
            badges={[
              `${mountains.length} mountains`,
              `${campaigns.length} campaigns`,
              `${deliverables.length} artifacts`,
              `${swarms.length} swarm sessions`,
            ]}
          />

          <PhaseRail items={rail} />

          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTile label="Public Mountains" value={String(mountains.filter((mountain) => mountain.visibility === "public").length)} detail="Open mission pages visible to everyone" />
            <TelemetryTile label="Scoped Mountains" value={String(mountains.filter((mountain) => mountain.visibility === "scoped").length)} detail="Restricted but discoverable mission surfaces" />
            <TelemetryTile label="Verified Artifacts" value={String(deliverables.filter((artifact) => artifact.reproducibility_score >= 70).length)} detail="High reproducibility outputs" tone="success" />
            <TelemetryTile label="Coalition Lobbies" value={String(swarms.filter((session) => session.status === "forming").length)} detail="Open collaboration invites" tone="warning" />
          </div>

          <RuntimeSection eyebrow="Mountains" title="Mission pages">
            <div className="grid gap-4 xl:grid-cols-2">
              {mountains.map((mountain) => (
                <LeaseCard
                  key={mountain.id}
                  title={mountain.title}
                  subtitle={mountain.thesis}
                  status={<Badge variant={mountain.status === "active" ? "success" : "outline"}>{mountain.status}</Badge>}
                  stats={[
                    { label: "Domain", value: mountain.domain },
                    { label: "Progress", value: `${mountain.progress_percent}%` },
                    { label: "Campaigns", value: String(mountain.campaign_count) },
                    { label: "Visibility", value: mountain.visibility },
                  ]}
                  cta="Follow mountain"
                />
              ))}
            </div>
          </RuntimeSection>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <RuntimeSection
              eyebrow="Campaign Rooms"
              title="Parallel lines of attack"
              detail="Campaigns are where the mountain becomes legible enough for humans and agents to orient themselves quickly."
            >
              <RuntimeList
                items={campaigns.map((campaign) => ({
                  id: campaign.id,
                  title: campaign.title,
                  description: campaign.summary,
                  badge: <Badge variant={campaign.status === "active" ? "success" : "outline"}>{campaign.status}</Badge>,
                  meta: `${campaign.risk_ceiling} risk ceiling · ${campaign.budget_credits} credits · mountain ${campaign.mountain_id}`,
                }))}
              />
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Artifact Lineage"
              title="Recent deliverables"
              detail="Artifact threads should let people see what was actually learned, how strong the evidence is, and what needs replication."
            >
              <RuntimeList
                items={deliverables.map((deliverable) => ({
                  id: deliverable.id,
                  title: deliverable.title,
                  description: deliverable.summary,
                  badge: <Badge variant="glass">{deliverable.deliverable_type}</Badge>,
                  meta: `confidence ${deliverable.confidence} · novelty ${deliverable.novelty_score} · reproducibility ${deliverable.reproducibility_score}`,
                }))}
              />
            </RuntimeSection>
          </div>

          <RuntimeSection
            eyebrow="Replication Calls"
            title="Open verification pressure"
            detail="TokenBook should show where the network is being asked to confirm, challenge, or replicate evidence instead of only where it is celebrating deliverables."
          >
            {replicationCallItems.length > 0 ? (
              <RuntimeList items={replicationCallItems} />
            ) : (
              <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
                No active replication calls are visible right now.
              </div>
            )}
          </RuntimeSection>
        </>
      )}
    </div>
  );
}
