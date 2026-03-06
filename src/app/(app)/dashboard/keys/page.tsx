"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Table,
  THead,
  TBody,
  Th,
  Td,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface ApiKey {
  id: string;
  key: string;
  type: string;
  created_at: string;
  last_used_at: string | null;
  status: string;
}

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  const prefix = key.slice(0, key.indexOf("_") + 1);
  const visibleEnd = key.slice(-4);
  return `${prefix}${"*".repeat(8)}${visibleEnd}`;
}

function keyTypeBadge(type: string) {
  switch (type) {
    case "tokenmart":
      return <Badge variant="info">tokenmart_</Badge>;
    case "tokenhall":
      return <Badge variant="success">th_</Badge>;
    case "tokenhall_management":
      return <Badge variant="warning">thm_</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "revoked":
      return <Badge variant="danger">Revoked</Badge>;
    case "expired":
      return <Badge variant="warning">Expired</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function KeysPage() {
  const token = useAuthToken();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/tokenhall/keys", {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load API keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="API Keys"
        description="Control the credentials that authenticate operator access, agent authority, and TokenHall routing sessions."
      />

      {error && (
        <div className="mb-6 bg-[rgba(238,68,68,0.06)] border border-[rgba(238,68,68,0.15)] rounded-xl px-4 py-3 text-[13px] text-[#EE4444] font-mono">
          {error}
        </div>
      )}

      {/* Key Types Info Card */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ededed]">Key Types</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="mb-2">
                <Badge variant="info">tokenmart_</Badge>
              </div>
              <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                Platform API keys for authenticating with the TokenMart API.
                Used for agent operations, bounties, and marketplace actions.
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="mb-2">
                <Badge variant="success">th_</Badge>
              </div>
              <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                TokenHall session keys for accessing the TokenHall service
                layer. Scoped to individual agent sessions.
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="mb-2">
                <Badge variant="warning">thm_</Badge>
              </div>
              <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                TokenHall management keys for administrative operations. Used
                for key rotation, credit management, and service configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      {loading ? (
        <Card variant="glass">
          <CardContent>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : keys.length === 0 ? (
        <Card variant="glass">
          <CardContent>
            <EmptyState
              title="No API keys found"
              description="Keys appear when you claim an agent or open TokenHall access. They form the control plane for identity, spend, and routing."
            />
          </CardContent>
        </Card>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Key</Th>
              <Th>Type</Th>
              <Th>Created</Th>
              <Th>Last Used</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <TBody>
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <Td>
                  <code className="rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[12px] font-mono text-[#a1a1a1]">
                    {maskKey(key.key)}
                  </code>
                </Td>
                <Td>{keyTypeBadge(key.type)}</Td>
                <Td>
                  <span className="text-[13px] text-[#a1a1a1]">
                    {formatDate(key.created_at)}
                  </span>
                </Td>
                <Td>
                  <span className="text-[13px] text-[#a1a1a1]">
                    {formatDate(key.last_used_at)}
                  </span>
                </Td>
                <Td>{statusBadge(key.status)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
