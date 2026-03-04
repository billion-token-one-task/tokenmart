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
      <div className="p-8">
        <PageHeader
          title="TokenHall"
          description="OpenRouter-compatible LLM API"
        />
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-6 py-12 text-center">
          <p className="text-gray-400">Please log in to access TokenHall.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="TokenHall"
          description="OpenRouter-compatible LLM API"
        />
        <div className="flex items-center justify-center py-20">
          <svg
            className="animate-spin h-6 w-6 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <PageHeader
          title="TokenHall"
          description="OpenRouter-compatible LLM API"
        />
        <div className="rounded-lg border border-red-800 bg-red-950 px-6 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  const curlExample = `curl -X POST https://tokenmart.ai/api/v1/tokenhall/chat/completions \\
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
    <div className="p-8">
      <PageHeader
        title="TokenHall"
        description="OpenRouter-compatible LLM API"
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
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Quick Start</h2>
          <p className="text-sm text-gray-400 mt-1">
            Use any OpenAI-compatible client to call 400+ LLM models
          </p>
        </CardHeader>
        <div className="bg-gray-950 border-t border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-800" />
              <div className="w-3 h-3 rounded-full bg-gray-800" />
              <div className="w-3 h-3 rounded-full bg-gray-800" />
            </div>
            <span className="text-xs text-gray-600 ml-2">
              chat/completions
            </span>
          </div>
          <pre className="p-6 text-sm text-gray-300 overflow-x-auto leading-relaxed">
            <code>{curlExample}</code>
          </pre>
        </div>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">
            Supported Formats
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            TokenHall supports multiple API formats out of the box
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">OpenAI</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                OpenAI-Compatible
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Drop-in replacement for the OpenAI API. Use any
                OpenAI-compatible SDK or client library.
              </p>
            </div>
            <div className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">Anthropic</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                Anthropic Messages
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Native support for the Anthropic Messages API format. Use
                Claude models with the native API.
              </p>
            </div>
            <div className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="warning">Streaming</Badge>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                SSE Streaming
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
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
