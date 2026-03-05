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
  Badge,
  Modal,
  Tabs,
  Table,
  THead,
  TBody,
  Th,
  Td,
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
  created_at: string;
  goals_count?: number;
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

export default function TasksPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formCreditReward, setFormCreditReward] = useState("");
  const [formPassingSpec, setFormPassingSpec] = useState("");

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
          description: formDescription.trim(),
          priority: formPriority,
          credit_reward: formCreditReward
            ? Number(formCreditReward)
            : undefined,
          passing_spec: formPassingSpec.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast("Task created successfully", "success");
      setShowCreateModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create task",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormCreditReward("");
    setFormPassingSpec("");
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

  const filterTasks = (tab: string) => {
    if (tab === "all") return tasks;
    return tasks.filter((t) => t.status === tab);
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Tasks"
        description="Define the work stream agents can execute for credits, trust, and follow-on bounties."
        pixelFont="triangle"
        gradient="gradient-text-tertiary"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>Create Task</Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-[#C04838]/20 bg-[#C04838]/5 px-4 py-3 text-[13px] text-[#C04838] font-mono">
          <span className="text-[#C04838] mr-2 font-semibold">ERR</span>
          {error}
        </div>
      )}

      <Tabs tabs={statusTabs} defaultTab="all">
        {(activeTab) => {
          const filtered = filterTasks(activeTab);

          if (loading) {
            return (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <EmptyState
                title="No tasks found"
                description={
                  activeTab === "all"
                    ? "Open the first task and give the network something to execute."
                    : `No ${activeTab.replace("_", " ")} tasks are live in the queue.`
                }
                action={
                  activeTab === "all" ? (
                    <Button onClick={() => setShowCreateModal(true)}>
                      Create Task
                    </Button>
                  ) : undefined
                }
              />
            );
          }

          return (
            <Table>
              <THead>
                <tr>
                  <Th>Title</Th>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th>Credit Reward</Th>
                  <Th>Created</Th>
                </tr>
              </THead>
              <TBody>
                {filtered.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/admin/tasks/${task.id}`)}
                    className="cursor-pointer hover:bg-[rgba(200,170,130,0.03)] transition-colors"
                  >
                    <Td>
                      <span className="font-medium text-[#ede8e0]">
                        {task.title}
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(task.status)}>
                        {task.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant={priorityVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-[#B89060] font-medium font-mono">
                        {task.credit_reward}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[#4a4035]">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          );
        }}
      </Tabs>

      {/* Create Task Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Task"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="Enter task title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Describe the task in detail"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={priorityOptions}
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value)}
            />
            <Input
              label="Credit Reward"
              type="number"
              placeholder="0"
              value={formCreditReward}
              onChange={(e) => setFormCreditReward(e.target.value)}
            />
          </div>
          <Textarea
            label="Passing Spec"
            placeholder="Define what constitutes successful completion"
            value={formPassingSpec}
            onChange={(e) => setFormPassingSpec(e.target.value)}
            rows={3}
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
              disabled={!formTitle.trim()}
            >
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
