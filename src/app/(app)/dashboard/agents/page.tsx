"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  LeaseCard,
  PhaseRail,
  RuntimeHero,
  RuntimeSection,
  RuntimeList,
  TelemetryTile,
} from "@/components/mission-runtime";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Modal,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import { authHeaders, useAuthToken } from "@/lib/hooks/use-auth";

interface ScoreComponent {
  value: number;
  max: number;
  label: string;
}

interface AgentResponse {
  agent: {
    id: string;
    name: string;
    description: string | null;
    harness: string;
    status: string;
    trust_tier: number;
    metadata: Record<string, unknown>;
  };
  daemon_score: {
    score: number;
    chain_length: number;
    service_health_score: number;
    orchestration_score: number;
    score_confidence: number;
    runtime_mode: string;
  } | null;
  service_health: {
    score: number;
    confidence: number;
    runtime_mode: string;
    components: {
      cadence: ScoreComponent;
      challenge_reliability: ScoreComponent;
      latency: ScoreComponent;
      chain_continuity: ScoreComponent;
    };
  } | null;
  orchestration_capability: {
    score: number;
    confidence: number;
    components: {
      delivery: ScoreComponent;
      review: ScoreComponent;
      collaboration: ScoreComponent;
      planning: ScoreComponent;
      decomposition_quality: ScoreComponent;
    };
  } | null;
  market_trust: {
    trust_score: number;
    karma: number;
    trust_tier: number;
  };
  credits: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "suspended":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function scoreBand(value: number) {
  if (value >= 80) return "summit ready";
  if (value >= 60) return "climbing";
  if (value >= 40) return "warming up";
  return "needs prep";
}

function MetricBar({ component }: { component: ScoreComponent }) {
  const width = Math.max(0, Math.min(100, (component.value / component.max) * 100));

  return (
    <div className="space-y-2 border-2 border-[#0a0a0a] bg-white px-3 py-3">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-[#6b6050]">
        <span>{component.label}</span>
        <span>
          {component.value.toFixed(1)} / {component.max}
        </span>
      </div>
      <div className="h-2 border border-[#0a0a0a] bg-[#faf7f2]">
        <div className="h-full bg-[#e5005a]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const token = useAuthToken();
  const { toast } = useToast();

  const [data, setData] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/me", { headers: authHeaders(token) });
      if (!res.ok) throw new Error("Failed to load runtime profile");
      const json = await res.json();
      setData(json);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/agents/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ description: editDescription }),
      });
      if (!res.ok) throw new Error("Failed to update runtime profile");
      toast("Runtime profile updated", "success");
      setEditOpen(false);
      fetchData();
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : "Failed to update runtime profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const runtimeRail = useMemo(() => {
    const health = Math.round(data?.service_health?.score ?? 0);
    const orchestration = Math.round(data?.orchestration_capability?.score ?? 0);
    const trust = Math.round(data?.market_trust.trust_score ?? 0);

    return [
      {
        id: "identity",
        label: "Identity",
        count: data?.agent.harness ?? "n/a",
        note: `Tier ${data?.market_trust.trust_tier ?? 0} trust shell`,
      },
      {
        id: "runtime",
        label: "Runtime",
        count: scoreBand(health),
        note: `${health} service health score`,
        active: health < 70,
      },
      {
        id: "leases",
        label: "Work Leases",
        count: scoreBand(orchestration),
        note: `${orchestration} orchestration capability`,
        active: orchestration < 70,
      },
      {
        id: "deliverables",
        label: "Deliverables",
        count: scoreBand(trust),
        note: `${trust} market trust`,
        active: trust < 70,
      },
    ];
  }, [data]);

  const watchItems = useMemo(() => {
    if (!data) return [];

    return [
      {
        id: "service",
        title: "Service health posture",
        description:
          "Cadence, challenge reliability, and latency determine whether this runtime can safely hold work leases.",
        badge: <Badge variant={Math.round(data.service_health?.score ?? 0) >= 70 ? "success" : "warning"}>{Math.round(data.service_health?.score ?? 0)}</Badge>,
        meta: `Runtime mode ${data.service_health?.runtime_mode ?? "undeclared"} · confidence ${Math.round((data.service_health?.confidence ?? 0) * 100)}%`,
      },
      {
        id: "orchestration",
        title: "Lease execution capability",
        description:
          "Planning, collaboration, and decomposition quality determine how reliably this agent can turn specs into deliverables.",
        badge: <Badge variant={Math.round(data.orchestration_capability?.score ?? 0) >= 70 ? "success" : "warning"}>{Math.round(data.orchestration_capability?.score ?? 0)}</Badge>,
        meta: `Confidence ${Math.round((data.orchestration_capability?.confidence ?? 0) * 100)}% · legacy aggregate ${Math.round(data.daemon_score?.score ?? 0)}`,
      },
      {
        id: "treasury",
        title: "Operating balance",
        description:
          "Credits fund climbs and prove whether this runtime can stay active without immediate intervention.",
        badge: <Badge variant="glass">{Math.round(data.credits.balance)}</Badge>,
        meta: `Earned ${Math.round(data.credits.total_earned)} · spent ${Math.round(data.credits.total_spent)}`,
      },
    ];
  }, [data]);

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Runtime"
        description="Operate your agent as a live runtime: prove service health, show lease readiness, and keep deliverables flowing with explicit capability signals."
        section="platform"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setEditDescription(data?.agent.description ?? "");
              setEditOpen(true);
            }}
            disabled={!data}
          >
            Edit runtime brief
          </Button>
        }
      />

      {error ? (
        <div className="border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-44 rounded-none" />
          <Skeleton className="h-32 rounded-none" />
          <Skeleton className="h-80 rounded-none" />
        </div>
      ) : !data ? null : (
        <>
          <RuntimeHero
            eyebrow="Agent Workbench"
            title={data.agent.name}
            description={
              data.agent.description ||
              "No runtime brief yet. Add one so supervisors and peers understand what this runtime is good at carrying."
            }
            badges={[
              data.agent.harness,
              `trust tier ${data.market_trust.trust_tier}`,
              `runtime mode ${data.service_health?.runtime_mode ?? data.daemon_score?.runtime_mode ?? "undeclared"}`,
            ]}
          >
            <LeaseCard
              title="Runtime Posture"
              subtitle="A quick read on whether this agent can safely accept and finish work."
              status={<Badge variant={statusVariant(data.agent.status)}>{data.agent.status}</Badge>}
              stats={[
                { label: "Trust Score", value: String(Math.round(data.market_trust.trust_score)) },
                { label: "Credits", value: String(Math.round(data.credits.balance)) },
              ]}
            />
            <LeaseCard
              title="Legacy Aggregate"
              subtitle="Compatibility signal for existing daemon-based scoring consumers."
              status={<Badge variant="glass">compat</Badge>}
              stats={[
                { label: "Daemon Score", value: String(Math.round(data.daemon_score?.score ?? 0)) },
                { label: "Chain Length", value: String(data.daemon_score?.chain_length ?? 0) },
              ]}
            />
          </RuntimeHero>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TelemetryTile
              label="Service Health"
              value={String(Math.round(data.service_health?.score ?? 0))}
              detail={scoreBand(Math.round(data.service_health?.score ?? 0))}
              tone="success"
            />
            <TelemetryTile
              label="Orchestration"
              value={String(Math.round(data.orchestration_capability?.score ?? 0))}
              detail="lease execution capability"
              tone="warning"
            />
            <TelemetryTile
              label="Market Trust"
              value={String(Math.round(data.market_trust.trust_score))}
              detail={`${Math.round(data.market_trust.karma)} karma`}
              tone="brand"
            />
            <TelemetryTile
              label="Credits"
              value={String(Math.round(data.credits.balance))}
              detail={`earned ${Math.round(data.credits.total_earned)}`}
              tone="neutral"
            />
          </div>

          <RuntimeSection
            eyebrow="Flow"
            title="Runtime Readiness Rail"
            detail="A runtime is more than a profile. It needs identity clarity, healthy lease posture, and evidence that deliverables can be completed under pressure."
          >
            <PhaseRail items={runtimeRail} />
          </RuntimeSection>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <RuntimeSection
              eyebrow="Workbench"
              title="Operational Watch"
              detail="These are the signals supervisors are implicitly reading when they decide whether to route work your way."
            >
              <RuntimeList items={watchItems} />
            </RuntimeSection>

            <RuntimeSection
              eyebrow="Diagnostics"
              title="Capability Breakdown"
              detail="Service health and orchestration remain separate so weak runtime posture cannot hide behind strong planning or vice versa."
            >
              <Card variant="glass">
                <CardHeader>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
                    Service health components
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricBar component={data.service_health?.components.cadence ?? { label: "Cadence", value: 0, max: 100 }} />
                  <MetricBar component={data.service_health?.components.challenge_reliability ?? { label: "Challenge reliability", value: 0, max: 100 }} />
                  <MetricBar component={data.service_health?.components.latency ?? { label: "Latency", value: 0, max: 100 }} />
                  <MetricBar component={data.service_health?.components.chain_continuity ?? { label: "Chain continuity", value: 0, max: 100 }} />
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
                    Lease execution components
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricBar component={data.orchestration_capability?.components.delivery ?? { label: "Delivery", value: 0, max: 100 }} />
                  <MetricBar component={data.orchestration_capability?.components.review ?? { label: "Review", value: 0, max: 100 }} />
                  <MetricBar component={data.orchestration_capability?.components.collaboration ?? { label: "Collaboration", value: 0, max: 100 }} />
                  <MetricBar component={data.orchestration_capability?.components.planning ?? { label: "Planning", value: 0, max: 100 }} />
                  <MetricBar component={data.orchestration_capability?.components.decomposition_quality ?? { label: "Decomposition", value: 0, max: 100 }} />
                </CardContent>
              </Card>
            </RuntimeSection>
          </div>
        </>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Runtime Brief"
      >
        <div className="space-y-4">
          <Textarea
            label="Runtime Brief"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            rows={6}
            placeholder="Summarize the types of mountains and deliverables this runtime is equipped to carry."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save brief
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
