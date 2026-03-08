"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Textarea,
  Select,
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
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface CreditTransaction {
  agent_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const typeOptions = [
  { value: "admin_grant", label: "Admin Grant" },
  { value: "bounty_reward", label: "Bounty Reward" },
];

export default function CreditsPage() {
  const token = useAuthToken();
  const { toast } = useToast();

  // Grant form state
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("admin_grant");
  const [description, setDescription] = useState("");
  const [granting, setGranting] = useState(false);

  // Recent transactions
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  const handleGrant = useCallback(async () => {
    if (!token || !agentId.trim() || !amount) return;
    setGranting(true);
    try {
      const res = await fetch("/api/v1/admin/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          agent_id: agentId.trim(),
          amount: Number(amount),
          type,
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || "Failed to grant credits"
        );
      }
      toast(
        `Successfully granted ${amount} credits to ${agentId}`,
        "success"
      );

      // Add to local transaction history
      setTransactions((prev) => [
        {
          agent_id: agentId.trim(),
          amount: Number(amount),
          type,
          description: description.trim(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Reset form
      setAgentId("");
      setAmount("");
      setDescription("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to grant credits",
        "error"
      );
    } finally {
      setGranting(false);
    }
  }, [token, agentId, amount, type, description, toast]);

  const typeVariant = (t: string) => {
    switch (t) {
      case "admin_grant":
        return "info" as const;
      case "bounty_reward":
        return "success" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Treasury"
        description="Issue, reclaim, and document credit movements as the operator stewarding market liquidity and work lease capacity."
      />

      {/* Grant Credits Form */}
      <div className="relative rounded-[8px] mb-8" style={{ isolation: "isolate" }}>
        <div className="absolute inset-[-1px] rounded-[8px] -z-10" style={{
          background: "conic-gradient(from var(--border-angle), #666, #ededed, #666)",
          animation: "border-rotate 4s linear infinite",
        }} />
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a]">
          <Card className="border-0 bg-transparent">
            <CardHeader>
              <h2 className="text-[15px] font-semibold text-[#ededed]">Adjust treasury</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <Input
                  label="Agent ID"
                  placeholder="Enter agent ID"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Amount"
                    type="number"
                    placeholder="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    hint="Use negative values to reclaim treasury credits"
                  />
                  <Select
                    label="Type"
                    options={typeOptions}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
                <Textarea
                  label="Description"
                  placeholder="Why this treasury adjustment is being made"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleGrant}
                    loading={granting}
                    disabled={!agentId.trim() || !amount}
                  >
                    Apply treasury action
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card variant="glass">
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-[#ededed]">
            Treasury History
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-8">
              <EmptyState
                title="No transactions yet"
                description="Manual issuances and deductions will appear here once operator-side adjustments start clearing."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Agent ID</Th>
                  <Th>Amount</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th>Date</Th>
                </tr>
              </THead>
              <TBody>
                {transactions.map((tx, i) => (
                  <tr key={i}>
                    <Td>
                      <span className="font-medium text-[#ededed] font-mono text-[13px]">
                        {tx.agent_id}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`font-medium font-mono tabular-nums ${
                          tx.amount >= 0 ? "text-[#50e3c2]" : "text-[#ee0000]"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={typeVariant(tx.type)}>{tx.type}</Badge>
                    </Td>
                    <Td>
                      <span className="text-[#a1a1a1] text-[13px] truncate max-w-[200px] block">
                        {tx.description || "--"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[#444] text-[13px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
