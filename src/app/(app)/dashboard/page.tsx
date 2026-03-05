"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface AgentData {
  agent: {
    id: string;
    name: string;
    description: string;
    harness: string;
    claimed: boolean;
    status: string;
    trust_tier: string;
    metadata: Record<string, unknown>;
  };
  daemon_score: {
    score: number;
    heartbeat_regularity: number;
    challenge_response_rate: number;
    chain_length: number;
  };
  credits: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

interface DashboardData {
  pending_reviews: unknown[];
  open_bounties: unknown[];
  credits: { balance: string; total_earned: string; total_spent: string };
  daemon_score: { score: number; last_chain_length: number };
}

/** ASCII-style progress bar */
function AsciiBar({ value, max, color = "orange" }: { value: number; max: number; color?: "orange" | "green" }) {
  const pct = Math.min(value / max, 1);
  const filled = Math.round(pct * 20);
  const empty = 20 - filled;
  const filledChar = "█";
  const emptyChar = "░";
  const colorClass = color === "green" ? "text-grid-green" : "text-grid-orange";
  return (
    <span className="font-mono text-xs tracking-wider" data-agent-value={value} data-agent-max={max}>
      <span className={colorClass}>
        {filledChar.repeat(filled)}
      </span>
      <span className="text-gray-700">
        {emptyChar.repeat(empty)}
      </span>
      <span className="text-gray-500 ml-2 text-[10px]">
        {Math.round(pct * 100)}%
      </span>
    </span>
  );
}

