"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  EmptyState,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  credit_reward: number;
  passing_spec: string;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  path: string;
  parent_goal_id: string | null;
  requires_all_subgoals: boolean;
  passing_spec: string;
}

interface GoalTreeNode extends Goal {
  children: GoalTreeNode[];
}

function buildGoalTree(goals: Goal[]): GoalTreeNode[] {
  const nodeMap = new Map<string, GoalTreeNode>();
  const roots: GoalTreeNode[] = [];

  // Create nodes
  for (const goal of goals) {
    nodeMap.set(goal.id, { ...goal, children: [] });
  }

  // Build tree
  for (const goal of goals) {
    const node = nodeMap.get(goal.id)!;
    if (goal.parent_goal_id && nodeMap.has(goal.parent_goal_id)) {
      nodeMap.get(goal.parent_goal_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function GoalNode({
  node,
  depth,
  onAddSubGoal,
}: {
  node: GoalTreeNode;
  depth: number;
  onAddSubGoal: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success" as const;
      case "in_progress":
        return "warning" as const;
      case "failed":
        return "danger" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div>
      <div
        className="flex items-start gap-3 rounded-lg border border-[rgba(200,170,130,0.06)] bg-[rgba(200,170,130,0.02)] px-4 py-3 hover:bg-[rgba(200,170,130,0.04)] transition-colors"
        style={{ marginLeft: `${depth * 24}px` }}
      >
        {/* Expand / Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6b6050] hover:text-[#ede8e0] hover:bg-[rgba(200,170,130,0.06)] transition-colors"
        >
          {hasChildren ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              <path
                d="M4 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-[#444]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-[#ede8e0]">{node.title}</span>
            <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
            {node.requires_all_subgoals && hasChildren && (
              <Badge variant="outline">All required</Badge>
            )}
          </div>
          {node.description && (
            <p className="text-[13px] text-[#6b6050] mb-1">{node.description}</p>
          )}
          {node.passing_spec && (
            <p className="text-[13px] text-[#4a4035] italic">
              Spec: {node.passing_spec}
            </p>
          )}
        </div>

        <button
          onClick={() => onAddSubGoal(node.id)}
          className="shrink-0 text-[13px] text-[#6b6050] hover:text-[#ede8e0] px-2 py-1 rounded hover:bg-[rgba(200,170,130,0.06)] transition-colors"
          title="Add Sub-Goal"
        >
          + Sub-Goal
        </button>
      </div>

      {expanded &&
        node.children.map((child) => (
          <GoalNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onAddSubGoal={onAddSubGoal}
          />
        ))}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCreditReward, setEditCreditReward] = useState("");
  const [editPassingSpec, setEditPassingSpec] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  // Add goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalParentId, setGoalParentId] = useState("");
  const [goalPassingSpec, setGoalPassingSpec] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, goalsRes] = await Promise.all([
        fetch(`/api/v1/admin/tasks/${taskId}`, { headers: authHeaders(token) }),
        fetch(`/api/v1/admin/tasks/${taskId}/goals`, {
          headers: authHeaders(token),
        }),
      ]);
      if (!taskRes.ok) throw new Error("Failed to load task");
      if (!goalsRes.ok) throw new Error("Failed to load goals");

      const taskData = await taskRes.json();
      const goalsData = await goalsRes.json();

      setTask(taskData.task);
      setGoals(goalsData.goals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const openEditModal = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "medium");
    setEditCreditReward(String(task.credit_reward || ""));
    setEditPassingSpec(task.passing_spec || "");
    setEditStatus(task.status || "draft");
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!token || !task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          credit_reward: editCreditReward
            ? Number(editCreditReward)
            : undefined,
          passing_spec: editPassingSpec.trim() || undefined,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      toast("Task updated successfully", "success");
      setShowEditModal(false);
      fetchTask();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to update task",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const openGoalModal = (parentId?: string) => {
    setGoalTitle("");
    setGoalDescription("");
    setGoalParentId(parentId || "");
    setGoalPassingSpec("");
    setShowGoalModal(true);
  };

  const handleCreateGoal = async () => {
    if (!token || !goalTitle.trim()) return;
    setCreatingGoal(true);
    try {
      const res = await fetch(`/api/v1/admin/tasks/${taskId}/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          parent_goal_id: goalParentId || undefined,
          passing_spec: goalPassingSpec.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      toast("Goal created successfully", "success");
      setShowGoalModal(false);
      fetchTask();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create goal",
        "error"
      );
    } finally {
      setCreatingGoal(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success" as const;
      case "in_progress":
        return "warning" as const;
      case "completed":
        return "info" as const;
      case "draft":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  const priorityVariant = (priority: string) => {
    switch (priority) {
      case "critical":
        return "danger" as const;
      case "high":
        return "warning" as const;
      case "medium":
        return "info" as const;
      case "low":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  const goalTree = buildGoalTree(goals);

  const parentGoalOptions = [
    { value: "", label: "None (root goal)" },
    ...goals.map((g) => ({ value: g.id, label: g.title })),
  ];

  return (
    <div className="max-w-6xl">
      {/* Back link */}
      <Link
        href="/admin/tasks"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6b6050] hover:text-[#ede8e0] transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Tasks
      </Link>

      {error && (
        <div className="mb-6 rounded-lg border border-[#C04838]/20 bg-[#C04838]/5 px-4 py-3 text-[13px] text-[#C04838] font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : !task ? (
        <EmptyState
          title="Task not found"
          description="This task is unavailable or no longer part of the active queue."
          action={
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      ) : (
        <>
          {/* Task Info Card */}
          <Card variant="glass" className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight font-pixel-triangle gradient-text-tertiary">{task.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={statusVariant(task.status)}>
                      <span className="font-pixel-triangle">{task.status}</span>
                    </Badge>
                    <Badge variant={priorityVariant(task.priority)}>
                      <span className="font-pixel-triangle">{task.priority} priority</span>
                    </Badge>
                    <span className="text-[13px] text-[#B89060] font-medium font-mono">
                      {task.credit_reward} credits
                    </span>
                  </div>
                </div>
                <Button variant="secondary" onClick={openEditModal}>
                  Edit Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {task.description && (
                  <div>
                    <h3 className="text-[13px] font-medium text-[#6b6050] mb-1">
                      Description
                    </h3>
                    <p className="text-[13px] text-[#a09080] whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                )}
                {task.passing_spec && (
                  <div>
                    <h3 className="text-[13px] font-medium text-[#6b6050] mb-1">
                      Passing Spec
                    </h3>
                    <p className="text-[13px] text-[#a09080] whitespace-pre-wrap bg-[rgba(200,170,130,0.02)] rounded-lg p-3 border border-[rgba(200,170,130,0.06)] font-mono">
                      {task.passing_spec}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="text-[13px] font-medium text-[#6b6050] mb-1">
                    Created
                  </h3>
                  <p className="text-[13px] text-[#a09080]">
                    {new Date(task.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Tree */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#ede8e0]">
                    Goal Tree
                  </h2>
                  <p className="text-[13px] text-[#6b6050] mt-1">
                    {goals.length} goal{goals.length !== 1 ? "s" : ""} defined
                  </p>
                </div>
                <Button size="sm" onClick={() => openGoalModal()}>
                  Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <EmptyState
                  title="No goals yet"
                  description="Break this task into measurable checkpoints before agents start executing against it."
                  action={
                    <Button size="sm" onClick={() => openGoalModal()}>
                      Add First Goal
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {goalTree.map((node) => (
                    <GoalNode
                      key={node.id}
                      node={node}
                      depth={0}
                      onAddSubGoal={(parentId) => openGoalModal(parentId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Task Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Task"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              options={[
                { value: "draft", label: "Draft" },
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "completed", label: "Completed" },
              ]}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            />
            <Select
              label="Priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ]}
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
            />
          </div>
          <Input
            label="Credit Reward"
            type="number"
            value={editCreditReward}
            onChange={(e) => setEditCreditReward(e.target.value)}
          />
          <Textarea
            label="Passing Spec"
            value={editPassingSpec}
            onChange={(e) => setEditPassingSpec(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Goal Modal */}
      <Modal
        open={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Add Goal"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="Goal title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Describe this goal"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            rows={3}
          />
          <Select
            label="Parent Goal"
            options={parentGoalOptions}
            value={goalParentId}
            onChange={(e) => setGoalParentId(e.target.value)}
          />
          <Textarea
            label="Passing Spec"
            placeholder="Define success criteria for this goal"
            value={goalPassingSpec}
            onChange={(e) => setGoalPassingSpec(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowGoalModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGoal}
              loading={creatingGoal}
              disabled={!goalTitle.trim()}
            >
              Add Goal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
