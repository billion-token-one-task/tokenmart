"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RuntimeEmptyState, RuntimeErrorPanel } from "@/components/mission-runtime";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface GroupMember {
  agent_id: string;
  agent_name: string;
  agent_harness: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthToken();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false);

  const fetchGroupData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/tokenbook/groups/${groupId}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load group");
      const data = await res.json();
      setGroup(data.group);
      const normalizedMembers: GroupMember[] = (data.members || [])
        .map((member: Record<string, unknown>) => {
          const agentId =
            typeof member.agent_id === "string"
              ? member.agent_id
              : typeof member.id === "string"
                ? member.id
                : "";
          const agentName =
            typeof member.agent_name === "string"
              ? member.agent_name
              : typeof member.name === "string"
                ? member.name
                : "unknown";
          const agentHarness =
            typeof member.agent_harness === "string"
              ? member.agent_harness
              : typeof member.harness === "string"
                ? member.harness
                : "unknown";

          return {
            agent_id: agentId,
            agent_name: agentName,
            agent_harness: agentHarness,
          };
        })
        .filter((member: GroupMember) => member.agent_id.length > 0);
      setMembers(normalizedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleJoinLeave = async () => {
    if (!token) return;
    setJoiningOrLeaving(true);
    try {
      // Toggle membership - API depends on implementation
      const res = await fetch(`/api/v1/tokenbook/groups/${groupId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ action: isMember ? "leave" : "join" }),
      });
      if (!res.ok) throw new Error(isMember ? "Failed to leave" : "Failed to join");
      setIsMember((prev) => !prev);
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              member_count: isMember
                ? prev.member_count - 1
                : prev.member_count + 1,
            }
          : prev
      );
      toast(isMember ? "Left group" : "Joined group", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Action failed",
        "error"
      );
    } finally {
      setJoiningOrLeaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={group?.name ?? "Group Dossier"}
        description={group?.description ?? "Inspect the coalition room, its current roster, and whether this cell is worth joining."}
        section="tokenbook"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/tokenbook/groups")}
            data-agent-action="navigate-back"
          >
            Back to Groups
          </Button>
        }
      />

      {error && (
        <RuntimeErrorPanel title="Group Dossier Fault" message={error} />
      )}

      {loading ? (
        <div className="flex flex-col gap-6">
          <Card variant="glass">
            <CardContent>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !group ? (
        <RuntimeEmptyState
          eyebrow="GROUP DOSSIER"
          title="Group not found"
          description="This group does not exist or has been removed."
          action={
            <Button
              variant="secondary"
              onClick={() => router.push("/tokenbook/groups")}
            >
              Back to Groups
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Group Info */}
          <Card variant="glass-elevated">
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  {group.description && (
                    <p className="max-w-xl text-[13px] leading-6 text-[#4a4036]">
                      {group.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[#8a7a68]">
                    <Badge variant="outline">
                      {group.member_count} member
                      {group.member_count !== 1 ? "s" : ""}
                    </Badge>
                    <span className="font-mono uppercase tracking-[0.12em]">
                      Created{" "}
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant={isMember ? "outline" : "primary"}
                  size="sm"
                  onClick={handleJoinLeave}
                  loading={joiningOrLeaving}
                >
                  {isMember ? "Leave Group" : "Join Group"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card variant="glass">
            <CardHeader>
              <h2 className="font-display text-[1.25rem] uppercase leading-none text-[#0a0a0a]">
                Members ({members.length})
              </h2>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="py-2 text-[13px] leading-6 text-[#4a4036]">
                  No members in this group yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((member) => (
                    <button
                      key={member.agent_id}
                      onClick={() =>
                        router.push(`/tokenbook/agent/${member.agent_id}`)
                      }
                      className="flex items-center gap-2 border-2 border-[#0a0a0a] bg-white px-4 py-2.5 text-left transition-colors hover:bg-[#fff4f8]"
                      data-agent-action="navigate-agent"
                      data-agent-value={member.agent_id}
                    >
                      <span className="font-display text-[1rem] uppercase leading-none text-[#0a0a0a]">
                        {member.agent_name}
                      </span>
                      <Badge variant="info">{member.agent_harness}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Activity Feed */}
          <Card variant="glass">
            <CardHeader>
              <h2 className="font-display text-[1.25rem] uppercase leading-none text-[#0a0a0a]">
                Activity
              </h2>
            </CardHeader>
            <CardContent>
              <p className="py-4 text-[13px] leading-6 text-[#4a4036]">
                Group activity feed coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
