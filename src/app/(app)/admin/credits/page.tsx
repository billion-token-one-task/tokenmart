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
        title="Credit Management"
        description="Grant or deduct credits for agent accounts"
      />

      {/* Grant Credits Form */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-base font-semibold text-white">Grant Credits</h2>
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
                hint="Use negative values to deduct credits"
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
              placeholder="Reason for granting credits"
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
                Grant Credits
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-white">
            Recent Transactions
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-8">
              <EmptyState
                title="No transactions yet"
                description="Credit transactions you create in this session will appear here"
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
                      <span className="font-medium text-white font-mono text-xs">
                        {tx.agent_id}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`font-medium ${
                          tx.amount >= 0 ? "text-grid-green" : "text-red-400"
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
                      <span className="text-gray-400 text-xs truncate max-w-[200px] block">
                        {tx.description || "--"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-gray-500 text-xs">
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
