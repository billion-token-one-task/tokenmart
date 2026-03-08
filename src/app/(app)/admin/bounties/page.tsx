"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Textarea,
  THead,
  Th,
  Tabs,
  useToast,
} from "@/components/ui";
import { Tr } from "@/components/ui/table";
import { authHeaders, useAuthToken } from "@/lib/hooks/use-auth";

interface GoalOption {
  id: string;
  title: string;
}

interface TaskOption {
  id: string;
  title: string;
  goals?: GoalOption[];
}

interface Bounty {
  id: string;
  task_id: string | null;
  goal_id: string | null;
  task_title?: string | null;
  goal_title?: string | null;
  title: string;
  description: string;
  type: string;
  credit_reward: number;
  status: string;
  metadata?: {
    requirements?: {
      required_trust_tier?: number;
      required_service_health?: number;
      required_orchestration_score?: number;
    };
    [key: string]: unknown;
  };
  created_at: string;
}

const statusTabs = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "claimed", label: "Claimed" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
];

const typeOptions = [
  { value: "work", label: "Work" },
  { value: "verification", label: "Verification" },
];

function statusVariant(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "claimed":
    case "submitted":
      return "warning" as const;
    case "approved":
      return "info" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function typeVariant(type: string) {
  return type === "verification" ? ("warning" as const) : ("info" as const);
}

function MetricStrip({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
        {label}
      </div>
      <div className="mt-2 font-mono text-[22px] font-bold text-[#0a0a0a]">{value}</div>
      {note && <div className="mt-2 font-mono text-[11px] text-[#6b6050]">{note}</div>}
    </div>
  );
}

export default function BountiesPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formTaskId, setFormTaskId] = useState("");
  const [formGoalId, setFormGoalId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("work");
  const [formCreditReward, setFormCreditReward] = useState("");
  const [formTrustTier, setFormTrustTier] = useState("");
  const [formServiceHealth, setFormServiceHealth] = useState("");
  const [formOrchestration, setFormOrchestration] = useState("");

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

  const resetForm = () => {
    setFormTaskId("");
    setFormGoalId("");
    setFormTitle("");
    setFormDescription("");
    setFormType("work");
    setFormCreditReward("");
    setFormTrustTier("");
    setFormServiceHealth("");
    setFormOrchestration("");
  };

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === formTaskId) ?? null,
    [formTaskId, tasks]
  );

  const goalOptions = [
    { value: "", label: "Task-level bounty" },
    ...((selectedTask?.goals ?? []).map((goal) => ({
      value: goal.id,
      label: goal.title,
    })) || []),
  ];

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
          goal_id: formGoalId || null,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          type: formType,
          credit_reward: Number(formCreditReward) || 0,
          required_trust_tier: formTrustTier ? Number(formTrustTier) : undefined,
          required_service_health: formServiceHealth ? Number(formServiceHealth) : undefined,
          required_orchestration_score: formOrchestration ? Number(formOrchestration) : undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error?.message ?? "Failed to create bounty");
      toast("Bounty created", "success");
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create bounty", "error");
    } finally {
      setCreating(false);
    }
  };

  const filteredBounties = useCallback(
    (tab: string) => {
      const base = tab === "all" ? bounties : bounties.filter((bounty) => bounty.status === tab);
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return base;
      return base.filter((bounty) =>
        [
          bounty.title,
          bounty.description,
          bounty.task_title ?? "",
          bounty.goal_title ?? "",
          bounty.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    },
    [bounties, query]
  );

  const summary = useMemo(() => {
    const goalLinked = bounties.filter((bounty) => bounty.goal_id).length;
    const gated = bounties.filter(
      (bounty) =>
        bounty.metadata?.requirements?.required_trust_tier !== undefined ||
        bounty.metadata?.requirements?.required_service_health !== undefined ||
        bounty.metadata?.requirements?.required_orchestration_score !== undefined
    ).length;
    return {
      goalLinked,
      gated,
      verification: bounties.filter((bounty) => bounty.type === "verification").length,
      open: bounties.filter((bounty) => bounty.status === "open").length,
    };
  }, [bounties]);

  const tabs = statusTabs.map((tab) => ({
    ...tab,
    count: tab.id === "all" ? bounties.length : bounties.filter((bounty) => bounty.status === tab.id).length,
  }));

  const taskOptions = [
    { value: "", label: "Select task" },
    ...tasks.map((task) => ({ value: task.id, label: task.title })),
  ];
  const trustTierOptions = [
    { value: "", label: "No trust-tier gate" },
    { value: "0", label: "Tier 0" },
    { value: "1", label: "Tier 1" },
    { value: "2", label: "Tier 2" },
    { value: "3", label: "Tier 3" },
  ];

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Bounties"
        description="Attach settlement-backed work to tasks or graph nodes, with explicit eligibility requirements when the work is sensitive."
        section="admin"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            Create Bounty
          </Button>
        }
      />

      {error && (
        <div className="mb-6 border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricStrip label="Bounties" value={String(bounties.length)} />
        <MetricStrip label="Open" value={String(summary.open)} />
        <MetricStrip label="Goal-Linked" value={String(summary.goalLinked)} />
        <MetricStrip
          label="Requirements"
          value={String(summary.gated)}
          note={`${summary.verification} verification bounties`}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 border-2 border-[#0a0a0a] bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, linked task, goal, or bounty type..."
          />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6050]">
          Explicit requirements live in bounty metadata and are enforced on claim
        </div>
      </div>

      <Tabs tabs={tabs} defaultTab="all">
        {(activeTab) => {
          const filtered = filteredBounties(activeTab);

          if (loading) {
            return (
              <div className="space-y-3">
                <Skeleton className="h-14 rounded-none" />
                <Skeleton className="h-14 rounded-none" />
                <Skeleton className="h-14 rounded-none" />
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="border-2 border-[#0a0a0a] bg-white px-6 py-8 text-center">
                <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#6b6050]">
                  No bounties in this view
                </div>
                <div className="mt-3 text-[14px] text-[#3b342c]">
                  {activeTab === "all"
                    ? "Create the first bounty to put credits against a task or node."
                    : `No ${activeTab} bounties match the current filter.`}
                </div>
              </div>
            );
          }

          return (
            <Table>
              <THead>
                <tr>
                  <Th>Bounty</Th>
                  <Th>Type</Th>
                  <Th>Linked Work</Th>
                  <Th>Requirements</Th>
                  <Th>Reward</Th>
                  <Th>Created</Th>
                </tr>
              </THead>
              <TBody>
                {filtered.map((bounty) => {
                  const requirements = bounty.metadata?.requirements ?? {};
                  return (
                    <Tr
                      key={bounty.id}
                      onClick={() => router.push(`/admin/bounties/${bounty.id}`)}
                      className="cursor-pointer"
                    >
                      <Td>
                        <div className="space-y-2">
                          <div className="font-semibold text-[#0a0a0a]">{bounty.title}</div>
                          <div className="line-clamp-2 text-[12px] leading-5 text-[#3b342c]">
                            {bounty.description || "No description provided."}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-2">
                          <Badge variant={typeVariant(bounty.type)}>{bounty.type}</Badge>
                          <Badge variant={statusVariant(bounty.status)}>{bounty.status}</Badge>
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                          <div>{bounty.task_title ?? "Unlinked task"}</div>
                          <div>{bounty.goal_title ?? "Task-level"}</div>
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                          <div>
                            Tier:{" "}
                            {requirements.required_trust_tier !== undefined
                              ? requirements.required_trust_tier
                              : "none"}
                          </div>
                          <div>
                            Health:{" "}
                            {requirements.required_service_health !== undefined
                              ? requirements.required_service_health
                              : "none"}
                          </div>
                          <div>
                            Orch:{" "}
                            {requirements.required_orchestration_score !== undefined
                              ? requirements.required_orchestration_score
                              : "none"}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="font-mono text-[12px] font-bold text-[#0a0a0a]">
                          {bounty.credit_reward}
                        </div>
                      </Td>
                      <Td>
                        <div className="font-mono text-[11px] text-[#6b6050]">
                          {new Date(bounty.created_at).toLocaleDateString()}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          );
        }}
      </Tabs>

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Bounty"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Task"
              options={taskOptions}
              value={formTaskId}
              onChange={(event) => {
                setFormTaskId(event.target.value);
                setFormGoalId("");
              }}
            />
            <Select
              label="Goal"
              options={goalOptions}
              value={formGoalId}
              onChange={(event) => setFormGoalId(event.target.value)}
              disabled={!formTaskId}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              placeholder="Describe the bounty"
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
            />
            <Select
              label="Type"
              options={typeOptions}
              value={formType}
              onChange={(event) => setFormType(event.target.value)}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Explain the deliverable or verification work"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            rows={4}
          />
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              label="Credit Reward"
              type="number"
              value={formCreditReward}
              onChange={(event) => setFormCreditReward(event.target.value)}
              placeholder="0"
            />
            <Select
              label="Trust Tier"
              options={trustTierOptions}
              value={formTrustTier}
              onChange={(event) => setFormTrustTier(event.target.value)}
            />
            <Input
              label="Service Health"
              type="number"
              value={formServiceHealth}
              onChange={(event) => setFormServiceHealth(event.target.value)}
              placeholder="optional"
            />
            <Input
              label="Orchestration"
              type="number"
              value={formOrchestration}
              onChange={(event) => setFormOrchestration(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-3 font-mono text-[11px] leading-5 text-[#3b342c]">
            Use trust/service-health/orchestration requirements only when a bounty
            genuinely needs them. Otherwise leave the gates empty and let the ranked
            work queue decide fit dynamically.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
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
              disabled={!formTaskId || !formTitle.trim()}
            >
              Create Bounty
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
