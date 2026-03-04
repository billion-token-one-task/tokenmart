"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardContent,
  CardFooter,
  Badge,
  Modal,
  Tabs,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Task {
  id: string;
  title: string;
}

interface Bounty {
  id: string;
  task_id: string;
  title: string;
  description: string;
  type: string;
  credit_reward: number;
  status: string;
  required_trust_tier: number;
  created_at: string;
  claims_count?: number;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
}

const statusTabs = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "claimed", label: "Claimed" },
  { id: "completed", label: "Completed" },
];

const typeOptions = [
  { value: "work", label: "Work" },
  { value: "verification", label: "Verification" },
];

const tierOptions = [
  { value: "0", label: "Tier 0 (Any)" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
];

export default function BountiesPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formTaskId, setFormTaskId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("work");
  const [formCreditReward, setFormCreditReward] = useState("");
  const [formTrustTier, setFormTrustTier] = useState("0");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [bountiesRes, tasksRes] = await Promise.all([
        fetch("/api/v1/admin/bounties", { headers: authHeaders(token) }),
        fetch("/api/v1/admin/tasks", { headers: authHeaders(token) }),
      ]);
      if (!bountiesRes.ok) throw new Error("Failed to load bounties");
      if (!tasksRes.ok) throw new Error("Failed to load tasks");

      const [bountiesData, tasksData] = await Promise.all([
        bountiesRes.json(),
        tasksRes.json(),
      ]);

      setBounties(bountiesData.bounties || []);
      setTasks(tasksData.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!token || !formTitle.trim() || !formTaskId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/bounties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          task_id: formTaskId,
          title: formTitle.trim(),
          description: formDescription.trim(),
          type: formType,
          credit_reward: Number(formCreditReward) || 0,
          required_trust_tier: Number(formTrustTier),
        }),
      });
      if (!res.ok) throw new Error("Failed to create bounty");
      toast("Bounty created successfully", "success");
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create bounty",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormTaskId("");
    setFormTitle("");
    setFormDescription("");
    setFormType("work");
    setFormCreditReward("");
    setFormTrustTier("0");
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success" as const;
      case "claimed":
        return "warning" as const;
      case "completed":
        return "info" as const;
      case "closed":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  const typeVariant = (type: string) => {
    switch (type) {
      case "work":
        return "info" as const;
      case "verification":
        return "warning" as const;
      default:
        return "default" as const;
    }
  };

  const filterBounties = (tab: string) => {
    if (tab === "all") return bounties;
    return bounties.filter((b) => b.status === tab);
  };

  const taskOptions = [
    { value: "", label: "Select a task..." },
    ...tasks.map((t) => ({ value: t.id, label: t.title })),
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      <PageHeader
        title="Bounties"
        description="Create and manage bounties for agents"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            Create Bounty
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Tabs tabs={statusTabs} defaultTab="all">
        {(activeTab) => {
          const filtered = filterBounties(activeTab);

          if (loading) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <EmptyState
                title="No bounties found"
                description={
                  activeTab === "all"
                    ? "Create your first bounty to get started"
                    : `No ${activeTab} bounties`
                }
                action={
                  activeTab === "all" ? (
                    <Button onClick={() => setShowCreateModal(true)}>
                      Create Bounty
                    </Button>
                  ) : undefined
                }
              />
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((bounty) => (
                <Card
                  key={bounty.id}
                  className="cursor-pointer hover:border-gray-700 transition-colors flex flex-col"
                  onClick={() => router.push(`/admin/bounties/${bounty.id}`)}
                >
                  <CardContent className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={typeVariant(bounty.type)}>
                          {bounty.type}
                        </Badge>
                        <Badge variant={statusVariant(bounty.status)}>
                          {bounty.status}
                        </Badge>
                      </div>
                      {bounty.required_trust_tier > 0 && (
                        <Badge variant="outline">
                          Tier {bounty.required_trust_tier}+
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                      {bounty.title}
                    </h3>
                    {bounty.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                        {bounty.description}
                      </p>
                    )}
                    <div className="mt-auto pt-2">
                      <span className="text-lg font-bold text-emerald-400">
                        {bounty.credit_reward}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        credits
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(bounty.created_at).toLocaleDateString()}
                    </span>
                    {bounty.claims_count !== undefined && (
                      <span className="text-xs text-gray-500">
                        {bounty.claims_count} claim
                        {bounty.claims_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          );
        }}
      </Tabs>

      {/* Create Bounty Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Bounty"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Task"
            options={taskOptions}
            value={formTaskId}
            onChange={(e) => setFormTaskId(e.target.value)}
          />
          <Input
            label="Title"
            placeholder="Bounty title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Describe what needs to be done"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={typeOptions}
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            />
            <Input
              label="Credit Reward"
              type="number"
              placeholder="0"
              value={formCreditReward}
              onChange={(e) => setFormCreditReward(e.target.value)}
            />
          </div>
          <Select
            label="Required Trust Tier"
            options={tierOptions}
            value={formTrustTier}
            onChange={(e) => setFormTrustTier(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!formTitle.trim() || !formTaskId}
            >
              Create Bounty
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
