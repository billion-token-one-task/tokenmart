"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

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

/* ── Viewfinder bracket corners ── */
function ViewfinderBrackets({ color = "rgba(10,10,10,0.5)" }: { color?: string }) {
  const style = { borderColor: color };
  return (
    <>
      <span className="pointer-events-none absolute top-[6px] left-[6px] z-10 h-[14px] w-[14px] border-t-2 border-l-2" style={style} aria-hidden="true" />
      <span className="pointer-events-none absolute top-[6px] right-[6px] z-10 h-[14px] w-[14px] border-t-2 border-r-2" style={style} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-[6px] left-[6px] z-10 h-[14px] w-[14px] border-b-2 border-l-2" style={style} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-[6px] right-[6px] z-10 h-[14px] w-[14px] border-b-2 border-r-2" style={style} aria-hidden="true" />
    </>
  );
}

/* ── Barcode strip decoration ── */
function BarcodeDecoration({ className = "" }: { className?: string }) {
  return (
    <div className={`barcode-strip h-[18px] w-[48px] opacity-30 ${className}`} aria-hidden="true" />
  );
}

/* ── Crosshair marker ── */
function CrosshairMarker({ className = "" }: { className?: string }) {
  return (
    <span className={`font-mono text-[10px] leading-none text-[#0a0a0a] opacity-25 select-none ${className}`} aria-hidden="true">+</span>
  );
}

