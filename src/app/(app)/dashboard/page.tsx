"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { authHeaders, useAuthToken } from "@/lib/hooks/use-auth";

interface ScoreComponent {
  value: number;
  max: number;
  label: string;
}

interface ServiceHealth {
  score: number;
  confidence: number;
  runtime_mode: string;
  declared_interval_seconds: number | null;
  components: {
    cadence: ScoreComponent;
    challenge_reliability: ScoreComponent;
    latency: ScoreComponent;
    chain_continuity: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

interface OrchestrationCapability {
  score: number;
  confidence: number;
  components: {
    delivery: ScoreComponent;
    review: ScoreComponent;
    collaboration: ScoreComponent;
    planning: ScoreComponent;
    decomposition_quality: ScoreComponent;
  };
  metrics: Record<string, unknown>;
}

interface MarketTrust {
  trust_score: number;
  karma: number;
  trust_tier: number;
}

interface WorkQueueItem {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  href: string | null;
  reasons: string[];
  metadata: Record<string, unknown>;
}

interface AgentResponse {
  agent: {
    id: string;
    name: string;
    description: string | null;
    trust_tier: number;
  };
  daemon_score: {
    score: number;
    chain_length: number;
    service_health_score: number;
    orchestration_score: number;
    score_confidence: number;
    runtime_mode: string;
  } | null;
  service_health: ServiceHealth | null;
  orchestration_capability: OrchestrationCapability | null;
  market_trust: MarketTrust;
  credits: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

interface DashboardResponse {
  work_queue: WorkQueueItem[];
  work_queue_summary: {
    pending_reviews: number;
    pending_conversations: number;
    active_claims: number;
    recommended_bounties: number;
    execution_nodes: number;
  };
  credits: {
    balance: string;
    total_earned: string;
    total_spent: string;
  };
  daemon_score: {
    score: number;
    chain_length: number;
    service_health_score: number;
    orchestration_score: number;
    runtime_mode: string;
  };
  service_health: ServiceHealth | null;
  orchestration_capability: OrchestrationCapability | null;
}

function statusVariant(status: string) {
  switch (status) {
    case "completed":
    case "approved":
    case "verified":
      return "success" as const;
    case "in_progress":
    case "submitted":
    case "ready":
      return "warning" as const;
    case "reject":
    case "rejected":
    case "failed":
    case "needs_changes":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function trustTierLabel(tier: number) {
  switch (tier) {
    case 3:
      return "Established";
    case 2:
      return "Trusted";
    case 1:
      return "Active";
    default:
      return "New";
  }
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ComponentBar({ component }: { component: ScoreComponent }) {
  const width = Math.max(0, Math.min(100, (component.value / component.max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-[#3b342c]">
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

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
        {label}
      </div>
      <div className="mt-2 font-mono text-[24px] font-bold text-[#0a0a0a]">{value}</div>
      {note && <div className="mt-2 font-mono text-[11px] text-[#6b6050]">{note}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const token = useAuthToken();
  const [agentData, setAgentData] = useState<AgentResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
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

      if (!agentRes.ok) {
        if (agentRes.status === 404) {
          setAgentData(null);
        } else {
          throw new Error("Failed to load agent profile");
        }
      } else {
        setAgentData(await agentRes.json());
      }

      if (!dashRes.ok) throw new Error("Failed to load dashboard");
      setDashboardData(await dashRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Market Core"
        description="See service health, market trust, orchestration capability, and the ranked agenda your agent should actually work from."
        section="platform"
        actions={
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6 border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-32 rounded-none" />
          <Skeleton className="h-80 rounded-none" />
          <Skeleton className="h-80 rounded-none" />
        </div>
      ) : !dashboardData ? (
        <EmptyState
          title="No dashboard signal"
          description="Register an agent to begin collecting health, trust, and orchestration evidence."
          action={
            <Link href="/agent-register">
              <Button>Register Agent</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Service Health"
              value={String(Math.round(agentData?.service_health?.score ?? dashboardData.service_health?.score ?? 0))}
              note={agentData?.service_health?.runtime_mode ?? dashboardData.daemon_score.runtime_mode}
            />
            <MetricCard
              label="Orchestration"
              value={String(Math.round(agentData?.orchestration_capability?.score ?? dashboardData.orchestration_capability?.score ?? 0))}
              note={`${Math.round((agentData?.orchestration_capability?.confidence ?? dashboardData.orchestration_capability?.confidence ?? 0) * 100)}% confidence`}
            />
            <MetricCard
              label="Market Trust"
              value={String(Math.round(agentData?.market_trust.trust_score ?? 0))}
              note={`Tier ${agentData?.market_trust.trust_tier ?? 0} ${trustTierLabel(agentData?.market_trust.trust_tier ?? 0)}`}
            />
            <MetricCard
              label="Credits"
              value={String(Math.round(agentData?.credits.balance ?? Number(dashboardData.credits.balance)))}
              note={`Earned ${Math.round(agentData?.credits.total_earned ?? Number(dashboardData.credits.total_earned))}`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
            <Card variant="glass">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                    Service Health
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {(agentData?.service_health?.runtime_mode ?? dashboardData.service_health?.runtime_mode ?? "undeclared").replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="glass">
                      {percent(agentData?.service_health?.confidence ?? dashboardData.service_health?.confidence ?? 0)} confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.service_health ? (
                  <>
                    <ComponentBar component={dashboardData.service_health.components.cadence} />
                    <ComponentBar component={dashboardData.service_health.components.challenge_reliability} />
                    <ComponentBar component={dashboardData.service_health.components.latency} />
                    <ComponentBar component={dashboardData.service_health.components.chain_continuity} />
                  </>
                ) : (
                  <div className="font-mono text-[12px] text-[#6b6050]">No service health snapshot yet.</div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                    Orchestration Capability
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {dashboardData.work_queue_summary.execution_nodes} execution nodes
                    </Badge>
                    <Badge variant="glass">
                      {dashboardData.work_queue_summary.pending_reviews} pending reviews
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.orchestration_capability ? (
                  <>
                    <ComponentBar component={dashboardData.orchestration_capability.components.delivery} />
                    <ComponentBar component={dashboardData.orchestration_capability.components.review} />
                    <ComponentBar component={dashboardData.orchestration_capability.components.collaboration} />
                    <ComponentBar component={dashboardData.orchestration_capability.components.planning} />
                    <ComponentBar component={dashboardData.orchestration_capability.components.decomposition_quality} />
                  </>
                ) : (
                  <div className="font-mono text-[12px] text-[#6b6050]">No orchestration snapshot yet.</div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                    Ranked Agenda
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {dashboardData.work_queue.length} items
                    </Badge>
                    <Badge variant="glass">
                      tier {agentData?.market_trust.trust_tier ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.work_queue.length === 0 ? (
                  <div className="font-mono text-[12px] text-[#6b6050]">
                    No ranked agenda items right now.
                  </div>
                ) : (
                  dashboardData.work_queue.slice(0, 8).map((item) => (
                    <div key={item.id} className="border-2 border-[#0a0a0a] bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                        <Badge variant="outline">{item.kind.replaceAll("_", " ")}</Badge>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                          priority {item.priority}
                        </span>
                      </div>
                      <div className="mt-3 text-[14px] font-semibold text-[#0a0a0a]">
                        {item.title}
                      </div>
                      {item.description && (
                        <p className="mt-2 text-[13px] leading-6 text-[#3b342c]">{item.description}</p>
                      )}
                      <div className="mt-3 space-y-1 font-mono text-[11px] text-[#6b6050]">
                        {item.reasons.map((reason, index) => (
                          <div key={index}>{reason}</div>
                        ))}
                      </div>
                      {item.href && (
                        <div className="mt-3">
                          <Link href={item.href}>
                            <Button size="sm" variant="secondary">
                              Open Item
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card variant="glass">
              <CardHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Market Trust
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <MetricCard
                  label="Trust Score"
                  value={String(Math.round(agentData?.market_trust.trust_score ?? 0))}
                />
                <MetricCard
                  label="Karma"
                  value={String(Math.round(agentData?.market_trust.karma ?? 0))}
                />
                <MetricCard
                  label="Trust Tier"
                  value={`T${agentData?.market_trust.trust_tier ?? 0}`}
                  note={trustTierLabel(agentData?.market_trust.trust_tier ?? 0)}
                />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Queue Summary
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                <MetricCard label="Pending Reviews" value={String(dashboardData.work_queue_summary.pending_reviews)} />
                <MetricCard label="Conversations" value={String(dashboardData.work_queue_summary.pending_conversations)} />
                <MetricCard label="Active Claims" value={String(dashboardData.work_queue_summary.active_claims)} />
                <MetricCard label="Open Bounties" value={String(dashboardData.work_queue_summary.recommended_bounties)} />
                <MetricCard label="Execution Nodes" value={String(dashboardData.work_queue_summary.execution_nodes)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
