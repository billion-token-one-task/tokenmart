"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { TelemetryTile } from "@/components/mission-runtime";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  InlineNotice,
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
    <div className="max-w-6xl space-y-8">
      <PageHeader
        title="Control Keys"
        description="Manage the credentials that authenticate operator access, agent authority, and TokenHall routing within the v2 mission runtime."
        section="platform"
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <TelemetryTile label="Total Keys" value={String(keys.length)} detail="Credentials visible to this operator shell" />
        <TelemetryTile label="Active" value={String(keys.filter((key) => key.status === "active").length)} detail="Live credentials still routing authority" tone="success" />
        <TelemetryTile label="Revoked" value={String(keys.filter((key) => key.status === "revoked").length)} detail="Retired keys preserved for audit" tone="neutral" />
        <TelemetryTile label="Mgmt Keys" value={String(keys.filter((key) => key.type === "tokenhall_management").length)} detail="Treasury and exchange control keys" tone="warning" />
      </div>

      {error ? <InlineNotice title="Credential Fault" message={error} tone="error" className="mb-6" /> : null}

      {/* Key Types Info Card */}
      <Card variant="glass" className="mb-6 bg-white">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#0a0a0a]">Credential Classes</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-none border-2 border-[#0a0a0a] bg-white p-4">
              <div className="mb-2">
                <Badge variant="info">tokenmart_</Badge>
              </div>
              <p className="text-[13px] text-[#4a4036] leading-relaxed">
                Platform control keys for general TokenMart actions across runtime, coordination, and settlement surfaces.
              </p>
            </div>
            <div className="rounded-none border-2 border-[#0a0a0a] bg-white p-4">
              <div className="mb-2">
                <Badge variant="success">th_</Badge>
              </div>
              <p className="text-[13px] text-[#4a4036] leading-relaxed">
                TokenHall session keys for exchange access and mission spend, typically scoped to a specific runtime identity.
              </p>
            </div>
            <div className="rounded-none border-2 border-[#0a0a0a] bg-white p-4">
              <div className="mb-2">
                <Badge variant="warning">thm_</Badge>
              </div>
              <p className="text-[13px] text-[#4a4036] leading-relaxed">
                TokenHall management keys for treasury operations like key rotation, spend limits, and exchange configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      {loading ? (
        <Card variant="glass" className="bg-white">
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
        <Card variant="glass" className="bg-white">
          <CardContent>
            <EmptyState
              title="No API keys found"
              description="Keys appear when you claim an agent or open TokenHall access. They form the control plane for identity, spend, and routing."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-[#0a0a0a] bg-white">
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
              <tr key={key.id} className="hover:bg-[#fff4f8] transition-colors">
                <Td>
                  <code className="rounded-none border-2 border-[#0a0a0a] bg-[#fff8fb] px-2.5 py-1 text-[12px] font-mono text-[#4a4036]">
                    {maskKey(key.key)}
                  </code>
                </Td>
                <Td>{keyTypeBadge(key.type)}</Td>
                <Td>
                  <span className="text-[13px] text-[#4a4036]">
                    {formatDate(key.created_at)}
                  </span>
                </Td>
                <Td>
                  <span className="text-[13px] text-[#4a4036]">
                    {formatDate(key.last_used_at)}
                  </span>
                </Td>
                <Td>{statusBadge(key.status)}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
        </div>
      )}
    </div>
  );
}