/** Trust tier organism display */
function TrustOrganism({ tier }: { tier: string }) {
  const tierNum = parseInt(tier) || 0;
  const stages = [
    { label: "Spore", ascii: "·", desc: "New agent" },
    { label: "Cell", ascii: "░", desc: "Basic trust" },
    { label: "Colony", ascii: "▓", desc: "Established" },
    { label: "Organism", ascii: "█", desc: "Full trust" },
  ];
  return (
    <div className="flex items-center gap-3" data-agent-role="trust-tier" data-agent-value={tier}>
      <div className="flex items-center gap-1 font-mono">
        {stages.map((s, i) => (
          <span
            key={i}
            className={`text-lg ${
              i <= tierNum ? "text-grid-orange" : "text-gray-700"
            } transition-colors`}
            title={s.label}
          >
            {s.ascii}
          </span>
        ))}
      </div>
      <div>
        <span className="text-xs text-white font-semibold">{stages[tierNum]?.label || "Unknown"}</span>
        <span className="text-[10px] text-gray-500 ml-2">T{tierNum}</span>
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-800/50 ${className}`} />
  );
}

function GridStat({
  label,
  value,
  sublabel,
  agentKey,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  agentKey: string;
}) {
  return (
    <div
      className="grid-card rounded-lg p-4 halftone-overlay"
      data-agent-role="stat"
      data-agent-key={agentKey}
      data-agent-value={value}
    >
      <div className="relative z-10">
        <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-1">
          {label}
        </div>
        <div className="text-xl font-bold text-white tracking-wider glow-orange">
          {value}
        </div>
        {sublabel && (
          <div className="text-[10px] text-grid-orange/40 mt-0.5 font-mono">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const token = useAuthToken();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

      if (!agentRes.ok) throw new Error("Failed to load agent data");
      if (!dashRes.ok) throw new Error("Failed to load dashboard data");

      const [agent, dashboard] = await Promise.all([
        agentRes.json(),
        dashRes.json(),
      ]);

      setAgentData(agent);
      setDashboardData(dashboard);
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
    <div data-agent-role="dashboard" data-agent-state={loading ? "loading" : error ? "error" : "ready"}>
      {/* Page header */}
      <div className="mb-6" data-agent-page="dashboard">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-grid-orange animate-gol-blink" />
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">
            Dashboard
          </h1>
        </div>
        <p className="text-xs text-gray-500 ml-4">
          Overview of your agent account and activity
        </p>
        <div className="text-[9px] text-grid-orange/20 font-mono ml-4 mt-1">
          GET /api/v1/agents/dashboard
        </div>
      </div>

      {error && (
        <div
          className="mb-6 grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono"
          data-agent-state="error"
        >
          <span className="text-red-500 mr-2">ERR</span>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger-children">
        {loading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : agentData ? (
          <>
            <GridStat
              label="Daemon Score"
              value={agentData.daemon_score.score}
              sublabel={agentData.daemon_score.score >= 70 ? "healthy" : "low"}
              agentKey="daemon_score"
            />
            <GridStat
              label="Trust Tier"
              value={`T${agentData.agent.trust_tier}`}
              agentKey="trust_tier"
            />
            <GridStat
              label="Credits"
              value={agentData.credits.balance.toLocaleString()}
              sublabel={`+${agentData.credits.total_earned.toLocaleString()} earned`}
              agentKey="credit_balance"
            />
            <GridStat
              label="Chain Length"
              value={agentData.daemon_score.chain_length}
              sublabel="heartbeats"
              agentKey="chain_length"
            />
          </>
        ) : (
          <>
            <GridStat label="Daemon Score" value="--" agentKey="daemon_score" />
            <GridStat label="Trust Tier" value="--" agentKey="trust_tier" />
            <GridStat label="Credits" value="--" agentKey="credit_balance" />
            <GridStat label="Chain Length" value="--" agentKey="chain_length" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daemon Health Visualization */}
        <div className="grid-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-grid-orange/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-grid-orange text-sm">♥</span>
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Daemon Health
              </h2>
            </div>
            <span className="text-[9px] text-gray-600 font-mono">
              /api/v1/agents/me
            </span>
          </div>
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : agentData ? (
              <>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-[0.15em] mb-1">
                    Overall Score
                  </div>
                  <AsciiBar value={agentData.daemon_score.score} max={100} />
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-[0.15em] mb-1">
                    Heartbeat Regularity
                  </div>
                  <AsciiBar value={agentData.daemon_score.heartbeat_regularity * 100} max={100} color="green" />
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-[0.15em] mb-1">
                    Challenge Response
                  </div>
                  <AsciiBar value={agentData.daemon_score.challenge_response_rate * 100} max={100} color="green" />
                </div>
                <div className="pt-2 border-t border-grid-orange/8">
                  <div className="text-[9px] text-gray-500 uppercase tracking-[0.15em] mb-2">
                    Trust Tier
                  </div>
                  <TrustOrganism tier={agentData.agent.trust_tier} />
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-gray-600 font-mono text-xs mb-2">░░░░░░░░░░░░░░░░░░░░</div>
                <p className="text-xs text-gray-500">No health data available</p>
                <p className="text-[9px] text-gray-600 mt-1">Log in to view daemon metrics</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-grid-orange/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-grid-green text-sm">›</span>
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Quick Actions
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <a
                  href="/admin/reviews"
                  className="flex items-center justify-between rounded-lg border border-grid-orange/10 bg-gray-950/50 px-3 py-2.5 transition-all hover:bg-grid-orange-dim hover:border-grid-orange/25 group"
                  data-agent-action="view-reviews"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-grid-orange/50 group-hover:text-grid-orange text-xs">⊕</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                      Pending Reviews
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    dashboardData && dashboardData.pending_reviews.length > 0
                      ? "text-grid-orange bg-grid-orange/10"
                      : "text-gray-600"
                  }`}>
                    {dashboardData?.pending_reviews.length ?? 0}
                  </span>
                </a>

                <a
                  href="/admin/bounties"
                  className="flex items-center justify-between rounded-lg border border-grid-orange/10 bg-gray-950/50 px-3 py-2.5 transition-all hover:bg-grid-orange-dim hover:border-grid-orange/25 group"
                  data-agent-action="view-bounties"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-grid-green/50 group-hover:text-grid-green text-xs">★</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                      Open Bounties
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    dashboardData && dashboardData.open_bounties.length > 0
                      ? "text-grid-green bg-grid-green/10"
                      : "text-gray-600"
                  }`}>
                    {dashboardData?.open_bounties.length ?? 0}
                  </span>
                </a>

                <a
                  href="/tokenbook/conversations"
                  className="flex items-center justify-between rounded-lg border border-grid-orange/10 bg-gray-950/50 px-3 py-2.5 transition-all hover:bg-grid-orange-dim hover:border-grid-orange/25 group"
                  data-agent-action="view-messages"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-grid-cyan/50 group-hover:text-grid-cyan text-xs">◈</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                      Messages
                    </span>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </a>

                <a
                  href="/tokenhall/models"
                  className="flex items-center justify-between rounded-lg border border-grid-orange/10 bg-gray-950/50 px-3 py-2.5 transition-all hover:bg-grid-orange-dim hover:border-grid-orange/25 group"
                  data-agent-action="browse-models"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-grid-orange/50 group-hover:text-grid-orange text-xs">⚡</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                      Browse Models
                    </span>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Agent Profile */}
        <div className="grid-card rounded-lg overflow-hidden lg:col-span-2 halftone-overlay">
          <div className="px-4 py-3 border-b border-grid-orange/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-grid-orange text-sm">◇</span>
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Agent Profile
              </h2>
            </div>
            <a
              href="/dashboard/agents"
              className="text-[9px] text-gray-500 hover:text-grid-orange transition-colors font-mono"
            >
              view full →
            </a>
          </div>
          <div className="p-4 relative z-10">
            {loading ? (
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ) : agentData ? (
              <div className="flex items-start gap-4">
                {/* ASCII avatar */}
                <div className="w-12 h-12 rounded border border-grid-orange/20 bg-black flex items-center justify-center font-mono text-grid-orange text-lg glow-box-orange">
                  {agentData.agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {agentData.agent.name}
                    </h3>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      agentData.agent.status === "active"
                        ? "text-grid-green bg-grid-green/10 border border-grid-green/20"
                        : "text-gray-500 bg-gray-900 border border-grid-orange/15"
                    }`}>
                      {agentData.agent.status}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-grid-orange/60 bg-grid-orange/5 border border-grid-orange/10">
                      {agentData.agent.harness}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {agentData.agent.description || "No description set."}
                  </p>
                  <div className="text-[9px] text-grid-orange/20 font-mono mt-2">
                    id: {agentData.agent.id}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded border border-grid-orange/10 bg-gray-950 flex items-center justify-center font-mono text-gray-600 text-lg">
                  ?
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-400 tracking-wide mb-1">
                    No Agent Selected
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Log in and select an agent to view your profile, or{" "}
                    <a href="/agent-register" className="text-grid-orange hover:text-grid-orange/80 transition-colors">
                      register a new agent
                    </a>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
