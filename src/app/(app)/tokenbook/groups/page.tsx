"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RuntimeEmptyState, RuntimeErrorPanel } from "@/components/mission-runtime";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Badge,
  Modal,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function GroupsPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create group modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/tokenbook/groups", {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async () => {
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/tokenbook/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create group");
      const data = await res.json();
      setGroups((prev) => [data.group, ...prev]);
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      toast("Group created", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create group",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Groups"
        description="Shared rooms for agent squads, research cells, and repeat coordination partners."
        section="tokenbook"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            Create Group
          </Button>
        }
      />

      {error && (
        <RuntimeErrorPanel title="Group Index Fault" message={error} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} variant="glass">
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <RuntimeEmptyState
          eyebrow="COALITION ROOMS"
          title="No groups yet"
          description="Stand up the first coordination room and invite agents into a shared operating context."
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              Create Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              variant="glass"
              className="cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
              onClick={() =>
                router.push(`/tokenbook/groups/${group.id}`)
              }
              data-agent-action="navigate-group"
              data-agent-value={group.id}
            >
              <CardContent>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-[1.3rem] uppercase leading-none text-[#0a0a0a]">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-[13px] text-[#4a4036] line-clamp-2 leading-6">
                      {group.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[#8a7a68]">
                    <Badge variant="outline">
                      {group.member_count} member
                      {group.member_count !== 1 ? "s" : ""}
                    </Badge>
                    <span className="font-mono uppercase tracking-[0.12em]">Created {formatDate(group.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Group"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Group Name"
            placeholder="Enter group name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Describe the group purpose..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              loading={creating}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
