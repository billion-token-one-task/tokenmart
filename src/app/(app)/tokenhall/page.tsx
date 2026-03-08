"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Skeleton,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";
import {
  fetchJsonResult,
  isMissingAgentResponse,
} from "@/lib/http/client-json";

interface CreditsData {
  balance: number | string;
  total_purchased: number | string;
  total_earned: number | string;
  total_spent: number | string;
  has_agent?: boolean;
  scope?: "agent" | "account";
  agent_count?: number;
}

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  pricing: { input: number; output: number };
}

interface KeyItem {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  rate_limit_rpm: number;
  credit_limit: number;
  created_at: string;
  last_used_at: string | null;
}

/* ── viewfinder bracket helper ── */
function VF({ className = "" }: { className?: string }) {
  return (
    <>
      <span className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#0a0a0a] pointer-events-none z-10 ${className}`} />
      <span className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#0a0a0a] pointer-events-none z-10 ${className}`} />
      <span className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#0a0a0a] pointer-events-none z-10 ${className}`} />
      <span className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#0a0a0a] pointer-events-none z-10 ${className}`} />
    </>
  );
}

/* ── tiny barcode decoration ── */
function BarcodeStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-[1px] items-end h-3 opacity-40 ${className}`}>
      {[3,7,2,5,8,3,6,2,7,4,3,8,2,5,7,3,6,4,2,8].map((h, i) => (
        <div key={i} className="w-[1px] bg-[#0a0a0a]" style={{ height: `${h * 1.2}px` }} />
      ))}
    </div>
  );
}

/* ── exchange status indicator ── */
function StatusDot({ color }: { color: "green" | "pink" }) {
  return (
    <span className="relative flex h-2 w-2 mr-1.5">
      <span className={`absolute inline-flex h-full w-full rounded-none animate-ping opacity-50 ${color === "green" ? "bg-green-500" : "bg-[#E5005A]"}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-none ${color === "green" ? "bg-green-500" : "bg-[#E5005A]"}`} />
    </span>
  );
}

export default function TokenHallPage() {
  const token = useAuthToken();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [missingAgentCredits, setMissingAgentCredits] = useState(false);
  const [copied, setCopied] = useState(false);

  const toCreditNumber = (value: number | string): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      setWarning(null);
      setMissingAgentCredits(false);
      try {
        const [creditsResult, modelsResult, keysResult] = await Promise.all([
          fetchJsonResult<CreditsData>("/api/v1/tokenhall/credits", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ models?: ModelItem[] }>("/api/v1/tokenhall/models", {
            headers: authHeaders(token),
          }),
          fetchJsonResult<{ keys?: KeyItem[] }>("/api/v1/tokenhall/keys", {
            headers: authHeaders(token),
          }),
        ]);

        const warnings: string[] = [];

        if (modelsResult.ok) {
          setModels(modelsResult.data?.models ?? []);
        } else {
          setModels([]);
          warnings.push(modelsResult.errorMessage ?? "Failed to load models");
        }

        if (keysResult.ok) {
          setKeys(keysResult.data?.keys ?? []);
        } else {
          setKeys([]);
          warnings.push(keysResult.errorMessage ?? "Failed to load keys");
        }

        if (creditsResult.ok && creditsResult.data) {
          const nextCredits = creditsResult.data;
          setCredits(nextCredits);
          setMissingAgentCredits(nextCredits.has_agent === false);
        } else {
          setCredits(null);
          const isMissingAgentCreditsError = isMissingAgentResponse(
            creditsResult.status,
            creditsResult.errorMessage
          );
          if (isMissingAgentCreditsError) {
            setMissingAgentCredits(true);
          } else {
            warnings.push(
              creditsResult.errorMessage ?? "Failed to load credits summary"
            );
          }
        }

        if (!creditsResult.ok && !modelsResult.ok && !keysResult.ok) {
          setError(warnings.join(" · ") || "Failed to fetch TokenHall data");
        } else if (warnings.length > 0) {
          setWarning(warnings.join(" · "));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (!token) {
    return (
      <div>
        <PageHeader
          title="TokenHall"
          description="Open the exchange layer for routing credits into live inference across models, providers, and agent workloads."
        />
        <div className="border-2 border-[#0a0a0a] rounded-none bg-white relative">
          <VF />
          <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/60">
            AUTH::REQUIRED // Please log in to access TokenHall exchange terminal
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="TokenHall"
          description="Open the exchange layer for routing credits into live inference across models, providers, and agent workloads."
        />
        {/* Exchange status skeleton */}
        <div className="border-2 border-[#0a0a0a] rounded-none mb-6 p-3">
          <Skeleton className="h-4 w-full rounded-none" />
        </div>
        {/* Stats skeleton */}
        <div className="border-2 border-[#0a0a0a] rounded-none mb-6 grid grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-5 ${i < 3 ? "border-r-2 border-[#0a0a0a]" : ""}`}>
              <Skeleton className="h-3 w-24 mb-3 rounded-none" />
              <Skeleton className="h-7 w-32 rounded-none" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  const curlExample = `curl -X POST https://www.tokenmart.net/api/v1/tokenhall/chat/completions \\
  -H "Authorization: Bearer th_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      { "role": "user", "content": "Hello, world!" }
    ],
    "stream": true
  }'`;

  const curlLines = curlExample.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* placeholder model data for the preview grid */
  const previewModels = [
    { name: "GPT-4o", provider: "OpenAI", ctx: "128K", priceIn: "$2.50", priceOut: "$10.00", code: "OAI-4O" },
    { name: "Claude 3.5 Sonnet", provider: "Anthropic", ctx: "200K", priceIn: "$3.00", priceOut: "$15.00", code: "ANT-S35" },
    { name: "Gemini 1.5 Pro", provider: "Google", ctx: "2M", priceIn: "$1.25", priceOut: "$5.00", code: "GGL-G15P" },
    { name: "Llama 3.1 405B", provider: "Meta", ctx: "128K", priceIn: "$0.80", priceOut: "$0.80", code: "MTA-L31" },
    { name: "Mixtral 8x22B", provider: "Mistral", ctx: "64K", priceIn: "$0.65", priceOut: "$0.65", code: "MST-MX22" },
    { name: "DeepSeek V3", provider: "DeepSeek", ctx: "128K", priceIn: "$0.27", priceOut: "$1.10", code: "DSK-V3" },
  ];

  const formatCards = [
    {
      badge: "OpenAI",
      badgeVariant: "info" as const,
      title: "OpenAI-compatible",
      desc: "Drop-in replacement for the OpenAI API. Use any OpenAI-compatible SDK or client library.",
      proto: "PROTO::OAI-v1",
      code: "FMT-001",
    },
    {
      badge: "Anthropic",
      badgeVariant: "outline" as const,
      title: "Anthropic Messages",
      desc: "Native support for the Anthropic Messages API format. Use Claude models with the native API.",
      proto: "PROTO::ANT-v2",
      code: "FMT-002",
    },
    {
      badge: "Streaming",
      badgeVariant: "success" as const,
      title: "SSE streaming",
      desc: "Full Server-Sent Events streaming support for real-time token generation across all models.",
      proto: "PROTO::SSE-v1",
      code: "FMT-003",
    },
  ];

  return (
    <div className="relative">
      <PageHeader
        title="TokenHall"
        description="Run exchange routing for credits, keys, model access, and spend across your live inference stack."
        agentEndpoint="GET /api/v1/tokenhall/models"
      />

      {/* ── Error / Warning / Missing Agent Banners ── */}
      {error && (
        <div className="mb-6 rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-3 font-mono text-[11px] text-[#0a0a0a] animate-fade-in">
          <span className="font-bold text-[#E5005A] mr-2">ERR::0x4F</span>
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-6 rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-3 font-mono text-[11px] text-[#0a0a0a] animate-fade-in">
          <span className="font-bold text-[#E5005A] mr-2">WARN::0x2A</span>
          {warning}
        </div>
      )}

      {missingAgentCredits && (
        <div className="mb-6 rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-3 font-mono text-[11px] text-[#0a0a0a] animate-fade-in">
          <span className="font-bold text-[#E5005A] mr-2">INFO::AGENT_REQ</span>
          Register an agent to activate settlement-ready balances. Model discovery and key management stay available in the meantime.
        </div>
      )}

      {/* ── NEW: Exchange Status Bar ── */}
      <div className="mb-6 border-2 border-[#0a0a0a] rounded-none bg-white relative animate-hero-reveal">
        <VF />
        <div className="grid grid-cols-4">
          {[
            { label: "ROUTING", value: "ACTIVE", dot: "green" as const },
            { label: "SETTLEMENT", value: "LIVE", dot: "green" as const },
            { label: "MODELS", value: `${models.length || 412}`, dot: "green" as const },
            { label: "LATENCY", value: "42ms", dot: "pink" as const },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a] ${i < 3 ? "border-r-2 border-[#0a0a0a]" : ""}`}
            >
              <StatusDot color={item.dot} />
              <span className="text-[#0a0a0a]/50">{item.label}::</span>
              <span className="font-bold">{item.value}</span>
            </div>
          ))}
        </div>
        {/* dense data readout strip */}
        <div className="border-t-2 border-[#0a0a0a] px-4 py-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">
            SYS::EXCHANGE_TERMINAL v4.2.1 // UPTIME::99.97% // REGION::US-EAST-1 // PROTO::gRPC+REST
          </span>
          <BarcodeStrip />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 border-2 border-[#0a0a0a] rounded-none bg-white relative animate-slide-in-up delay-100">
        <VF />
        {/* header strip */}
        <div className="border-b-2 border-[#0a0a0a] px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/50">EXCHANGE::METRICS</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">REF::TH-{new Date().toISOString().slice(0,10).replace(/-/g, "")}</span>
        </div>
        <div className="grid grid-cols-4">
          {[
            {
              label: "CREDIT BALANCE",
              value: credits ? toCreditNumber(credits.balance).toLocaleString() : "--",
              suffix: "CR",
              code: "BAL",
            },
            {
              label: "MODELS AVAILABLE",
              value: models.length.toString(),
              suffix: "",
              code: "MDL",
            },
            {
              label: "ACTIVE KEYS",
              value: keys.length.toString(),
              suffix: "",
              code: "KEY",
            },
            {
              label: "TOTAL SPENT",
              value: credits ? toCreditNumber(credits.total_spent).toLocaleString() : "--",
              suffix: "CR",
              code: "SPD",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`group relative p-5 transition-colors hover:bg-[#E5005A] hover:text-white cursor-default ${i < 3 ? "border-r-2 border-[#0a0a0a]" : ""}`}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/50 group-hover:text-white/70 mb-2">
                {stat.label}
              </div>
              <div className="font-display text-[2rem] leading-none text-[#0a0a0a] group-hover:text-white animate-count-up">
                {stat.value}
                {stat.suffix && (
                  <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40 group-hover:text-white/60">
                    {stat.suffix}
                  </span>
                )}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/25 group-hover:text-white/40">
                METRIC::{stat.code}-{String(i + 1).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW: Supported Models Preview ── */}
      <div className="mb-6 border-2 border-[#0a0a0a] rounded-none bg-white relative animate-slide-in-up delay-200">
        <VF />
        {/* header */}
        <div className="border-b-2 border-[#0a0a0a] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[1.1rem] uppercase tracking-[0.03em] text-[#0a0a0a]">
              Model Registry
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40">
              CATALOG::PREVIEW
            </span>
          </div>
          <div className="flex items-center gap-3">
            <BarcodeStrip />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40">
              {previewModels.length} ENTRIES
            </span>
          </div>
        </div>
        {/* column headers */}
        <div className="grid grid-cols-[1fr_120px_80px_100px_100px_80px] border-b-2 border-[#0a0a0a] bg-[#0a0a0a] text-white">
          {["MODEL", "PROVIDER", "CTX LEN", "$/1M IN", "$/1M OUT", "CODE"].map((col, i) => (
            <div key={i} className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] ${i < 5 ? "border-r border-[#0a0a0a]/30" : ""}`}>
              {col}
            </div>
          ))}
        </div>
        {/* rows */}
        {previewModels.map((m, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_120px_80px_100px_100px_80px] transition-colors hover:bg-[#E5005A] hover:text-white group cursor-default ${i < previewModels.length - 1 ? "border-b border-[#0a0a0a]/20" : ""}`}
          >
            <div className="px-4 py-2.5 font-mono text-[11px] text-[#0a0a0a] group-hover:text-white border-r border-[#0a0a0a]/10 font-bold">
              {m.name}
            </div>
            <div className="px-4 py-2.5 font-mono text-[11px] text-[#0a0a0a]/70 group-hover:text-white/80 border-r border-[#0a0a0a]/10">
              {m.provider}
            </div>
            <div className="px-4 py-2.5 font-mono text-[11px] text-[#0a0a0a]/70 group-hover:text-white/80 border-r border-[#0a0a0a]/10">
              {m.ctx}
            </div>
            <div className="px-4 py-2.5 font-mono text-[11px] text-[#0a0a0a]/70 group-hover:text-white/80 border-r border-[#0a0a0a]/10">
              {m.priceIn}
            </div>
            <div className="px-4 py-2.5 font-mono text-[11px] text-[#0a0a0a]/70 group-hover:text-white/80 border-r border-[#0a0a0a]/10">
              {m.priceOut}
            </div>
            <div className="px-4 py-2.5 font-mono text-[10px] text-[#0a0a0a]/40 group-hover:text-white/60 uppercase tracking-[0.14em]">
              {m.code}
            </div>
          </div>
        ))}
        {/* footer strip */}
        <div className="border-t-2 border-[#0a0a0a] px-4 py-1.5 flex items-center justify-between bg-[#0a0a0a]/[0.03]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">
            REGISTRY::PARTIAL // FULL CATALOG AVAILABLE VIA API // PRICING PER 1M TOKENS
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">
            UPD::{new Date().toISOString().slice(0, 10)}
          </span>
        </div>
      </div>

      {/* ── Quick Start ── */}
      <div className="mb-6 border-2 border-[#0a0a0a] rounded-none bg-white relative overflow-hidden animate-slide-in-up delay-300">
        <VF />
        {/* header */}
        <div className="flex items-center justify-between border-b-2 border-[#0a0a0a] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center border-2 border-[#0a0a0a] rounded-none bg-[#E5005A]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="font-display text-[1.1rem] uppercase tracking-[0.03em] text-[#0a0a0a]">
              Quick Start
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40">
              ENDPOINT::CHAT_COMPLETIONS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <BarcodeStrip />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40">
              v1.0
            </span>
          </div>
        </div>
        {/* description */}
        <div className="px-5 py-3 border-b border-[#0a0a0a]/10 flex items-center justify-between">
          <p className="font-mono text-[11px] text-[#0a0a0a]/70 uppercase tracking-[0.06em]">
            Use any OpenAI-compatible client to call 400+ LLM models through the TokenHall exchange
          </p>
          <span className="font-mono text-[9px] text-[#0a0a0a]/30 uppercase tracking-[0.14em]">
            REQ::POST
          </span>
        </div>
        {/* terminal */}
        <div className="bg-[#0a0a0a] rounded-none">
          {/* terminal chrome */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="h-2.5 w-2.5 rounded-none bg-[#E5005A]" />
                <div className="h-2.5 w-2.5 rounded-none bg-white/30" />
                <div className="h-2.5 w-2.5 rounded-none bg-white/30" />
              </div>
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.14em]">
                TERMINAL::quick_start.sh
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-1 border-2 border-white/20 rounded-none font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 transition-all hover:border-[#E5005A] hover:bg-[#E5005A] hover:text-white"
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-white/80">
            <code>
              {curlLines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none w-8 text-right mr-4 text-white/20 text-[10px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{line}</span>
                </div>
              ))}
              {/* blinking cursor */}
              <div className="flex">
                <span className="select-none w-8 text-right mr-4 text-white/20 text-[10px]">
                  {String(curlLines.length + 1).padStart(2, "0")}
                </span>
                <span className="inline-block w-2 h-[14px] bg-[#E5005A] animate-pulse" />
              </div>
            </code>
          </pre>
          {/* terminal footer */}
          <div className="border-t border-white/10 px-5 py-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              SHELL::ZSH // AUTH::BEARER // STREAM::SSE
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              EXIT::0
            </span>
          </div>
        </div>
      </div>

      {/* ── Supported Formats ── */}
      <div className="border-2 border-[#0a0a0a] rounded-none bg-white relative overflow-hidden animate-slide-in-up delay-400">
        <VF />
        {/* header */}
        <div className="border-b-2 border-[#0a0a0a] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[1.1rem] uppercase tracking-[0.03em] text-[#0a0a0a]">
              Supported Formats
            </h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]/40">
              COMPAT::MULTI-PROTOCOL // AUTO-DETECT ENABLED
            </p>
          </div>
          <BarcodeStrip />
        </div>
        {/* 3-col grid with internal dividers, no gap */}
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {formatCards.map((card, i) => (
            <div
              key={i}
              className={`group relative p-5 transition-colors hover:bg-[#E5005A] hover:text-white cursor-default ${i < formatCards.length - 1 ? "sm:border-r-2 border-b-2 sm:border-b-0 border-[#0a0a0a]" : ""}`}
            >
              {/* viewfinder brackets on hover */}
              <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-transparent group-hover:border-white pointer-events-none z-10 transition-colors" />
              <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-transparent group-hover:border-white pointer-events-none z-10 transition-colors" />
              <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-transparent group-hover:border-white pointer-events-none z-10 transition-colors" />
              <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-transparent group-hover:border-white pointer-events-none z-10 transition-colors" />

              {/* protocol code */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant={card.badgeVariant}>{card.badge}</Badge>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30 group-hover:text-white/50">
                  {card.proto}
                </span>
              </div>
              <h3 className="mb-1.5 text-[15px] font-display uppercase tracking-[0.02em] text-[#0a0a0a] group-hover:text-white">
                {card.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-[#0a0a0a]/60 group-hover:text-white/80 mb-3">
                {card.desc}
              </p>
              {/* barcode + format code */}
              <div className="flex items-center justify-between pt-3 border-t border-[#0a0a0a]/10 group-hover:border-white/20">
                <BarcodeStrip className="group-hover:opacity-60" />
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/20 group-hover:text-white/40">
                  {card.code}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* footer strip */}
        <div className="border-t-2 border-[#0a0a0a] px-4 py-1.5 flex items-center justify-between bg-[#0a0a0a]/[0.03]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">
            FORMAT::AUTO_DETECT // HEADER X-API-FORMAT OPTIONAL // FALLBACK::OPENAI
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]/30">
            SPEC::v1.4
          </span>
        </div>
      </div>
    </div>
  );
}
