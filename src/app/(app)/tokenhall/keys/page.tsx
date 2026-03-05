"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  Table,
  THead,
  TBody,
  Th,
  Td,
  EmptyState,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useAuthToken,
  authHeaders,
  useSelectedAgentId,
} from "@/lib/hooks/use-auth";

interface PlatformKeyApiItem {
  id: string;
  key_prefix: string;
  label: string | null;
  is_management_key: boolean;
  rate_limit_rpm: number | null;
  credit_limit: number | string | null;
  revoked: boolean;
  created_at: string;
  last_used_at?: string | null;
}

interface PlatformKeyItem {
  id: string;
  name: string;
  prefix: string;
  is_management_key: boolean;
  rate_limit_rpm: number | null;
  credit_limit: number | null;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface CreatedKey {
  id: string;
  name: string | null;
  prefix: string;
  raw_key: string;
  is_management_key: boolean;
  rate_limit_rpm: number | null;
  credit_limit: number | string | null;
  created_at: string;
}

interface ProviderKeyItem {
  id: string;
  provider: string;
  label: string | null;
  scope: "agent" | "account";
  agent_id: string | null;
  account_id: string | null;
  created_at: string;
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

export default function TokenHallKeysPage() {
  const token = useAuthToken();
  const { selectedAgentId, setSelectedAgentId } = useSelectedAgentId();
  const { toast } = useToast();

  const [platformKeys, setPlatformKeys] = useState<PlatformKeyItem[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentInput, setAgentInput] = useState("");

  // Platform key creation
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState("th_");
  const [createRpm, setCreateRpm] = useState("");
  const [createCreditLimit, setCreateCreditLimit] = useState("");
  const [creating, setCreating] = useState(false);

  // Created key display
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [showCreated, setShowCreated] = useState(false);

  // Platform revoke modal
  const [revokeTarget, setRevokeTarget] = useState<PlatformKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Provider BYOK form
  const [providerName, setProviderName] = useState("openrouter");
  const [customProviderName, setCustomProviderName] = useState("");
  const [providerLabel, setProviderLabel] = useState("");
  const [providerSecret, setProviderSecret] = useState("");
  const [providerScope, setProviderScope] = useState<"agent" | "account">("agent");
  const [savingProvider, setSavingProvider] = useState(false);
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);

  useEffect(() => {
    setAgentInput(selectedAgentId ?? "");
    if (!selectedAgentId) {
      setProviderScope("account");
    }
  }, [selectedAgentId]);

  const requestHeaders = useCallback(() => {
    return authHeaders(token, { agentId: selectedAgentId });
  }, [token, selectedAgentId]);

  const fetchAllKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [platformRes, providerRes] = await Promise.all([
        fetch("/api/v1/tokenhall/keys", { headers: requestHeaders() }),
        fetch("/api/v1/tokenhall/provider-keys", { headers: requestHeaders() }),
      ]);

      if (!platformRes.ok) {
        const data = await platformRes.json();
        throw new Error(data.error?.message || "Failed to fetch TokenHall keys");
      }
      if (!providerRes.ok) {
        const data = await providerRes.json();
        throw new Error(data.error?.message || "Failed to fetch provider keys");
      }

      const platformData = await platformRes.json();
      const providerData = await providerRes.json();

      const mappedPlatform = ((platformData.keys as PlatformKeyApiItem[] | undefined) ?? []).map(
        (key) => ({
          id: key.id,
          name: key.label ?? "Untitled key",
          prefix: key.key_prefix,
          is_management_key: key.is_management_key,
          rate_limit_rpm: key.rate_limit_rpm,
          credit_limit: toNumberOrNull(key.credit_limit),
          revoked: key.revoked,
          created_at: key.created_at,
          last_used_at: key.last_used_at ?? null,
        })
      );

      setPlatformKeys(mappedPlatform);
      setProviderKeys((providerData.keys as ProviderKeyItem[] | undefined) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [requestHeaders, token]);

  useEffect(() => {
    fetchAllKeys();
  }, [fetchAllKeys]);

  function persistAgentSelection() {
    const value = agentInput.trim();
    setSelectedAgentId(value || null);
    if (value) {
      toast("Agent context saved", "success");
      setProviderScope("agent");
    } else {
      toast("Agent context cleared", "success");
      setProviderScope("account");
    }
  }

  function clearAgentSelection() {
    setAgentInput("");
    setSelectedAgentId(null);
    setProviderScope("account");
    toast("Agent context cleared", "success");
  }

  async function handleCreatePlatformKey(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !createName.trim()) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: createName.trim(),
        is_management_key: createType === "thm_",
      };
      if (createRpm) body.rate_limit_rpm = Number(createRpm);
      if (createCreditLimit) body.credit_limit = Number(createCreditLimit);

