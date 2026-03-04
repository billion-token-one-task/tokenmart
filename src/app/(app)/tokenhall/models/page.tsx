"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  Badge,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  pricing: { input: number; output: number };
}

const PROVIDERS = [
  { value: "all", label: "All Providers" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "deepseek", label: "DeepSeek" },
];

function providerVariant(
  provider: string
): "default" | "success" | "warning" | "danger" | "info" | "outline" {
  const map: Record<string, "default" | "success" | "warning" | "danger" | "info" | "outline"> = {
    openai: "success",
    anthropic: "info",
    google: "warning",
    meta: "default",
    deepseek: "outline",
  };
  return map[provider.toLowerCase()] || "default";
}

function formatContextLength(length: number): string {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(1)}M`;
  if (length >= 1_000) return `${(length / 1_000).toFixed(0)}K`;
  return String(length);
}

function formatPricing(price: number): string {
  if (price === 0) return "Free";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

export default function TokenHallModelsPage() {
  const token = useAuthToken();
  const { toast } = useToast();

  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");

  useEffect(() => {
    if (!token) return;

    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/tokenhall/models", {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        setModels(data.models || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load models"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [token]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        !search ||
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.id.toLowerCase().includes(search.toLowerCase()) ||
        model.provider.toLowerCase().includes(search.toLowerCase());

      const matchesProvider =
        provider === "all" ||
        model.provider.toLowerCase() === provider.toLowerCase();

      return matchesSearch && matchesProvider;
    });
  }, [models, search, provider]);

  async function copyModelId(modelId: string) {
    try {
      await navigator.clipboard.writeText(modelId);
      toast(`Copied ${modelId}`, "success");
    } catch {
      toast("Failed to copy model ID", "error");
    }
  }

  if (!token) {
    return (
      <div className="p-8">
        <PageHeader
          title="Models"
          description="Browse available LLM models"
        />
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-6 py-12 text-center">
          <p className="text-gray-400">
            Please log in to browse models.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="Models"
          description="Browse available LLM models"
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
          title="Models"
          description="Browse available LLM models"
        />
        <div className="rounded-lg border border-red-800 bg-red-950 px-6 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Models"
        description="Browse available LLM models"
      />

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search models by name, ID, or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={PROVIDERS}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        </div>
      </div>

      {/* Model count */}
      <p className="text-sm text-gray-500 mb-4">
        {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""}
        {search || provider !== "all" ? " matching filters" : " available"}
      </p>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <EmptyState
          title="No models found"
          description={
            search || provider !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No models are currently available."
          }
          action={
            (search || provider !== "all") ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setProvider("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="hover:border-gray-700 transition-colors">
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {model.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {model.id}
                    </p>
                  </div>
                  <Badge variant={providerVariant(model.provider)}>
                    {model.provider}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-600"
                    >
                      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                    </svg>
                    <span>{formatContextLength(model.context_length)} ctx</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Input: </span>
                      <span className="text-gray-300">
                        {formatPricing(model.pricing.input)}/1M
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Output: </span>
                      <span className="text-gray-300">
                        {formatPricing(model.pricing.output)}/1M
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyModelId(model.id)}
                  >
                    Use model
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
