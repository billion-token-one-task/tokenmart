"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  Stat,
  StatGrid,
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

export default function TokenHallPage() {
  const token = useAuthToken();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [missingAgentCredits, setMissingAgentCredits] = useState(false);

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
        <Card>
          <CardContent>
            <p className="text-[#666] text-[13px] text-center py-8">
              Please log in to access TokenHall.
            </p>
          </CardContent>
        </Card>
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
        <StatGrid className="mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </StatGrid>
        <Skeleton className="h-64 w-full rounded-xl" />
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

  return (
    <div className="relative">
      <PageHeader
        title="TokenHall"
        description="Run exchange routing for credits, keys, model access, and spend across your live inference stack."
        agentEndpoint="GET /api/v1/tokenhall/models"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.06)] px-4 py-3 text-[13px] text-[#EE4444] font-mono">
          <span className="font-medium mr-2">err</span>
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-6 rounded-lg border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.06)] px-4 py-3 text-[13px] text-[#F5A623] font-mono">
          <span className="font-medium mr-2">warn</span>
          {warning}
        </div>
      )}

      {missingAgentCredits && (
        <div className="mb-6 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[13px] text-[#a1a1a1]">
          Register an agent to activate settlement-ready balances. Model discovery and key management stay available in the meantime.
        </div>
      )}

      {/* Stats */}
      <StatGrid className="mb-8">
        <Card variant="glass">
          <CardContent>
            <Stat
              label="Credit Balance"
              value={credits ? `${toCreditNumber(credits.balance).toLocaleString()} cr` : "--"}
            />
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <Stat label="Models Available" value={models.length} />
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <Stat label="Active Keys" value={keys.length} />
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <Stat
              label="Total Spent"
              value={
                credits ? `${toCreditNumber(credits.total_spent).toLocaleString()} cr` : "--"
              }
            />
          </CardContent>
        </Card>
      </StatGrid>

      {/* Quick Start */}
      <Card variant="glass" className="mb-8 overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[rgba(0,112,243,0.1)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="text-[15px] font-medium text-[#ededed]">
              Quick start
            </h2>
          </div>
          <span className="text-[12px] text-[#444] font-mono">
            chat/completions
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[#666]">
            Use any OpenAI-compatible client to call 400+ LLM models
          </p>
        </div>
        <div className="border-t border-[rgba(255,255,255,0.08)] bg-black rounded-none rounded-b-xl">
          <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EE4444]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#50e3c2]" />
            </div>
            <span className="text-[11px] text-[#444] ml-1 font-mono">
              quick_start.sh
            </span>
          </div>
          <pre className="p-5 text-[13px] text-[#a1a1a1] font-mono overflow-x-auto leading-relaxed">
            <code>{curlExample}</code>
          </pre>
        </div>
      </Card>

      {/* Supported Formats */}
      <Card variant="glass" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
          <h2 className="text-[15px] font-medium text-[#ededed]">
            Supported formats
          </h2>
          <p className="text-[13px] text-[#444] mt-1">
            TokenHall supports multiple API formats out of the box
          </p>
        </div>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-[rgba(255,255,255,0.08)] rounded-[8px] bg-[#0a0a0a] p-5 hover:border-[rgba(255,255,255,0.14)] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info">OpenAI</Badge>
              </div>
              <h3 className="text-[15px] font-medium text-[#ededed] mb-1.5">
                OpenAI-compatible
              </h3>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Drop-in replacement for the OpenAI API. Use any
                OpenAI-compatible SDK or client library.
              </p>
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] rounded-[8px] bg-[#0a0a0a] p-5 hover:border-[rgba(255,255,255,0.14)] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">Anthropic</Badge>
              </div>
              <h3 className="text-[15px] font-medium text-[#ededed] mb-1.5">
                Anthropic Messages
              </h3>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Native support for the Anthropic Messages API format. Use
                Claude models with the native API.
              </p>
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] rounded-[8px] bg-[#0a0a0a] p-5 hover:border-[rgba(255,255,255,0.14)] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="success">Streaming</Badge>
              </div>
              <h3 className="text-[15px] font-medium text-[#ededed] mb-1.5">
                SSE streaming
              </h3>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Full Server-Sent Events streaming support for real-time token
                generation across all models.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
