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

interface GoalSummary {
  id: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  credit_reward: number;
  passing_spec: string | null;
  methodology_version: string;
  input_spec?: string[];
  output_spec?: string[];
  retry_policy?: Record<string, unknown>;
  verification_method?: string | null;
  verification_target?: string | null;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  created_at: string;
  updated_at: string;
  goals: GoalSummary[];
  goals_count?: number;
  completed_goals_count?: number;
  execution_plan_status?: string | null;
  execution_plan_updated_at?: string | null;
}

const statusTabs = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function priorityToNumber(priority: string) {
  switch (priority) {
    case "critical":
      return 90;
    case "high":
      return 75;
    case "medium":
      return 50;
    default:
      return 25;
  }
}

function priorityLabel(priority: number) {
  if (priority >= 85) return "Critical";
  if (priority >= 65) return "High";
  if (priority >= 40) return "Medium";
  return "Low";
}

function statusVariant(status: string) {
  switch (status) {
    case "open":
    case "ready":
      return "success" as const;
    case "in_progress":
    case "planned":
    case "verified":
      return "warning" as const;
    case "completed":
    case "reconciled":
      return "info" as const;
    case "changes_requested":
    case "failed":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function priorityVariant(priority: number) {
  if (priority >= 85) return "danger" as const;
  if (priority >= 65) return "warning" as const;
  if (priority >= 40) return "info" as const;
  return "outline" as const;
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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

export default function TasksPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formCreditReward, setFormCreditReward] = useState("");
  const [formPassingSpec, setFormPassingSpec] = useState("");
  const [formVerificationMethod, setFormVerificationMethod] = useState("");
  const [formVerificationTarget, setFormVerificationTarget] = useState("");
  const [formInputSpec, setFormInputSpec] = useState("");
  const [formOutputSpec, setFormOutputSpec] = useState("");
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState("");
  const [formActualMinutes, setFormActualMinutes] = useState("");
  const [formRetryMaxAttempts, setFormRetryMaxAttempts] = useState("1");
  const [formRetryEscalation, setFormRetryEscalation] = useState("");

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/tasks", {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormCreditReward("");
    setFormPassingSpec("");
    setFormVerificationMethod("");
    setFormVerificationTarget("");
    setFormInputSpec("");
    setFormOutputSpec("");
    setFormEstimatedMinutes("");
    setFormActualMinutes("");
    setFormRetryMaxAttempts("1");
    setFormRetryEscalation("");
  };

  const handleCreate = async () => {
    if (!token || !formTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          priority: priorityToNumber(formPriority),
          credit_reward: formCreditReward ? Number(formCreditReward) : 0,
          passing_spec: formPassingSpec.trim() || null,
          methodology_version: "v2",
          verification_method: formVerificationMethod.trim() || null,
          verification_target: formVerificationTarget.trim() || null,
          input_spec: parseLines(formInputSpec),
          output_spec: parseLines(formOutputSpec),
          retry_policy: {
            max_attempts: Math.max(1, Number(formRetryMaxAttempts || 1)),
            escalation: formRetryEscalation.trim() || null,
          },
          estimated_minutes: formEstimatedMinutes ? Number(formEstimatedMinutes) : null,
          actual_minutes: formActualMinutes ? Number(formActualMinutes) : null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error?.message ?? "Failed to create task");
      toast("Task created", "success");
      setShowCreateModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create task", "error");
    } finally {
      setCreating(false);
    }
  };

  const summary = useMemo(() => {
    const totalGoals = tasks.reduce((sum, task) => sum + (task.goals_count ?? 0), 0);
    const totalCompletedGoals = tasks.reduce(
      (sum, task) => sum + (task.completed_goals_count ?? 0),
      0
    );
    const materializedPlans = tasks.filter((task) => task.execution_plan_status).length;
    const changesRequested = tasks.filter(
      (task) => task.execution_plan_status === "changes_requested"
    ).length;
    const fullyContractedTasks = tasks.filter(
      (task) =>
        (task.input_spec?.length ?? 0) > 0 &&
        (task.output_spec?.length ?? 0) > 0 &&
        !!task.passing_spec &&
        !!task.verification_method
    ).length;
    return {
      totalGoals,
      totalCompletedGoals,
      materializedPlans,
      changesRequested,
      fullyContractedTasks,
    };
  }, [tasks]);

  const filterTasks = useCallback(
    (tab: string) => {
      const base = tab === "all" ? tasks : tasks.filter((task) => task.status === tab);
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return base;
      return base.filter((task) => {
        const haystack = [
          task.title,
          task.description,
          task.methodology_version,
          task.execution_plan_status ?? "",
          task.passing_spec ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    },
    [query, tasks]
  );

  const createTabs = statusTabs.map((tab) => ({
    ...tab,
    count: tab.id === "all" ? tasks.length : tasks.filter((task) => task.status === tab.id).length,
  }));

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Tasks"
        description="Define outcome contracts, materialize execution plans, and monitor where work decomposition still needs tightening."
        section="admin"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            Create Task
          </Button>
        }
      />

      {error && (
        <div className="mb-6 border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricStrip label="Tasks" value={String(tasks.length)} />
        <MetricStrip
          label="Goal Nodes"
          value={String(summary.totalGoals)}
          note={`${summary.totalCompletedGoals} completed`}
        />
        <MetricStrip
          label="Materialized Plans"
          value={String(summary.materializedPlans)}
          note={`${summary.changesRequested} need changes`}
        />
        <MetricStrip
          label="Task Contracts"
          value={String(summary.fullyContractedTasks)}
          note={`${tasks.length - summary.fullyContractedTasks} still underspecified`}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 border-2 border-[#0a0a0a] bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, spec, plan status, or methodology..."
          />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6050]">
          Search filters the currently selected queue
        </div>
      </div>

      <Tabs tabs={createTabs} defaultTab="all">
        {(activeTab) => {
          const filtered = filterTasks(activeTab);

          if (loading) {
            return (
              <div className="space-y-3">
                <Skeleton className="h-14 rounded-none" />
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
                  No tasks in this view
                </div>
                <div className="mt-3 text-[14px] text-[#3b342c]">
                  {activeTab === "all"
                    ? "Create the first task to open a new graph-backed workstream."
                    : `No ${activeTab.replace("_", " ")} tasks match the current filter.`}
                </div>
                {activeTab === "all" && (
                  <div className="mt-5">
                    <Button onClick={() => setShowCreateModal(true)}>Create Task</Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Table>
              <THead>
                <tr>
                  <Th>Task</Th>
                  <Th>Queue State</Th>
                  <Th>Contract</Th>
                  <Th>Plan State</Th>
                  <Th>Reward</Th>
                  <Th>Updated</Th>
                </tr>
              </THead>
              <TBody>
                {filtered.map((task) => (
                  <Tr
                    key={task.id}
                    onClick={() => router.push(`/admin/tasks/${task.id}`)}
                    className="cursor-pointer"
                  >
                    <Td>
                      <div className="space-y-2">
                        <div className="font-semibold text-[#0a0a0a]">{task.title}</div>
                        <div className="line-clamp-2 text-[12px] leading-5 text-[#3b342c]">
                          {task.description || task.passing_spec || "No description provided."}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="space-y-2">
                        <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                        <Badge variant={priorityVariant(task.priority)}>
                          {priorityLabel(task.priority)}
                        </Badge>
                      </div>
                    </Td>
                    <Td>
                      <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                        <div>
                          Inputs {(task.input_spec?.length ?? 0)} / Outputs{" "}
                          {(task.output_spec?.length ?? 0)}
                        </div>
                        <div>Verify {task.verification_method || "unset"}</div>
                        <div>
                          Graph {task.goals_count ?? task.goals.length} / done{" "}
                          {task.completed_goals_count ?? 0}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="space-y-2">
                        <Badge variant={statusVariant(task.execution_plan_status ?? "draft")}>
                          {task.execution_plan_status ?? "draft"}
                        </Badge>
                        <div className="font-mono text-[11px] text-[#6b6050]">
                          {task.execution_plan_updated_at
                            ? new Date(task.execution_plan_updated_at).toLocaleDateString()
                            : "Not materialized"}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="font-mono text-[12px] font-bold text-[#0a0a0a]">
                        {task.credit_reward}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-mono text-[11px] text-[#6b6050]">
                        {new Date(task.updated_at).toLocaleDateString()}
                      </div>
                    </Td>
                  </Tr>
                ))}
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
        title="Create Task"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Name the outcome you want the graph to deliver"
            value={formTitle}
            onChange={(event) => setFormTitle(event.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Describe the operator intent and execution context"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            rows={4}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Priority"
              options={priorityOptions}
              value={formPriority}
              onChange={(event) => setFormPriority(event.target.value)}
            />
            <Input
              label="Credit Reward"
              type="number"
              placeholder="0"
              value={formCreditReward}
              onChange={(event) => setFormCreditReward(event.target.value)}
            />
            <Input label="Methodology" value="v2" disabled />
          </div>
          <Textarea
            label="Passing Spec"
            placeholder="State what evidence and end state will count as a pass"
            value={formPassingSpec}
            onChange={(event) => setFormPassingSpec(event.target.value)}
            rows={4}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Verification Method"
              placeholder="manual_review | command | checklist"
              value={formVerificationMethod}
              onChange={(event) => setFormVerificationMethod(event.target.value)}
            />
            <Input
              label="Verification Target"
              placeholder="artifact, path, or command"
              value={formVerificationTarget}
              onChange={(event) => setFormVerificationTarget(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              label="Input Spec"
              placeholder="One input expectation per line"
              value={formInputSpec}
              onChange={(event) => setFormInputSpec(event.target.value)}
              rows={5}
            />
            <Textarea
              label="Output Spec"
              placeholder="One output expectation per line"
              value={formOutputSpec}
              onChange={(event) => setFormOutputSpec(event.target.value)}
              rows={5}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              label="Estimated Minutes"
              value={formEstimatedMinutes}
              onChange={(event) => setFormEstimatedMinutes(event.target.value)}
            />
            <Input
              label="Actual Minutes"
              value={formActualMinutes}
              onChange={(event) => setFormActualMinutes(event.target.value)}
            />
            <Input
              label="Retry Attempts"
              value={formRetryMaxAttempts}
              onChange={(event) => setFormRetryMaxAttempts(event.target.value)}
            />
            <Input
              label="Escalation"
              placeholder="reviewer | planner | owner"
              value={formRetryEscalation}
              onChange={(event) => setFormRetryEscalation(event.target.value)}
            />
          </div>
          <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-3 font-mono text-[11px] leading-5 text-[#3b342c]">
            New tasks now start with a top-level execution contract. Add graph nodes,
            dependency semantics, and planner / reviewer / reconciler decisions from
            the task detail page.
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
            <Button onClick={handleCreate} loading={creating} disabled={!formTitle.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