      const res = await fetch("/api/v1/tokenhall/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create key");
      }

      setCreatedKey(data.key as CreatedKey);
      setShowCreated(true);
      setCreateOpen(false);
      setCreateName("");
      setCreateType("th_");
      setCreateRpm("");
      setCreateCreditLimit("");
      toast("TokenHall API key created", "success");
      fetchAllKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create key", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokePlatformKey() {
    if (!token || !revokeTarget) return;

    setRevoking(true);
    try {
      const res = await fetch(`/api/v1/tokenhall/keys/${revokeTarget.id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to revoke key");
      }

      toast("Key revoked", "success");
      setRevokeTarget(null);
      fetchAllKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to revoke key", "error");
    } finally {
      setRevoking(false);
    }
  }

  async function handleSaveProviderKey(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    const resolvedProvider =
      providerName === "custom" ? customProviderName.trim().toLowerCase() : providerName;

    if (!resolvedProvider) {
      toast("Provider is required", "error");
      return;
    }

    if (!providerSecret.trim()) {
      toast("Provider API key is required", "error");
      return;
    }

    if (providerScope === "agent" && !selectedAgentId) {
      toast("Set Agent ID first for agent-scoped BYOK", "error");
      return;
    }

    setSavingProvider(true);
    try {
      const res = await fetch("/api/v1/tokenhall/provider-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify({
          provider: resolvedProvider,
          key: providerSecret.trim(),
          label: providerLabel.trim() || undefined,
          scope: providerScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save provider key");
      }

      setProviderSecret("");
      setProviderLabel("");
      if (providerName === "custom") {
        setCustomProviderName("");
      }

      toast(data.updated ? "Provider key updated" : "Provider key saved", "success");
      fetchAllKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save provider key", "error");
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleDeleteProviderKey(keyId: string) {
    if (!token) return;

    setDeletingProviderId(keyId);
    try {
      const res = await fetch(`/api/v1/tokenhall/provider-keys/${keyId}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete provider key");
      }

      toast("Provider key deleted", "success");
      fetchAllKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete provider key", "error");
    } finally {
      setDeletingProviderId(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard", "success");
    } catch {
      toast("Failed to copy", "error");
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (!token) {
    return (
      <div>
        <PageHeader
          title="TokenHall Keys"
          pixelFont="grid"
          gradient="gradient-text-success"
        />
        <Card>
          <CardContent>
            <p className="text-[#6b6050] text-[13px] text-center py-8">
              Please log in to manage your keys.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="TokenHall Keys"
        description="Issue spend controls, session credentials, and BYOK routes for TokenHall traffic."
        actions={<Button onClick={() => setCreateOpen(true)}>Create TH Key</Button>}
        pixelFont="grid"
        gradient="gradient-text-success"
      />

      {/* Agent Context */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ede8e0]">Agent context (session auth)</h2>
          <p className="text-[13px] text-[#6b6050] mt-1">
            When using a human session token, set the active agent ID so the backend can resolve ownership.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              label="Selected Agent ID"
              placeholder="UUID (optional)"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
            />
            <div className="flex items-end gap-2">
              <Button onClick={persistAgentSelection}>Save</Button>
              <Button variant="ghost" onClick={clearAgentSelection}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-[rgba(192,72,56,0.2)] bg-[rgba(192,72,56,0.06)] px-5 py-4 text-[13px] text-[#C04838] font-mono mb-6">
          {error}
        </div>
      )}

      {/* Platform Keys */}
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ede8e0]">TokenHall API keys</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : platformKeys.length === 0 ? (
            <EmptyState
              title="No TokenHall keys yet"
              description="Create a th_ or thm_ key to start routing requests and metering credit spend."
              action={<Button onClick={() => setCreateOpen(true)}>Create key</Button>}
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Prefix</Th>
                  <Th>Type</Th>
                  <Th>RPM</Th>
                  <Th>Credit Limit</Th>
                  <Th>Created</Th>
                  <Th>Last Used</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <TBody>
                {platformKeys.map((key) => (
                  <tr key={key.id}>
                    <Td>{key.name}</Td>
                    <Td>
                      <code className="text-[12px] glass-code rounded-md px-2 py-1 text-[#a09080] font-mono">
                        {key.prefix}...
                      </code>
                    </Td>
                    <Td>
                      <Badge variant={key.is_management_key ? "info" : "success"}>
                        {key.is_management_key ? "thm_" : "th_"}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums">
                        {key.rate_limit_rpm ? `${key.rate_limit_rpm}/min` : "Unlimited"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono tabular-nums">
                        {key.credit_limit != null ? `${key.credit_limit.toLocaleString()} cr` : "Unlimited"}
                      </span>
                    </Td>
                    <Td>{formatDate(key.created_at)}</Td>
                    <Td>{formatDate(key.last_used_at)}</Td>
                    <Td>
                      {key.revoked ? <Badge variant="danger">Revoked</Badge> : <Badge variant="success">Active</Badge>}
                    </Td>
                    <Td>
                      <Button variant="danger" size="sm" onClick={() => setRevokeTarget(key)}>
                        Revoke
                      </Button>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Provider BYOK Keys */}
      <Card variant="glass">
        <CardHeader>
          <h2 className="text-[15px] font-medium text-[#ede8e0]">Provider BYOK keys</h2>
          <p className="text-[13px] text-[#6b6050] mt-1">
            Add provider secrets (OpenRouter/OpenAI/Anthropic/etc.) directly in the webapp.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProviderKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Select
              label="Provider"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              options={[
                { value: "openrouter", label: "openrouter" },
                { value: "openai", label: "openai" },
                { value: "anthropic", label: "anthropic" },
                { value: "custom", label: "custom" },
              ]}
              disabled={savingProvider}
            />

            {providerName === "custom" ? (
              <Input
                label="Custom Provider ID"
                placeholder="e.g. groq"
                value={customProviderName}
                onChange={(e) => setCustomProviderName(e.target.value)}
                disabled={savingProvider}
              />
            ) : (
              <Input
                label="Label"
                placeholder="Optional display label"
                value={providerLabel}
                onChange={(e) => setProviderLabel(e.target.value)}
                disabled={savingProvider}
              />
            )}

            {providerName === "custom" && (
              <Input
                label="Label"
                placeholder="Optional display label"
                value={providerLabel}
                onChange={(e) => setProviderLabel(e.target.value)}
                disabled={savingProvider}
              />
            )}

            <Select
              label="Scope"
              value={providerScope}
              onChange={(e) => setProviderScope(e.target.value as "agent" | "account")}
              options={
                selectedAgentId
                  ? [
                      { value: "agent", label: "Agent scoped" },
                      { value: "account", label: "Account scoped" },
                    ]
                  : [{ value: "account", label: "Account scoped" }]
              }
              disabled={savingProvider}
            />

            <div className="md:col-span-2">
              <Input
                label="Provider API Key"
                type="password"
                placeholder="Paste provider secret"
                value={providerSecret}
                onChange={(e) => setProviderSecret(e.target.value)}
                disabled={savingProvider}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" loading={savingProvider}>
                Save Provider Key
              </Button>
            </div>
          </form>

          {providerKeys.length === 0 ? (
            <EmptyState
              title="No provider keys"
              description="Add a BYOK credential to route TokenHall traffic through your own upstream accounts."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Label</Th>
                  <Th>Scope</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <TBody>
                {providerKeys.map((key) => (
                  <tr key={key.id}>
                    <Td>
                      <span className="font-mono text-[13px]">{key.provider}</span>
                    </Td>
                    <Td>{key.label ?? "--"}</Td>
                    <Td>
                      <Badge variant={key.scope === "agent" ? "info" : "default"}>{key.scope}</Badge>
                    </Td>
                    <Td>{formatDate(key.created_at)}</Td>
                    <Td>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={deletingProviderId === key.id}
                        onClick={() => handleDeleteProviderKey(key.id)}
                      >
                        Delete
                      </Button>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateName("");
          setCreateType("th_");
          setCreateRpm("");
          setCreateCreditLimit("");
        }}
        title="Create TokenHall API Key"
      >
        <form onSubmit={handleCreatePlatformKey} className="flex flex-col gap-4">
          <Input
            label="Key Name"
            placeholder="e.g. production-service"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            disabled={creating}
          />

          <Select
            label="Key Type"
            options={[
              { value: "th_", label: "th_ - Inference" },
              { value: "thm_", label: "thm_ - Management" },
            ]}
            value={createType}
            onChange={(e) => setCreateType(e.target.value)}
            disabled={creating}
          />

          <Input
            label="Rate Limit (RPM)"
            type="number"
            placeholder="Leave empty for default"
            value={createRpm}
            onChange={(e) => setCreateRpm(e.target.value)}
            disabled={creating}
          />

          <Input
            label="Credit Limit"
            type="number"
            placeholder="Leave empty for unlimited"
            value={createCreditLimit}
            onChange={(e) => setCreateCreditLimit(e.target.value)}
            disabled={creating}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!createName.trim()}>
              Create Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Created Key Display Modal */}
      <Modal
        open={showCreated}
        onClose={() => {
          setShowCreated(false);
          setCreatedKey(null);
        }}
        title="API Key Created"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-[rgba(208,160,40,0.2)] bg-[rgba(208,160,40,0.06)] px-4 py-3 text-[13px] text-[#D0A028]">
            Copy this key now. It will not be shown again.
          </div>

          {createdKey && (
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#a09080]">Your API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[13px] glass-code rounded-lg px-4 py-3 text-[#B89060] font-mono break-all select-all">
                  {createdKey.raw_key}
                </code>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(createdKey.raw_key)}>
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowCreated(false);
                setCreatedKey(null);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke API Key"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#a09080]">
            Revoke <span className="font-medium text-[#ede8e0]">{revokeTarget?.name}</span>? This cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokePlatformKey} loading={revoking}>
              Revoke Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