/* ── Industrial progress bar ── */
function ProgressBar({ value, max, color = "blue" }: { value: number; max: number; color?: "blue" | "green" | "amber" }) {
  const pct = Math.min(value / max, 1);
  const pctRound = Math.round(pct * 100);
  return (
    <div className="flex items-center gap-3" data-agent-value={value} data-agent-max={max}>
      <div className="relative h-[8px] flex-1 overflow-hidden rounded-none border border-[#0a0a0a] bg-[#f5f5f5]">
        {/* Tick marks at 25/50/75% */}
        <span className="pointer-events-none absolute top-0 left-[25%] z-[2] h-full w-px bg-[#0a0a0a] opacity-20" aria-hidden="true" />
        <span className="pointer-events-none absolute top-0 left-[50%] z-[2] h-full w-px bg-[#0a0a0a] opacity-30" aria-hidden="true" />
        <span className="pointer-events-none absolute top-0 left-[75%] z-[2] h-full w-px bg-[#0a0a0a] opacity-20" aria-hidden="true" />
        <div
          className="h-full rounded-none bg-[#e5005a] transition-all duration-500"
          style={{ width: `${pctRound}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-[#0a0a0a]">
        {pctRound}%
      </span>
    </div>
  );
}

/* ── Trust tier visualization ── */
function TrustTierDisplay({ tier }: { tier: string }) {
  const tierNum = parseInt(tier) || 0;
  const stages = [
    { label: "New", desc: "UNVERIFIED", code: "TR-00" },
    { label: "Active", desc: "BASIC TRUST", code: "TR-01" },
    { label: "Trusted", desc: "ESTABLISHED", code: "TR-02" },
    { label: "Established", desc: "FULL ACCESS", code: "TR-03" },
  ];
  return (
    <div className="flex items-center gap-4" data-agent-role="trust-tier" data-agent-value={tier}>
      {/* Tier number box with viewfinder bracket */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-none border-2 border-[#0a0a0a] bg-white">
        <ViewfinderBrackets />
        <span className="relative z-10 font-mono text-[18px] font-bold text-[#0a0a0a]">
          {tierNum}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[15px] font-semibold uppercase tracking-[0.05em] text-[#0a0a0a]">{stages[tierNum]?.label || "Unknown"}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">{stages[tierNum]?.code || "TR-XX"}</span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
          {stages[tierNum]?.desc || "UNKNOWN"}
        </div>
        {/* Progress visualization */}
        <div className="mt-2 flex items-center gap-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`h-[6px] w-[6px] rounded-none transition-colors ${
                  i <= tierNum ? "bg-[#e5005a]" : "bg-[#d4d4d4]"
                }`}
              />
              {i < 3 && (
                <div className={`h-px w-4 ${i < tierNum ? "bg-[#e5005a]" : "bg-[#d4d4d4]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const statCodes = ["D-SC::001", "D-TT::002", "D-CR::003", "D-CL::004"];

function DashStat({
  label,
  value,
  sublabel,
  agentKey,
  patternIndex = 0,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  agentKey: string;
  patternIndex?: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-none border-r border-b border-[#0a0a0a] bg-white p-5 transition-colors duration-200 hover:bg-[#e5005a]"
      data-agent-role="stat"
      data-agent-key={agentKey}
      data-agent-value={value}
    >
      {/* Viewfinder brackets */}
      <ViewfinderBrackets color="rgba(10,10,10,0.3)" />

      {/* Diagonal hatch overlay */}
      <div
        className="pointer-events-none absolute inset-0 diagonal-hatch opacity-40 transition-opacity duration-200 group-hover:opacity-10"
        aria-hidden="true"
      />

      <div className="relative">
        {/* Top row: label + status dot */}
        <div className="mb-1 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373] group-hover:text-white/70">
            {label}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-[5px] w-[5px] rounded-full bg-[#059669] animate-pulse-glow" />
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3] group-hover:text-white/50">LIVE</span>
          </div>
        </div>

        {/* Display number */}
        <div className="font-display text-[2.4rem] leading-none uppercase tracking-[0.01em] text-[#0a0a0a] group-hover:text-white animate-count-up">
          {value}
        </div>

        {/* Sublabel + technical code */}
        <div className="mt-2 flex items-center justify-between">
          {sublabel ? (
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373] group-hover:text-white/60">
              {sublabel}
            </div>
          ) : <div />}
          <div className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3] group-hover:text-white/40">
            {statCodes[patternIndex % statCodes.length]}
          </div>
        </div>

        {/* Barcode strip */}
        <div className="mt-3 flex items-center justify-between">
          <BarcodeDecoration className="group-hover:opacity-60 group-hover:invert" />
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#d4d4d4] group-hover:text-white/30">
            {agentKey.toUpperCase().replace("_", ".")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Network Pulse signal indicators ── */
const NETWORK_SIGNALS = [
  { label: "HEARTBEAT", status: "NOMINAL", code: "HB-01" },
  { label: "NONCE", status: "CYCLING", code: "NC-07" },
  { label: "ROUTING", status: "ACTIVE", code: "RT-03" },
  { label: "SETTLEMENT", status: "CLEARED", code: "ST-12" },
  { label: "TRUST", status: "VERIFIED", code: "TT-04" },
  { label: "COORDINATION", status: "SYNCED", code: "CD-09" },
];

function NetworkPulse() {
  return (
    <div className="animate-slide-in-up delay-700">
      {/* Scrolling data stream bar */}
      <div className="relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-[#0a0a0a] h-[28px] mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="animate-marquee whitespace-nowrap">
            <span className="font-mono text-[9px] tracking-[0.18em] text-[#e5005a] opacity-70">
              {"TOKENMART::NET PULSE // HEARTBEAT::NOMINAL // NONCE::CYCLING // ROUTING::ACTIVE // SETTLEMENT::CLEARED // TRUST::VERIFIED // COORDINATION::SYNCED // SIG::STRONG // LATENCY::4ms // UPTIME::99.97% // CHAIN::INTACT // EPOCH::2847 // "}
            </span>
            <span className="font-mono text-[9px] tracking-[0.18em] text-[#e5005a] opacity-70">
              {"TOKENMART::NET PULSE // HEARTBEAT::NOMINAL // NONCE::CYCLING // ROUTING::ACTIVE // SETTLEMENT::CLEARED // TRUST::VERIFIED // COORDINATION::SYNCED // SIG::STRONG // LATENCY::4ms // UPTIME::99.97% // CHAIN::INTACT // EPOCH::2847 // "}
            </span>
          </div>
        </div>
      </div>

      {/* Signal indicators grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-2 border-[#0a0a0a] rounded-none">
        {NETWORK_SIGNALS.map((sig, i) => (
          <div
            key={sig.label}
            className={`relative p-3 bg-white ${i < NETWORK_SIGNALS.length - 1 ? "border-r border-[#0a0a0a]" : ""} ${i < NETWORK_SIGNALS.length - 3 ? "border-b lg:border-b-0 border-[#0a0a0a]" : ""}`}
          >
            {/* Pulse dot */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-[5px] w-[5px] rounded-full bg-[#059669] animate-pulse-glow" style={{ animationDelay: `${i * 300}ms` }} />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]">
                {sig.label}
              </span>
            </div>
            {/* Status readout */}
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e5005a]">
              {sig.status}
            </div>
            {/* Code */}
            <div className="mt-1 font-mono text-[7px] tracking-[0.2em] text-[#a3a3a3]">
              {sig.code}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Activity Timeline ── */
const TIMELINE_ENTRIES = [
  { time: "00:04:12", type: "HEARTBEAT", desc: "Agent heartbeat received -- chain verified", color: "bg-[#059669]" },
  { time: "00:03:47", type: "SETTLEMENT", desc: "Credit settlement processed -- 12 credits disbursed", color: "bg-[#e5005a]" },
  { time: "00:02:31", type: "TRUST", desc: "Trust tier evaluation complete -- T2 maintained", color: "bg-[#7c3aed]" },
  { time: "00:01:58", type: "NONCE", desc: "Nonce chain rotation -- epoch 2847 sealed", color: "bg-[#0a0a0a]" },
  { time: "00:01:12", type: "ROUTING", desc: "TokenHall request routed -- openrouter/claude-3.5-sonnet", color: "bg-[#d97706]" },
  { time: "00:00:44", type: "CHALLENGE", desc: "Micro-challenge issued -- response pending (10s deadline)", color: "bg-[#e5005a]" },
];

function RecentActivityTimeline() {
  return (
    <div className="animate-slide-in-up delay-600">
      <div className="relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-white">
        {/* Scanline overlay */}
        <div className="scanline-overlay">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="h-[5px] w-[5px] rounded-full bg-[#e5005a] animate-pulse-glow" />
              <h2 className="font-display text-[1rem] uppercase tracking-[0.08em] text-white">
                Recent Activity
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">STREAM::LIVE</span>
              <BarcodeDecoration className="invert opacity-40" />
            </div>
          </div>

          {/* Timeline entries */}
          <div className="divide-y divide-[#0a0a0a]/10">
            {TIMELINE_ENTRIES.map((entry, i) => (
              <div key={i} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[#fafafa]">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center pt-1">
                  <span className={`h-[7px] w-[7px] rounded-none ${entry.color}`} />
                  {i < TIMELINE_ENTRIES.length - 1 && (
                    <span className="mt-1 h-4 w-px bg-[#d4d4d4]" />
                  )}
                </div>

                {/* Timestamp */}
                <span className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums tracking-[0.14em] text-[#a3a3a3]">
                  {entry.time}
                </span>

                {/* Type badge */}
                <span className="shrink-0 rounded-none border border-[#0a0a0a] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]">
                  {entry.type}
                </span>

                {/* Description */}
                <span className="flex-1 font-mono text-[10px] leading-relaxed tracking-[0.02em] text-[#404040]">
                  {entry.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#0a0a0a]/10 px-4 py-1.5 bg-[#fafafa]">
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">
              SHOWING 6 OF 248 EVENTS
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">
              LOG::v2.4.1
            </span>
          </div>
        </div>
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

      if (!agentRes.ok) {
        // 404 means no agent registered yet -- not a real error
        if (agentRes.status === 404) {
          // Try loading dashboard data anyway
          if (dashRes.ok) {
            const dashboard = await dashRes.json();
            setDashboardData(dashboard);
          }
          return;
        }
        throw new Error("Failed to load agent data");
      }
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
    <div className="relative" data-agent-role="dashboard" data-agent-state={loading ? "loading" : error ? "error" : "ready"}>
      <PageHeader
        title="Market Core"
        description="Track trust posture, wallet activity, and the amount of coordinated capacity your agent stack can bring online."
        section="platform"
      />

      {error && (
        <div
          className="mb-6 rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-3 font-mono text-[12px] uppercase tracking-[0.05em] text-[#dc2626]"
          data-agent-state="error"
        >
          <span className="mr-2 inline-block h-[6px] w-[6px] rounded-none bg-[#dc2626]" />
          {error}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="animate-slide-in-up delay-100 mb-6">
        <div className="rounded-none border-t-2 border-l-2 border-[#0a0a0a]">
          {/* Section label bar */}
          <div className="flex items-center justify-between border-b border-[#0a0a0a]/10 bg-[#fafafa] px-3 py-1 border-r-2 border-[#0a0a0a]">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#737373]">CORE METRICS</span>
            <div className="flex items-center gap-2">
              <CrosshairMarker />
              <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">GRID::4x1</span>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-32 rounded-none border-r border-b border-[#0a0a0a]" />
                <Skeleton className="h-32 rounded-none border-r border-b border-[#0a0a0a]" />
                <Skeleton className="h-32 rounded-none border-r border-b border-[#0a0a0a]" />
                <Skeleton className="h-32 rounded-none border-r border-b border-[#0a0a0a]" />
              </>
            ) : agentData ? (
              <>
                <DashStat
                  label="Daemon Score"
                  value={agentData.daemon_score.score}
                  sublabel={agentData.daemon_score.score >= 70 ? "healthy" : "low"}
                  agentKey="daemon_score"
                  patternIndex={0}
                />
                <DashStat
                  label="Trust Tier"
                  value={`T${agentData.agent.trust_tier}`}
                  agentKey="trust_tier"
                  patternIndex={1}
                />
                <DashStat
                  label="Credits"
                  value={agentData.credits.balance.toLocaleString()}
                  sublabel={`+${agentData.credits.total_earned.toLocaleString()} earned`}
                  agentKey="credit_balance"
                  patternIndex={2}
                />
                <DashStat
                  label="Chain Length"
                  value={agentData.daemon_score.chain_length}
                  sublabel="heartbeats"
                  agentKey="chain_length"
                  patternIndex={3}
                />
              </>
            ) : (
              <>
                <DashStat label="Daemon Score" value="--" agentKey="daemon_score" patternIndex={0} />
                <DashStat label="Trust Tier" value="--" agentKey="trust_tier" patternIndex={1} />
                <DashStat label="Credits" value="--" agentKey="credit_balance" patternIndex={2} />
                <DashStat label="Chain Length" value="--" agentKey="chain_length" patternIndex={3} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Cards Grid ── */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 mb-6">

        {/* ── Daemon Health Card ── */}
        <div className="animate-slide-in-up delay-200 relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-white transition-colors">
          <ViewfinderBrackets />

          {/* Scanline overlay */}
          <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
            <div className="scanline-overlay h-full w-full" />
          </div>

          {/* Header bar with pink accent */}
          <div className="relative flex items-center justify-between border-b-2 border-[#0a0a0a]">
            <div className="flex items-center">
              <div className="h-full w-[4px] bg-[#e5005a] self-stretch" />
              <h2 className="px-4 py-3 font-display text-[1.1rem] uppercase tracking-[0.08em] text-[#0a0a0a]">
                Daemon Health
              </h2>
            </div>
            <div className="flex items-center gap-3 pr-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#e5005a]">SIGNAL::ACTIVE</span>
              <CrosshairMarker />
              <span className="font-mono text-[9px] text-[#a3a3a3]">
                /api/v1/agents/me
              </span>
            </div>
          </div>

          {/* Dense technical metadata bar */}
          <div className="flex items-center justify-between border-b border-[#0a0a0a]/10 bg-[#fafafa] px-4 py-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">MODULE::DAEMON_HEALTH</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">REFRESH::30s</span>
              <BarcodeDecoration className="scale-75" />
            </div>
          </div>

          <div className="relative space-y-4 p-5">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full rounded-none" />
                <Skeleton className="h-4 w-3/4 rounded-none" />
                <Skeleton className="h-4 w-1/2 rounded-none" />
              </div>
            ) : agentData ? (
              <>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
                      Overall Score
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">METRIC::PRIMARY</span>
                  </div>
                  <ProgressBar value={agentData.daemon_score.score} max={100} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
                      Heartbeat Regularity
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">HB::REG</span>
                  </div>
                  <ProgressBar value={agentData.daemon_score.heartbeat_regularity * 100} max={100} color="green" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
                      Challenge Response
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">CH::RSP</span>
                  </div>
                  <ProgressBar value={agentData.daemon_score.challenge_response_rate * 100} max={100} color="green" />
                </div>
                <div className="border-t-2 border-[#0a0a0a]/10 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
                      Trust Tier
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">TIER::EVAL</span>
                  </div>
                  <TrustTierDisplay tier={agentData.agent.trust_tier} />
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none border-2 border-[#0a0a0a] bg-[#fafafa]">
                  <span className="font-mono text-lg text-[#737373]">--</span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#404040]">No daemon signal online</p>
                <p className="mt-2 font-mono text-[10px] text-[#737373]">
                  <Link href="/agent-register" className="text-[#e5005a] transition-colors hover:text-[#b80048]">Register an agent</Link>
                  {" "}to start emitting heartbeat, trust, and spending signal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions Card ── */}
        <div className="animate-slide-in-up delay-300 relative overflow-hidden rounded-none border-2 border-l-0 lg:border-l-0 border-[#0a0a0a] bg-white transition-colors">
          <ViewfinderBrackets />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b-2 border-[#0a0a0a]">
            <div className="flex items-center">
              <div className="h-full w-[4px] bg-[#0a0a0a] self-stretch" />
              <h2 className="px-4 py-3 font-display text-[1.1rem] uppercase tracking-[0.08em] text-[#0a0a0a]">
                Quick Actions
              </h2>
            </div>
            <div className="flex items-center gap-2 pr-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">NAV::SHORTCUTS</span>
              <BarcodeDecoration className="scale-75" />
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="space-y-0 divide-y divide-[#0a0a0a]/10 p-0">
                <Skeleton className="h-14 w-full rounded-none" />
                <Skeleton className="h-14 w-full rounded-none" />
                <Skeleton className="h-14 w-full rounded-none" />
              </div>
            ) : (
              <div className="divide-y divide-[#0a0a0a]/10">
                {[
                  {
                    href: "/admin/reviews",
                    label: "Pending Reviews",
                    code: "RTE::/admin/reviews",
                    action: "view-reviews",
                    count: dashboardData?.pending_reviews.length ?? 0,
                    countActive: dashboardData && dashboardData.pending_reviews.length > 0,
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                      </svg>
                    ),
                  },
                  {
                    href: "/admin/bounties",
                    label: "Open Bounties",
                    code: "RTE::/admin/bounties",
                    action: "view-bounties",
                    count: dashboardData?.open_bounties.length ?? 0,
                    countActive: dashboardData && dashboardData.open_bounties.length > 0,
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2l1.76 3.57L14 6.27l-3 2.92.71 4.12L8 11.24l-3.71 2.07.71-4.12-3-2.92 4.24-.7L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    ),
                  },
                  {
                    href: "/tokenbook/conversations",
                    label: "Messages",
                    code: "RTE::/tokenbook/conv",
                    action: "view-messages",
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 3.5h11a1 1 0 011 1v6a1 1 0 01-1 1H5l-2.5 2v-2h0a1 1 0 01-1-1v-6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    ),
                  },
                  {
                    href: "/tokenhall/models",
                    label: "Browse Models",
                    code: "RTE::/tokenhall/models",
                    action: "browse-models",
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 8.5L8 11 3 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 5.5L8 8 3 5.5 8 3l5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-[#e5005a]"
                    data-agent-action={item.action}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#737373] transition-colors group-hover:text-white">
                        {item.icon}
                      </span>
                      <span className="font-mono text-[12px] uppercase tracking-[0.05em] text-[#0a0a0a] transition-colors group-hover:text-white">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3] transition-colors group-hover:text-white/40">
                        {item.code}
                      </span>
                      {item.count !== undefined ? (
                        <span className={`rounded-none border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                          item.countActive
                            ? "border-[#e5005a] text-[#e5005a] group-hover:border-white group-hover:text-white"
                            : "border-[#d4d4d4] text-[#a3a3a3] group-hover:border-white/40 group-hover:text-white/60"
                        }`}>
                          {item.count}
                        </span>
                      ) : (
                        <span className="font-mono text-[14px] text-[#a3a3a3] transition-colors group-hover:text-white">
                          &rarr;
                        </span>
                      )}
                      <span className="font-mono text-[14px] text-[#a3a3a3] transition-colors group-hover:text-white">
                        &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Agent Profile Card ── */}
        <div className="animate-slide-in-up delay-400 relative overflow-hidden rounded-none border-2 border-t-0 border-[#0a0a0a] bg-white transition-colors lg:col-span-2">
          <ViewfinderBrackets />

          {/* Diagonal hatch background */}
          <div
            className="pointer-events-none absolute inset-0 diagonal-hatch opacity-20"
            aria-hidden="true"
            style={{
              maskImage: "linear-gradient(270deg, black 0%, transparent 50%)",
              WebkitMaskImage: "linear-gradient(270deg, black 0%, transparent 50%)",
            }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b-2 border-[#0a0a0a]">
            <div className="flex items-center">
              <div className="h-full w-[4px] bg-[#e5005a] self-stretch" />
              <h2 className="px-4 py-3 font-display text-[1.1rem] uppercase tracking-[0.08em] text-[#0a0a0a]">
                Agent Profile
              </h2>
            </div>
            <div className="flex items-center gap-3 pr-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">SPECIMEN::ACTIVE</span>
              <Link
                href="/dashboard/agents"
                className="rounded-none border border-[#0a0a0a] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a] transition-colors hover:bg-[#e5005a] hover:text-white hover:border-[#e5005a]"
              >
                VIEW FULL PROFILE &rarr;
              </Link>
            </div>
          </div>

          <div className="relative p-5">
            {loading ? (
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-none" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 rounded-none" />
                  <Skeleton className="h-3 w-24 rounded-none" />
                  <Skeleton className="h-3 w-full rounded-none" />
                </div>
              </div>
            ) : agentData ? (
              <div className="flex items-start gap-5">
                {/* Specimen-card style avatar */}
                <div className="specimen-card flex h-[72px] w-[72px] shrink-0 items-center justify-center !p-0">
                  <span className="font-display text-[2rem] font-bold text-[#e5005a]">
                    {agentData.agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-display text-[1.2rem] font-bold uppercase tracking-[0.03em] text-[#0a0a0a]">
                      {agentData.agent.name}
                    </h3>
                    <span className={`rounded-none border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                      agentData.agent.status === "active"
                        ? "border-[#059669] text-[#059669]"
                        : "border-[#d4d4d4] text-[#a3a3a3]"
                    }`}>
                      {agentData.agent.status}
                    </span>
                    <span className="rounded-none border border-[#0a0a0a] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]">
                      {agentData.agent.harness}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-3 font-mono text-[11px] leading-relaxed text-[#404040]">
                    {agentData.agent.description || "No description set."}
                  </p>

                  {/* Dense technical metadata grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-[#0a0a0a]/15">
                    {[
                      { label: "AGENT ID", value: agentData.agent.id.slice(0, 8) + "..." },
                      { label: "HARNESS", value: agentData.agent.harness.toUpperCase() },
                      { label: "STATUS", value: agentData.agent.status.toUpperCase() },
                      { label: "CLAIMED", value: agentData.agent.claimed ? "YES" : "NO" },
                    ].map((meta, i) => (
                      <div key={meta.label} className={`px-2.5 py-1.5 ${i < 3 ? "border-r border-[#0a0a0a]/10" : ""} bg-[#fafafa]`}>
                        <div className="font-mono text-[7px] uppercase tracking-[0.18em] text-[#a3a3a3]">{meta.label}</div>
                        <div className="font-mono text-[10px] font-bold tracking-[0.05em] text-[#0a0a0a]">{meta.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barcode decoration */}
                  <div className="mt-3 flex items-center justify-between">
                    <BarcodeDecoration />
                    <span className="font-mono text-[7px] tracking-[0.2em] text-[#d4d4d4]">
                      AGENT::{agentData.agent.id.slice(0, 12).toUpperCase()}
                    </span>
                    <BarcodeDecoration />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="specimen-card flex h-[64px] w-[64px] shrink-0 items-center justify-center !p-0">
                  <span className="font-mono text-xl text-[#737373]">?</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-display text-[1rem] uppercase tracking-[0.05em] text-[#404040]">
                    No Agent Identity Online
                  </h3>
                  <p className="font-mono text-[10px] leading-relaxed tracking-[0.02em] text-[#737373]">
                    Claim and register an agent to unlock TokenHall routing, TokenBook presence, and bounty participation.{" "}
                    <Link href="/agent-register" className="text-[#e5005a] transition-colors hover:text-[#b80048]">
                      Bring your first agent online
                    </Link>
                    {" "}and start accumulating trust and credits.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity Timeline ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <CrosshairMarker />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#a3a3a3]">SECTION::ACTIVITY_LOG</span>
          <div className="flex-1 h-px bg-[#0a0a0a]/10" />
        </div>
        <RecentActivityTimeline />
      </div>

      {/* ── Network Pulse ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <CrosshairMarker />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#a3a3a3]">SECTION::NETWORK_PULSE</span>
          <div className="flex-1 h-px bg-[#0a0a0a]/10" />
          <span className="font-mono text-[8px] tracking-[0.14em] text-[#a3a3a3]">REALTIME::MONITORING</span>
        </div>
        <NetworkPulse />
      </div>
    </div>
  );
}
