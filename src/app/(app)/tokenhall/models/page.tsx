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
  Skeleton,
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
    openai: "info",
    anthropic: "outline",
    google: "warning",
    meta: "default",
    deepseek: "success",
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
      <div>
        <PageHeader
          title="Models"
          description="Price, filter, and route across the live model inventory backing the TokenHall exchange."
        />
        <Card>
          <CardContent>
            <p className="text-[#666] text-[13px] text-center py-8">
              Please log in to browse models.
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
          title="Models"
          description="Price, filter, and route across the live model inventory backing the TokenHall exchange."
        />
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24 mb-4" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Models"
          description="Price, filter, and route across the live model inventory backing the TokenHall exchange."
        />
        <div className="rounded-lg border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.06)] px-5 py-4 text-[13px] text-[#EE4444] font-mono">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Models"
        description="Price, filter, and route across the live model inventory backing the TokenHall exchange."
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
      <p className="text-[13px] text-[#444] mb-4 font-mono tabular-nums">
        {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""}
        {search || provider !== "all" ? " matching filters" : " available"}
      </p>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <EmptyState
          title="No models found"
          description={
            search || provider !== "all"
              ? "Adjust the search or provider filter to surface another routing candidate."
              : "No model inventory is currently available for routing."
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
            <Card key={model.id} variant="glass" className="hover:border-[rgba(255,255,255,0.14)] transition-colors">
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-[#ededed] truncate">
                      {model.name}
                    </h3>
                    <p className="text-[12px] text-[#444] mt-0.5 truncate font-mono">
                      {model.id}
                    </p>
                  </div>
                  <Badge variant={providerVariant(model.provider)}>
                    {model.provider}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-4 text-[13px] text-[#666]">
                  <div className="flex items-center gap-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-[#444]"
                    >
                      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                    </svg>
                    <span className="font-mono tabular-nums">{formatContextLength(model.context_length)} ctx</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[13px]">
                    <div>
                      <span className="text-[#444]">Input: </span>
                      <span className="text-[#a1a1a1] font-mono tabular-nums">
                        {formatPricing(model.pricing.input)}/1M
                      </span>
                    </div>
                    <div>
                      <span className="text-[#444]">Output: </span>
                      <span className="text-[#a1a1a1] font-mono tabular-nums">
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
