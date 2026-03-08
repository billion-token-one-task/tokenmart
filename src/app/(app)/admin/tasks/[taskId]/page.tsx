"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  credit_reward: number | null;
  passing_spec: string | null;
  methodology_version: string;
  metadata: Record<string, unknown>;
  input_spec: string[];
  output_spec: string[];
  retry_policy: Record<string, unknown>;
  verification_method: string | null;
  verification_target: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  path: string;
  depth: number;
  parent_goal_id: string | null;
  requires_all_subgoals: boolean;
  passing_spec: string | null;
  assigned_agent_id: string | null;
  orchestration_role: string;
  node_type: string;
  verification_method: string | null;
  verification_target: string | null;
  input_spec: string[];
  output_spec: string[];
  retry_policy: Record<string, unknown>;
  evidence: unknown[];
  estimated_minutes: number | null;
  actual_minutes: number | null;
  credit_reward: number | null;
  completion_confidence: number | null;
  blocked_reason: string | null;
  metadata: Record<string, unknown>;
}

interface GoalDependency {
  id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_kind: string;
}

interface ExecutionPlanNode {
  id: string;
  goal_id: string | null;
  title: string;
  status: string;
  node_type: string;
  orchestration_role: string;
  assigned_agent_id: string | null;
  priority: number;
  budget_minutes: number | null;
  actual_minutes: number | null;
  passing_spec: string | null;
  verification_method: string | null;
  verification_target: string | null;
  input_spec: string[];
  output_spec: string[];
  evidence: unknown[];
  rework_count: number;
  handoff_count: number;
  successful_handoff_count: number;
  duplicate_overlap_score: number | null;
}

interface ExecutionPlanReview {
  id: string;
  review_type: string;
  decision: string;
  summary: string | null;
  score: number | null;
  created_at: string;
  submitted_at: string | null;
  evidence_findings: unknown[];
}

interface ExecutionPlan {
  id: string;
  status: string;
  summary: string | null;
  methodology_version: string;
  nodes: ExecutionPlanNode[];
  edges: Array<{ id: string; from_node_id: string; to_node_id: string; edge_type: string }>;
  reviews: ExecutionPlanReview[];
}

interface Readiness {
  total_nodes: number;
  completed_nodes: number;
  blocked_nodes: number;
  completion_ratio: number;
  planner_reviews: number;
  reviewer_reviews: number;
  reconciler_reviews: number;
  methodology: {
    decomposition_coverage: number;
    completion_rate: number;
    review_approval_rate: number;
    reviewer_agreement_rate: number;
    rework_rate: number;
    handoff_success_rate: number;
    forecast_accuracy: number;
    duplicate_work_avoidance: number;
    evidence_density: number;
  };
}

const reviewTypeOptions = [
  { value: "planner", label: "Planner" },
  { value: "reviewer", label: "Reviewer" },
  { value: "reconciler", label: "Reconciler" },
];

const reviewDecisionOptions = [
  { value: "approve", label: "Approve" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "reject", label: "Reject" },
];

const orchestrationRoleOptions = [
  { value: "plan", label: "Plan" },
  { value: "execute", label: "Execute" },
  { value: "review", label: "Review" },
  { value: "reconcile", label: "Reconcile" },
];

