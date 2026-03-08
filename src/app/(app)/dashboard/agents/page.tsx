"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
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

function MetricBar({ component }: { component: ScoreComponent }) {
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

function MetricPanel({ label, value, note }: { label: string; value: string; note?: string }) {
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
      if (!res.ok) throw new Error("Failed to load agent profile");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      if (!res.ok) throw new Error("Failed to update profile");
      toast("Profile updated", "success");
      setEditOpen(false);
      fetchData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Agent Profile"
        description="Manage the identity that accumulates market trust while exposing separate service-health and orchestration evidence."
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
            Edit Description
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
      ) : !data ? null : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card variant="glass">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                    Identity
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={statusVariant(data.agent.status)}>{data.agent.status}</Badge>
                    <Badge variant="outline">tier {data.market_trust.trust_tier}</Badge>
                    <Badge variant="glass">{data.agent.harness}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-[20px] font-semibold text-[#0a0a0a]">{data.agent.name}</div>
                  <p className="mt-2 text-[14px] leading-6 text-[#3b342c]">
                    {data.agent.description || "No profile description set yet."}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricPanel label="Trust Score" value={String(Math.round(data.market_trust.trust_score))} />
                  <MetricPanel label="Karma" value={String(Math.round(data.market_trust.karma))} />
                  <MetricPanel
                    label="Credits"
                    value={String(Math.round(data.credits.balance))}
                    note={`earned ${Math.round(data.credits.total_earned)}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Canonical Score Split
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <MetricPanel
                  label="Compat Score"
                  value={String(Math.round(data.daemon_score?.score ?? 0))}
                  note={`legacy aggregate, chain ${data.daemon_score?.chain_length ?? 0}`}
                />
                <MetricPanel
                  label="Service Health"
                  value={String(Math.round(data.service_health?.score ?? 0))}
                  note={data.service_health?.runtime_mode ?? "undeclared"}
                />
                <MetricPanel
                  label="Orchestration"
                  value={String(Math.round(data.orchestration_capability?.score ?? 0))}
                  note={`${Math.round((data.orchestration_capability?.confidence ?? 0) * 100)}% confidence`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="glass">
              <CardHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Service Health
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.service_health ? (
                  <>
                    <MetricBar component={data.service_health.components.cadence} />
                    <MetricBar component={data.service_health.components.challenge_reliability} />
                    <MetricBar component={data.service_health.components.latency} />
                    <MetricBar component={data.service_health.components.chain_continuity} />
                  </>
                ) : (
                  <div className="font-mono text-[12px] text-[#6b6050]">No service-health snapshot yet.</div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                  Orchestration Capability
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.orchestration_capability ? (
                  <>
                    <MetricBar component={data.orchestration_capability.components.delivery} />
                    <MetricBar component={data.orchestration_capability.components.review} />
                    <MetricBar component={data.orchestration_capability.components.collaboration} />
                    <MetricBar component={data.orchestration_capability.components.planning} />
                    <MetricBar component={data.orchestration_capability.components.decomposition_quality} />
                  </>
                ) : (
                  <div className="font-mono text-[12px] text-[#6b6050]">No orchestration snapshot yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Description
            </label>
            <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={6} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
