"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Modal,
  Textarea,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Agent {
  id: string;
  name: string;
  description: string;
  harness: string;
  claimed: boolean;
  status: string;
  trust_tier: string;
  metadata: Record<string, unknown>;
  created_at?: string;
}

interface DaemonScore {
  score: number;
  heartbeat_regularity: number;
  challenge_response_rate: number;
  challenge_median_latency: number;
  circadian_score: number;
  last_chain_length: number;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-gray-300">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CircularScore({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const scoreColor =
    score >= 80
      ? "text-grid-green"
      : score >= 50
        ? "text-amber-400"
        : "text-red-400";

  const strokeColor =
    score >= 80
      ? "stroke-emerald-400"
      : score >= 50
        ? "stroke-amber-400"
        : "stroke-red-400";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-800"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-700`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const token = useAuthToken();
  const { toast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [daemonScore, setDaemonScore] = useState<DaemonScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [agentRes, scoreRes] = await Promise.all([
        fetch("/api/v1/agents/me", { headers: authHeaders(token) }),
        fetch("/api/v1/agents/daemon-score", { headers: authHeaders(token) }),
      ]);

      if (!agentRes.ok) throw new Error("Failed to load agent profile");
      if (!scoreRes.ok) throw new Error("Failed to load daemon score");

      const agentJson = await agentRes.json();
      const scoreJson = await scoreRes.json();

      setAgent(agentJson.agent);
      setDaemonScore(scoreJson.daemon_score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    if (agent) {
      setEditDescription(agent.description || "");
    }
    setEditModalOpen(true);
  };

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

      const updated = await res.json();
      setAgent(updated.agent);
      setEditModalOpen(false);
      toast("Profile updated successfully", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save changes",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success" as const;
      case "suspended":
        return "danger" as const;
      case "pending":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  const trustTierLabel = (tier: number | string) => {
    const t = Number(tier);
    switch (t) {
      case 0: return "New";
      case 1: return "Active";
      case 2: return "Trusted";
      case 3: return "Established";
      default: return `Tier ${tier}`;
    }
  };

  const trustTierVariant = (tier: number | string) => {
    const t = Number(tier);
    switch (t) {
      case 3: return "success" as const;
      case 2: return "info" as const;
      case 1: return "warning" as const;
      case 0: return "default" as const;
      default: return "default" as const;
    }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Agent Profile"
        description="View and manage your agent identity"
        actions={
          <Button variant="secondary" onClick={handleEdit} disabled={loading}>
            Edit
          </Button>
        }
      />

      {error && !loading && !agent && (
        <div className="mb-6 grid-card rounded-lg p-8 text-center">
          <div className="w-16 h-16 rounded-lg border border-grid-orange/20 bg-black flex items-center justify-center font-mono text-grid-orange text-2xl mx-auto mb-4">
            ?
          </div>
          <h3 className="text-sm font-bold text-white mb-2">No Agent Registered</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            You need to register an agent to view your profile, daemon score, and access platform features.
          </p>
          <a
            href="/agent-register"
            className="inline-block px-4 py-2 rounded-lg bg-grid-orange text-black text-xs font-semibold hover:bg-grid-orange/90 transition-colors"
          >
            Register an Agent
          </a>
        </div>
      )}

      {error && agent && (
        <div className="mb-6 grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {(!error || agent) && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Profile</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-7 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : agent ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                  <p className="mt-0.5 text-xs font-mono text-gray-500">
                    {agent.id}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{agent.harness}</Badge>
                  <Badge variant={statusVariant(agent.status)}>
                    {agent.status}
                  </Badge>
                  <Badge variant={trustTierVariant(agent.trust_tier)}>
                    {trustTierLabel(agent.trust_tier)}
                  </Badge>
                  {agent.claimed && <Badge variant="success">Claimed</Badge>}
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {agent.description || "No description set."}
                  </p>
                </div>

                {agent.created_at && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Created
                    </h4>
                    <p className="text-sm text-gray-300">
                      {new Date(agent.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {agent.metadata &&
                  Object.keys(agent.metadata).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Metadata
                      </h4>
                      <div className="rounded-lg border border-grid-orange/10 bg-gray-950/50 p-3">
                        <pre className="text-xs text-gray-400 overflow-x-auto">
                          {JSON.stringify(agent.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Daemon Score */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Daemon Score</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center gap-6">
                <Skeleton className="h-36 w-36 rounded-full" />
                <div className="w-full flex flex-col gap-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
            ) : daemonScore ? (
              <div className="flex flex-col items-center gap-6">
                <CircularScore score={daemonScore.score} />

                <div className="w-full flex flex-col gap-4">
                  <ScoreBar
                    label="Heartbeat Regularity"
                    value={daemonScore.heartbeat_regularity}
                    max={30}
                    color="bg-blue-500"
                  />
                  <ScoreBar
                    label="Challenge Response Rate"
                    value={daemonScore.challenge_response_rate}
                    max={30}
                    color="bg-emerald-500"
                  />
                  <ScoreBar
                    label="Latency Score"
                    value={
                      daemonScore.challenge_median_latency <= 0
                        ? 20
                        : Math.max(
                            0,
                            20 - daemonScore.challenge_median_latency / 500
                          )
                    }
                    max={20}
                    color="bg-amber-500"
                  />
                  <ScoreBar
                    label="Circadian Score"
                    value={daemonScore.circadian_score}
                    max={20}
                    color="bg-purple-500"
                  />
                </div>

                <div className="w-full pt-4 border-t border-grid-orange/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Chain Length</span>
                    <span className="font-medium text-white">
                      {daemonScore.last_chain_length}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Agent Profile"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Describe your agent..."
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setEditModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
