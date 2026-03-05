"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardContent,
  Stat,
  StatGrid,
  Badge,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface CreditsData {
  balance: number;
  total_purchased: number;
  total_earned: number;
  total_spent: number;
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

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [creditsRes, modelsRes, keysRes] = await Promise.all([
          fetch("/api/v1/tokenhall/credits", { headers: authHeaders(token) }),
          fetch("/api/v1/tokenhall/models", { headers: authHeaders(token) }),
          fetch("/api/v1/tokenhall/keys", { headers: authHeaders(token) }),
        ]);

        if (!creditsRes.ok || !modelsRes.ok || !keysRes.ok) {
          throw new Error("Failed to fetch TokenHall data");
        }

        const [creditsData, modelsData, keysData] = await Promise.all([
          creditsRes.json(),
          modelsRes.json(),
          keysRes.json(),
        ]);

        setCredits(creditsData);
        setModels(modelsData.models || []);
        setKeys(keysData.keys || []);
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
          description="OpenRouter-compatible LLM API"
        />
        <div className="grid-card rounded-lg px-6 py-12 text-center">
          <p className="text-gray-400 text-sm">Please log in to access TokenHall.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="TokenHall"
          description="OpenRouter-compatible LLM API"
        />
        <div className="flex items-center justify-center py-20">
          <div className="text-grid-orange/60 font-mono text-xs animate-pulse-subtle">
            loading...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="TokenHall"
          description="OpenRouter-compatible LLM API"
        />
        <div className="grid-card rounded-lg border-red-900/30 px-4 py-3 text-xs text-red-400 font-mono">
          <span className="text-red-500 mr-2">ERR</span>
          {error}
        </div>
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
    <div>
      <PageHeader
        title="TokenHall"
        description="OpenRouter-compatible LLM API"
        agentEndpoint="GET /api/v1/tokenhall/models"
      />

      {/* Stats */}
      <StatGrid className="mb-8">
        <Card>
          <CardContent>
            <Stat
              label="Credit Balance"
              value={credits ? `${credits.balance.toLocaleString()} cr` : "--"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat label="Models Available" value={models.length} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat label="Active Keys" value={keys.length} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat
              label="Total Spent"
              value={
                credits ? `${credits.total_spent.toLocaleString()} cr` : "--"
              }
            />
          </CardContent>
        </Card>
      </StatGrid>

      {/* Quick Start */}
      <div className="grid-card rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-grid-orange/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-grid-orange text-sm">⚡</span>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Quick Start
            </h2>
          </div>
          <span className="text-[9px] text-gray-600 font-mono">
            chat/completions
          </span>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3">
            Use any OpenAI-compatible client to call 400+ LLM models
          </p>
        </div>
        <div className="bg-gray-950 border-t border-grid-orange/10">
          <div className="px-4 py-2 border-b border-grid-orange/5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-grid-orange/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-grid-green/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            </div>
            <span className="text-[9px] text-gray-600 ml-1 font-mono">
              quick_start.sh
            </span>
          </div>
          <pre className="p-5 text-xs text-gray-300 overflow-x-auto leading-relaxed">
            <code>{curlExample}</code>
          </pre>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="grid-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-grid-orange/10">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
            Supported Formats
          </h2>
          <p className="text-[10px] text-gray-500 mt-1">
            TokenHall supports multiple API formats out of the box
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-grid-orange/10 rounded-lg p-4 hover:border-grid-orange/25 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">OpenAI</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                OpenAI-Compatible
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Drop-in replacement for the OpenAI API. Use any
                OpenAI-compatible SDK or client library.
              </p>
            </div>
            <div className="border border-grid-orange/10 rounded-lg p-4 hover:border-grid-orange/25 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">Anthropic</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                Anthropic Messages
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Native support for the Anthropic Messages API format. Use
                Claude models with the native API.
              </p>
            </div>
            <div className="border border-grid-orange/10 rounded-lg p-4 hover:border-grid-orange/25 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="warning">Streaming</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                SSE Streaming
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Full Server-Sent Events streaming support for real-time token
                generation across all models.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