const nodeTypeOptions = [
  { value: "deliverable", label: "Deliverable" },
  { value: "research", label: "Research" },
  { value: "review", label: "Review" },
  { value: "handoff", label: "Handoff" },
  { value: "decision", label: "Decision" },
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusVariant(status: string) {
  switch (status) {
    case "completed":
    case "approved":
    case "verified":
    case "reconciled":
      return "success" as const;
    case "in_progress":
    case "planned":
    case "ready":
      return "warning" as const;
    case "failed":
    case "reject":
    case "rejected":
    case "changes_requested":
      return "danger" as const;
    default:
      return "outline" as const;
  }
}

function priorityLabel(priority: number) {
  if (priority >= 85) return "Critical";
  if (priority >= 65) return "High";
  if (priority >= 40) return "Medium";
  return "Low";
}

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

function MetricCell({
  label,
  value,
  tone = "text-[#0a0a0a]",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
        {label}
      </div>
      <div className={`mt-2 font-mono text-[18px] font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const token = useAuthToken();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dependencies, setDependencies] = useState<GoalDependency[]>([]);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [savingTask, setSavingTask] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCreditReward, setEditCreditReward] = useState("");
  const [editPassingSpec, setEditPassingSpec] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editVerificationMethod, setEditVerificationMethod] = useState("");
  const [editVerificationTarget, setEditVerificationTarget] = useState("");
  const [editInputSpec, setEditInputSpec] = useState("");
  const [editOutputSpec, setEditOutputSpec] = useState("");
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState("");
  const [editActualMinutes, setEditActualMinutes] = useState("");
  const [editRetryMaxAttempts, setEditRetryMaxAttempts] = useState("1");
  const [editRetryEscalation, setEditRetryEscalation] = useState("");

  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalParentId, setGoalParentId] = useState("");
  const [goalPassingSpec, setGoalPassingSpec] = useState("");
  const [goalAssignedAgentId, setGoalAssignedAgentId] = useState("");
  const [goalCreditReward, setGoalCreditReward] = useState("");
  const [goalVerificationMethod, setGoalVerificationMethod] = useState("");
  const [goalVerificationTarget, setGoalVerificationTarget] = useState("");
  const [goalRole, setGoalRole] = useState("execute");
  const [goalNodeType, setGoalNodeType] = useState("deliverable");
  const [goalInputSpec, setGoalInputSpec] = useState("");
  const [goalOutputSpec, setGoalOutputSpec] = useState("");
  const [goalEstimatedMinutes, setGoalEstimatedMinutes] = useState("");
  const [goalActualMinutes, setGoalActualMinutes] = useState("");
  const [goalRetryMaxAttempts, setGoalRetryMaxAttempts] = useState("1");
  const [goalRetryEscalation, setGoalRetryEscalation] = useState("");
  const [goalRequiresAllSubgoals, setGoalRequiresAllSubgoals] = useState(false);
  const [goalDependencyIds, setGoalDependencyIds] = useState<string[]>([]);
  const [goalDependencyKinds, setGoalDependencyKinds] = useState<Record<string, string>>({});

  const [reviewType, setReviewType] = useState("reviewer");
  const [reviewDecision, setReviewDecision] = useState("approve");
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewScore, setReviewScore] = useState("");
  const [reviewEvidenceFindings, setReviewEvidenceFindings] = useState("");

  const dependencyMap = useMemo(() => {
    return dependencies.reduce<Record<string, GoalDependency[]>>((acc, dependency) => {
      acc[dependency.goal_id] = [...(acc[dependency.goal_id] ?? []), dependency];
      return acc;
    }, {});
  }, [dependencies]);

  const goalNameMap = useMemo(() => {
    return goals.reduce<Record<string, string>>((acc, goal) => {
      acc[goal.id] = goal.title;
      return acc;
    }, {});
  }, [goals]);

  const fetchTask = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, planRes] = await Promise.all([
        fetch(`/api/v1/admin/tasks/${taskId}`, { headers: authHeaders(token) }),
        fetch(`/api/v1/admin/tasks/${taskId}/plan`, { headers: authHeaders(token) }),
      ]);

      if (!taskRes.ok) throw new Error("Failed to load task");
      if (!planRes.ok) throw new Error("Failed to load execution plan");

      const taskJson = await taskRes.json();
      const planJson = await planRes.json();

      setTask(taskJson.task);
      setGoals(taskJson.task.goals ?? []);
      setDependencies(taskJson.task.dependencies ?? []);
      setPlan(planJson.execution_plan ?? null);
      setReadiness(planJson.readiness ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [taskId, token]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const resetGoalForm = useCallback((goal?: Goal | null) => {
    setEditingGoalId(goal?.id ?? null);
    setGoalTitle(goal?.title ?? "");
    setGoalDescription(goal?.description ?? "");
    setGoalParentId(goal?.parent_goal_id ?? "");
    setGoalPassingSpec(goal?.passing_spec ?? "");
    setGoalAssignedAgentId(goal?.assigned_agent_id ?? "");
    setGoalCreditReward(goal?.credit_reward ? String(goal.credit_reward) : "");
    setGoalVerificationMethod(goal?.verification_method ?? "");
    setGoalVerificationTarget(goal?.verification_target ?? "");
    setGoalRole(goal?.orchestration_role ?? "execute");
    setGoalNodeType(goal?.node_type ?? "deliverable");
    setGoalInputSpec((goal?.input_spec ?? []).join("\n"));
    setGoalOutputSpec((goal?.output_spec ?? []).join("\n"));
    setGoalEstimatedMinutes(
      goal?.estimated_minutes === null || goal?.estimated_minutes === undefined
        ? ""
        : String(goal.estimated_minutes)
    );
    setGoalActualMinutes(
      goal?.actual_minutes === null || goal?.actual_minutes === undefined
        ? ""
        : String(goal.actual_minutes)
    );
    setGoalRetryMaxAttempts(
      String(
        typeof goal?.retry_policy?.max_attempts === "number"
          ? goal.retry_policy.max_attempts
          : 1
      )
    );
    setGoalRetryEscalation(
      typeof goal?.retry_policy?.escalation === "string"
        ? goal.retry_policy.escalation
        : ""
    );
    setGoalRequiresAllSubgoals(goal?.requires_all_subgoals ?? false);
    const goalDependencies = goal ? dependencyMap[goal.id] ?? [] : [];
    setGoalDependencyIds(goalDependencies.map((dependency) => dependency.depends_on_goal_id));
    setGoalDependencyKinds(
      goalDependencies.reduce<Record<string, string>>((acc, dependency) => {
        acc[dependency.depends_on_goal_id] = dependency.dependency_kind;
        return acc;
      }, {})
    );
  }, [dependencyMap]);

  const openTaskEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(priorityLabel(task.priority).toLowerCase());
    setEditCreditReward(task.credit_reward ? String(task.credit_reward) : "");
    setEditPassingSpec(task.passing_spec ?? "");
    setEditStatus(task.status);
    setEditVerificationMethod(task.verification_method ?? "");
    setEditVerificationTarget(task.verification_target ?? "");
    setEditInputSpec((task.input_spec ?? []).join("\n"));
    setEditOutputSpec((task.output_spec ?? []).join("\n"));
    setEditEstimatedMinutes(
      task.estimated_minutes === null || task.estimated_minutes === undefined
        ? ""
        : String(task.estimated_minutes)
    );
    setEditActualMinutes(
      task.actual_minutes === null || task.actual_minutes === undefined
        ? ""
        : String(task.actual_minutes)
    );
    setEditRetryMaxAttempts(
      String(
        typeof task.retry_policy?.max_attempts === "number"
          ? task.retry_policy.max_attempts
          : 1
      )
    );
    setEditRetryEscalation(
      typeof task.retry_policy?.escalation === "string" ? task.retry_policy.escalation : ""
    );
    setShowEditModal(true);
  };

  const openGoalCreate = (parentGoalId?: string) => {
    resetGoalForm(null);
    if (parentGoalId) setGoalParentId(parentGoalId);
    setShowGoalModal(true);
  };

  const openGoalEdit = (goal: Goal) => {
    resetGoalForm(goal);
    setShowGoalModal(true);
  };

  const handleUpdateTask = async () => {
    if (!token || !task) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/v1/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: priorityToNumber(editPriority),
          credit_reward: editCreditReward ? Number(editCreditReward) : null,
          passing_spec: editPassingSpec.trim() || null,
          status: editStatus,
          verification_method: editVerificationMethod.trim() || null,
          verification_target: editVerificationTarget.trim() || null,
          input_spec: parseLines(editInputSpec),
          output_spec: parseLines(editOutputSpec),
          retry_policy: {
            max_attempts: Math.max(1, Number(editRetryMaxAttempts || 1)),
            escalation: editRetryEscalation.trim() || null,
          },
          estimated_minutes: editEstimatedMinutes ? Number(editEstimatedMinutes) : null,
          actual_minutes: editActualMinutes ? Number(editActualMinutes) : null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error?.message ?? "Failed to update task");
      toast("Task updated", "success");
      setShowEditModal(false);
      fetchTask();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update task", "error");
    } finally {
      setSavingTask(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!token || !goalTitle.trim()) return;
    setSavingGoal(true);
    try {
      const payload = {
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
        parent_goal_id: goalParentId || null,
        passing_spec: goalPassingSpec.trim() || null,
        assigned_agent_id: goalAssignedAgentId.trim() || null,
        credit_reward: goalCreditReward ? Number(goalCreditReward) : 0,
        verification_method: goalVerificationMethod.trim() || null,
        verification_target: goalVerificationTarget.trim() || null,
        orchestration_role: goalRole,
        node_type: goalNodeType,
        input_spec: parseLines(goalInputSpec),
        output_spec: parseLines(goalOutputSpec),
        retry_policy: {
          max_attempts: Math.max(1, Number(goalRetryMaxAttempts || 1)),
          escalation: goalRetryEscalation.trim() || null,
        },
        estimated_minutes: goalEstimatedMinutes ? Number(goalEstimatedMinutes) : null,
        actual_minutes: goalActualMinutes ? Number(goalActualMinutes) : null,
        requires_all_subgoals: goalRequiresAllSubgoals,
        dependency_goal_ids: goalDependencyIds,
        dependencies: goalDependencyIds.map((dependencyId) => ({
          depends_on_goal_id: dependencyId,
          dependency_kind: goalDependencyKinds[dependencyId] ?? "blocking",
        })),
      };

      const res = await fetch(
        editingGoalId
          ? `/api/v1/admin/tasks/${taskId}/goals/${editingGoalId}`
          : `/api/v1/admin/tasks/${taskId}/goals`,
        {
          method: editingGoalId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify(payload),
        }
      );
      const responsePayload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          responsePayload?.error?.message ??
            `Failed to ${editingGoalId ? "update" : "create"} goal`
        );
      }
      toast(editingGoalId ? "Goal updated" : "Goal created", "success");
      setShowGoalModal(false);
      fetchTask();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save goal", "error");
    } finally {
      setSavingGoal(false);
    }
  };

  const handleMaterializePlan = async () => {
    if (!token) return;
    setPlanBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/tasks/${taskId}/plan`, {
        method: "POST",
        headers: authHeaders(token),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? "Failed to materialize execution plan");
      }
      toast("Execution plan materialized", "success");
      fetchTask();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to materialize execution plan", "error");
    } finally {
      setPlanBusy(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!token || !plan) return;
    setReviewBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/tasks/${taskId}/plan/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          review_type: reviewType,
          decision: reviewDecision,
          summary: reviewSummary.trim() || null,
          score: reviewScore ? Number(reviewScore) : null,
          evidence_findings: parseLines(reviewEvidenceFindings),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? "Failed to submit plan review");
      }
      toast("Plan review submitted", "success");
      setShowReviewModal(false);
      setReviewSummary("");
      setReviewScore("");
      setReviewEvidenceFindings("");
      fetchTask();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit plan review", "error");
    } finally {
      setReviewBusy(false);
    }
  };

  const reviewTabs = [
    { id: "overview", label: "Overview" },
    { id: "work-graph", label: "Work Graph", count: goals.length },
    { id: "review-loop", label: "Review Loop", count: plan?.reviews.length ?? 0 },
  ];
  const taskPriorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];
  const taskStatusOptions = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const parentGoalOptions = [
    { value: "", label: "Root node" },
    ...goals
      .filter((goal) => goal.id !== editingGoalId)
      .map((goal) => ({ value: goal.id, label: goal.title })),
  ];

  return (
    <div className="max-w-7xl">
      <div className="mb-5">
        <Link
          href="/admin/tasks"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6050] transition-colors hover:text-[#e5005a]"
        >
          Back to tasks
        </Link>
      </div>

      <PageHeader
        title={task?.title ?? "Task"}
        description="Manage the execution contract, materialized work graph, and planner-reviewer-reconciler loop in one place."
        section="admin"
        actions={
          <>
            <Button variant="secondary" onClick={openTaskEdit} disabled={!task || loading}>
              Edit Task
            </Button>
            <Button variant="outline" onClick={handleMaterializePlan} loading={planBusy} disabled={loading}>
              {plan ? "Refresh Plan" : "Materialize Plan"}
            </Button>
            <Button onClick={() => openGoalCreate()} disabled={loading}>
              Add Goal
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-none" />
          <Skeleton className="h-72 rounded-none" />
          <Skeleton className="h-72 rounded-none" />
        </div>
      ) : !task ? (
        <EmptyState
          title="Task not found"
          description="This task is unavailable or no longer part of the active methodology queue."
          action={<Button variant="secondary" onClick={() => window.history.back()}>Go Back</Button>}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-4">
            <MetricCell label="Priority" value={priorityLabel(task.priority)} />
            <MetricCell label="Goals" value={String(goals.length)} />
            <MetricCell label="Dependencies" value={String(dependencies.length)} />
            <MetricCell label="Plan Status" value={plan?.status ?? "Draft"} tone="text-[#e5005a]" />
          </div>

          <Tabs tabs={reviewTabs} defaultTab="overview">
            {(activeTab) => {
              if (activeTab === "overview") {
                return (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <Card variant="glass">
                      <CardHeader className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                            Task Brief
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                            <Badge variant="outline">{task.methodology_version}</Badge>
                            <Badge variant="glass">{task.credit_reward ?? 0} credits</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                            Description
                          </div>
                          <p className="mt-2 text-[14px] leading-6 text-[#3b342c]">
                            {task.description || "No task description provided yet."}
                          </p>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                            Passing Spec
                          </div>
                          <div className="mt-2 border-2 border-[#0a0a0a] bg-[#faf7f2] px-3 py-3 font-mono text-[12px] leading-6 text-[#3b342c]">
                            {task.passing_spec || "No top-level passing spec defined yet."}
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                              Task Contract
                            </div>
                            <div className="mt-2 space-y-1 font-mono text-[11px] text-[#3b342c]">
                              <div>Inputs: {task.input_spec.length}</div>
                              <div>Outputs: {task.output_spec.length}</div>
                              <div>Verify: {task.verification_method || "not set"}</div>
                              <div>Target: {task.verification_target || "not set"}</div>
                            </div>
                          </div>
                          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                              Retry + Forecast
                            </div>
                            <div className="mt-2 space-y-1 font-mono text-[11px] text-[#3b342c]">
                              <div>
                                Retry max:{" "}
                                {typeof task.retry_policy?.max_attempts === "number"
                                  ? task.retry_policy.max_attempts
                                  : 1}
                              </div>
                              <div>
                                Escalation:{" "}
                                {typeof task.retry_policy?.escalation === "string"
                                  ? task.retry_policy.escalation
                                  : "not set"}
                              </div>
                              <div>Estimate: {task.estimated_minutes ?? "--"}m</div>
                              <div>Actual: {task.actual_minutes ?? "--"}m</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                              Created
                            </div>
                            <div className="mt-2 font-mono text-[12px] text-[#3b342c]">
                              {new Date(task.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                              Updated
                            </div>
                            <div className="mt-2 font-mono text-[12px] text-[#3b342c]">
                              {new Date(task.updated_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card variant="glass">
                      <CardHeader>
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                          Methodology Coverage
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <MetricCell
                          label="Decomposition Coverage"
                          value={percent(readiness?.methodology.decomposition_coverage ?? 0)}
                        />
                        <MetricCell
                          label="Forecast Accuracy"
                          value={percent(readiness?.methodology.forecast_accuracy ?? 0)}
                        />
                        <MetricCell
                          label="Handoff Success"
                          value={percent(readiness?.methodology.handoff_success_rate ?? 0)}
                        />
                        <MetricCell
                          label="Duplicate Work Avoidance"
                          value={percent(readiness?.methodology.duplicate_work_avoidance ?? 0)}
                        />
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              if (activeTab === "work-graph") {
                return (
                  <div className="space-y-4">
                    {goals.length === 0 ? (
                      <EmptyState
                        title="No work graph nodes yet"
                        description="Add goals with execution contracts so the planner can materialize a real DAG."
                        action={<Button onClick={() => openGoalCreate()}>Add Goal</Button>}
                      />
                    ) : (
                      <>
                        <Table>
                          <THead>
                            <tr>
                              <Th>Node</Th>
                              <Th>Role</Th>
                              <Th>Owner</Th>
                              <Th>Contract</Th>
                              <Th>Time</Th>
                              <Th>Dependencies</Th>
                              <Th />
                            </tr>
                          </THead>
                          <TBody>
                            {goals.map((goal) => (
                              <Tr key={goal.id}>
                                <Td>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[#0a0a0a]">
                                        {goal.title}
                                      </span>
                                      <Badge variant={statusVariant(goal.status)}>{goal.status}</Badge>
                                    </div>
                                    <div className="font-mono text-[11px] text-[#6b6050]">
                                      {goal.node_type} / depth {goal.depth}
                                    </div>
                                    {goal.description && (
                                      <div className="text-[12px] leading-5 text-[#3b342c]">
                                        {goal.description}
                                      </div>
                                    )}
                                  </div>
                                </Td>
                                <Td>
                                  <div className="space-y-1">
                                    <Badge variant="outline">{goal.orchestration_role}</Badge>
                                    {goal.requires_all_subgoals && (
                                      <Badge variant="warning">all subgoals required</Badge>
                                    )}
                                  </div>
                                </Td>
                                <Td>
                                  <div className="font-mono text-[11px] text-[#3b342c]">
                                    {goal.assigned_agent_id || "Unassigned"}
                                  </div>
                                </Td>
                                <Td>
                                  <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                                    <div>Inputs: {goal.input_spec.length}</div>
                                    <div>Outputs: {goal.output_spec.length}</div>
                                    <div>Verify: {goal.verification_method || "none"}</div>
                                    <div>Evidence: {goal.evidence.length}</div>
                                  </div>
                                </Td>
                                <Td>
                                  <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                                    <div>Est: {goal.estimated_minutes ?? "--"}m</div>
                                    <div>Actual: {goal.actual_minutes ?? "--"}m</div>
                                  </div>
                                </Td>
                                <Td>
                                  <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                                    {(dependencyMap[goal.id] ?? []).length === 0 ? (
                                      <span>None</span>
                                    ) : (
                                      (dependencyMap[goal.id] ?? []).map((dependency) => (
                                        <div key={dependency.id}>
                                          {goalNameMap[dependency.depends_on_goal_id] ?? "Unknown"}{" "}
                                          <span className="text-[#6b6050]">
                                            ({dependency.dependency_kind})
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Td>
                                <Td className="text-right">
                                  <Button size="sm" variant="secondary" onClick={() => openGoalEdit(goal)}>
                                    Edit
                                  </Button>
                                </Td>
                              </Tr>
                            ))}
                          </TBody>
                        </Table>

                        {plan && (
                          <Card variant="glass">
                            <CardHeader className="flex items-center justify-between">
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                                  Materialized Execution Plan
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                                  <Badge variant="outline">{plan.methodology_version}</Badge>
                                </div>
                              </div>
                              <Button variant="outline" onClick={() => setShowReviewModal(true)}>
                                Submit Review
                              </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid gap-3 md:grid-cols-4">
                                <MetricCell label="Nodes" value={String(plan.nodes.length)} />
                                <MetricCell label="Edges" value={String(plan.edges.length)} />
                                <MetricCell
                                  label="Completed"
                                  value={String(readiness?.completed_nodes ?? 0)}
                                />
                                <MetricCell
                                  label="Review Decisions"
                                  value={String(plan.reviews.filter((review) => review.decision !== "pending").length)}
                                />
                              </div>
                              <Table>
                                <THead>
                                  <tr>
                                    <Th>Plan Node</Th>
                                    <Th>Status</Th>
                                    <Th>Verification</Th>
                                    <Th>Execution Quality</Th>
                                  </tr>
                                </THead>
                                <TBody>
                                  {plan.nodes.map((node) => (
                                    <Tr key={node.id}>
                                      <Td>
                                        <div className="space-y-1">
                                          <div className="font-semibold text-[#0a0a0a]">{node.title}</div>
                                          <div className="font-mono text-[11px] text-[#6b6050]">
                                            {node.node_type} / {node.orchestration_role}
                                          </div>
                                        </div>
                                      </Td>
                                      <Td>
                                        <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
                                      </Td>
                                      <Td>
                                        <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                                          <div>{node.verification_method || "No verification method"}</div>
                                          <div>Inputs {node.input_spec.length} / Outputs {node.output_spec.length}</div>
                                        </div>
                                      </Td>
                                      <Td>
                                        <div className="space-y-1 font-mono text-[11px] text-[#3b342c]">
                                          <div>Rework {node.rework_count}</div>
                                          <div>
                                            Handoffs {node.successful_handoff_count}/{node.handoff_count}
                                          </div>
                                          <div>
                                            Duplicate overlap{" "}
                                            {node.duplicate_overlap_score === null
                                              ? "--"
                                              : percent(node.duplicate_overlap_score)}
                                          </div>
                                        </div>
                                      </Td>
                                    </Tr>
                                  ))}
                                </TBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <Card variant="glass">
                    <CardHeader className="flex items-center justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                        Planner / Reviewer / Reconciler
                      </div>
                      <Button onClick={() => setShowReviewModal(true)} disabled={!plan}>
                        Submit Review
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <MetricCell label="Planner Reviews" value={String(readiness?.planner_reviews ?? 0)} />
                      <MetricCell label="Reviewer Reviews" value={String(readiness?.reviewer_reviews ?? 0)} />
                      <MetricCell label="Reconciler Reviews" value={String(readiness?.reconciler_reviews ?? 0)} />
                      <MetricCell
                        label="Reviewer Agreement"
                        value={percent(readiness?.methodology.reviewer_agreement_rate ?? 0)}
                      />
                    </CardContent>
                  </Card>

                  <Card variant="glass">
                    <CardHeader>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                        Review History
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!plan || plan.reviews.length === 0 ? (
                        <EmptyState
                          title="No review loop yet"
                          description="Materialize a plan and record planner, reviewer, and reconciler decisions here."
                          action={
                            !plan ? (
                              <Button onClick={handleMaterializePlan} loading={planBusy}>
                                Materialize Plan
                              </Button>
                            ) : undefined
                          }
                        />
                      ) : (
                        <div className="space-y-3">
                          {plan.reviews.map((review) => (
                            <div
                              key={review.id}
                              className="border-2 border-[#0a0a0a] bg-white px-4 py-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{review.review_type}</Badge>
                                <Badge variant={statusVariant(review.decision)}>{review.decision}</Badge>
                                {review.score !== null && (
                                  <Badge variant="glass">score {review.score}</Badge>
                                )}
                              </div>
                              {review.summary && (
                                <p className="mt-3 text-[13px] leading-6 text-[#3b342c]">
                                  {review.summary}
                                </p>
                              )}
                              {review.evidence_findings.length > 0 && (
                                <div className="mt-3 font-mono text-[11px] leading-5 text-[#3b342c]">
                                  {(review.evidence_findings as string[]).join(" | ")}
                                </div>
                              )}
                              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                                {new Date(review.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            }}
          </Tabs>
        </>
      )}

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Task"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Title
            </label>
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Description
            </label>
            <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={5} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Priority
              </label>
              <Select
                value={editPriority}
                onChange={(event) => setEditPriority(event.target.value)}
                options={taskPriorityOptions}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Status
              </label>
              <Select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value)}
                options={taskStatusOptions}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Credit Reward
              </label>
              <Input value={editCreditReward} onChange={(event) => setEditCreditReward(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Methodology
              </label>
              <Input value={task?.methodology_version ?? "v2"} disabled />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Passing Spec
            </label>
            <Textarea value={editPassingSpec} onChange={(event) => setEditPassingSpec(event.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Verification Method
              </label>
              <Input
                value={editVerificationMethod}
                onChange={(event) => setEditVerificationMethod(event.target.value)}
                placeholder="manual_review | command | checklist"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Verification Target
              </label>
              <Input
                value={editVerificationTarget}
                onChange={(event) => setEditVerificationTarget(event.target.value)}
                placeholder="artifact, command, or path"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Input Spec
              </label>
              <Textarea
                value={editInputSpec}
                onChange={(event) => setEditInputSpec(event.target.value)}
                rows={5}
                placeholder="One input expectation per line"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Output Spec
              </label>
              <Textarea
                value={editOutputSpec}
                onChange={(event) => setEditOutputSpec(event.target.value)}
                rows={5}
                placeholder="One output expectation per line"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Estimated Minutes
              </label>
              <Input
                value={editEstimatedMinutes}
                onChange={(event) => setEditEstimatedMinutes(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Actual Minutes
              </label>
              <Input
                value={editActualMinutes}
                onChange={(event) => setEditActualMinutes(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Retry Attempts
              </label>
              <Input
                value={editRetryMaxAttempts}
                onChange={(event) => setEditRetryMaxAttempts(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Escalation
              </label>
              <Input
                value={editRetryEscalation}
                onChange={(event) => setEditRetryEscalation(event.target.value)}
                placeholder="reviewer | planner | owner"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} loading={savingTask}>
              Save Task
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={editingGoalId ? "Edit Goal" : "Add Goal"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Title
              </label>
              <Input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Parent Goal
              </label>
              <Select
                value={goalParentId}
                onChange={(event) => setGoalParentId(event.target.value)}
                options={parentGoalOptions}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Description
            </label>
            <Textarea value={goalDescription} onChange={(event) => setGoalDescription(event.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Orchestration Role
              </label>
              <Select
                value={goalRole}
                onChange={(event) => setGoalRole(event.target.value)}
                options={orchestrationRoleOptions}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Node Type
              </label>
              <Select
                value={goalNodeType}
                onChange={(event) => setGoalNodeType(event.target.value)}
                options={nodeTypeOptions}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Assigned Agent
              </label>
              <Input
                value={goalAssignedAgentId}
                onChange={(event) => setGoalAssignedAgentId(event.target.value)}
                placeholder="agent_uuid"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Credit Reward
              </label>
              <Input
                value={goalCreditReward}
                onChange={(event) => setGoalCreditReward(event.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Verification Method
              </label>
              <Input
                value={goalVerificationMethod}
                onChange={(event) => setGoalVerificationMethod(event.target.value)}
                placeholder="command | manual_review | diff_check"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Verification Target
              </label>
              <Input
                value={goalVerificationTarget}
                onChange={(event) => setGoalVerificationTarget(event.target.value)}
                placeholder="path, command, or artifact"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Input Spec
              </label>
              <Textarea
                value={goalInputSpec}
                onChange={(event) => setGoalInputSpec(event.target.value)}
                rows={5}
                placeholder="One requirement per line"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Output Spec
              </label>
              <Textarea
                value={goalOutputSpec}
                onChange={(event) => setGoalOutputSpec(event.target.value)}
                rows={5}
                placeholder="One deliverable per line"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Passing Spec
            </label>
            <Textarea value={goalPassingSpec} onChange={(event) => setGoalPassingSpec(event.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Estimated Minutes
              </label>
              <Input value={goalEstimatedMinutes} onChange={(event) => setGoalEstimatedMinutes(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Actual Minutes
              </label>
              <Input value={goalActualMinutes} onChange={(event) => setGoalActualMinutes(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Retry Attempts
              </label>
              <Input value={goalRetryMaxAttempts} onChange={(event) => setGoalRetryMaxAttempts(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Escalation
              </label>
              <Input
                value={goalRetryEscalation}
                onChange={(event) => setGoalRetryEscalation(event.target.value)}
                placeholder="reviewer | planner | owner"
              />
            </div>
          </div>
          <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-3">
            <label className="flex items-center gap-3 font-mono text-[12px] text-[#3b342c]">
              <input
                type="checkbox"
                checked={goalRequiresAllSubgoals}
                onChange={(event) => setGoalRequiresAllSubgoals(event.target.checked)}
                className="h-4 w-4 accent-[#e5005a]"
              />
              Require all subgoals to complete before this node can pass
            </label>
          </div>
          <div className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Dependencies
            </div>
            {goals.filter((goal) => goal.id !== editingGoalId).length === 0 ? (
              <div className="font-mono text-[12px] text-[#6b6050]">No other goals available yet.</div>
            ) : (
              <div className="grid gap-2">
                {goals
                  .filter((goal) => goal.id !== editingGoalId)
                  .map((goal) => (
                    <div
                      key={goal.id}
                      className="grid gap-3 border border-[#0a0a0a]/10 px-3 py-3 md:grid-cols-[minmax(0,1fr)_180px]"
                    >
                      <label className="flex items-center gap-3 font-mono text-[12px] text-[#3b342c]">
                        <input
                          type="checkbox"
                          checked={goalDependencyIds.includes(goal.id)}
                          onChange={(event) => {
                            setGoalDependencyIds((current) =>
                              event.target.checked
                                ? [...current, goal.id]
                                : current.filter((dependencyId) => dependencyId !== goal.id)
                            );
                            setGoalDependencyKinds((current) => ({
                              ...current,
                              [goal.id]: current[goal.id] ?? "blocking",
                            }));
                          }}
                          className="h-4 w-4 accent-[#e5005a]"
                        />
                        <span>{goal.title}</span>
                      </label>
                      <Select
                        value={goalDependencyKinds[goal.id] ?? "blocking"}
                        disabled={!goalDependencyIds.includes(goal.id)}
                        onChange={(event) =>
                          setGoalDependencyKinds((current) => ({
                            ...current,
                            [goal.id]: event.target.value,
                          }))
                        }
                        options={[
                          { value: "blocking", label: "Blocking" },
                          { value: "soft", label: "Soft" },
                          { value: "review", label: "Review" },
                          { value: "informational", label: "Informational" },
                        ]}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowGoalModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGoal} loading={savingGoal}>
              {editingGoalId ? "Save Goal" : "Create Goal"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Submit Plan Review"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Review Type
              </label>
              <Select
                value={reviewType}
                onChange={(event) => setReviewType(event.target.value)}
                options={reviewTypeOptions}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Decision
              </label>
              <Select
                value={reviewDecision}
                onChange={(event) => setReviewDecision(event.target.value)}
                options={reviewDecisionOptions}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
              Summary
            </label>
            <Textarea value={reviewSummary} onChange={(event) => setReviewSummary(event.target.value)} rows={5} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Score
              </label>
              <Input value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} placeholder="0-100" />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6050]">
                Evidence Findings
              </label>
              <Textarea
                value={reviewEvidenceFindings}
                onChange={(event) => setReviewEvidenceFindings(event.target.value)}
                rows={4}
                placeholder="One finding per line"
              />
            </div>
          </div>
          <div className="border-2 border-[#0a0a0a] bg-[#faf7f2] px-4 py-3 font-mono text-[11px] leading-5 text-[#3b342c]">
            Planner approval must happen first. Reviewer approval requires a distinct actor
            from the planner, and reconciler approval requires a distinct actor from both
            earlier stages.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} loading={reviewBusy} disabled={!plan}>
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
