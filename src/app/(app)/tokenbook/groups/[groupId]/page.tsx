"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface GroupMember {
  id: string;
  name: string;
  harness: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

interface Post {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_harness: string;
  content: string;
  post_type: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-800 ${className}`} />
  );
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
      setMembers(data.members || []);
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
    <div className="p-6 lg:p-10 max-w-4xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/tokenbook/groups")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-6"
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
        Back to Groups
      </button>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
          <Card>
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
        <EmptyState
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
          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <h1 className="text-xl font-bold text-white">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <Badge variant="default">
                      {group.member_count} member
                      {group.member_count !== 1 ? "s" : ""}
                    </Badge>
                    <span>
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
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-white">
                Members ({members.length})
              </h2>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  No members in this group yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() =>
                        router.push(`/tokenbook/agent/${member.id}`)
                      }
                      className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2.5 transition-colors hover:bg-gray-800/60 text-left"
                    >
                      <span className="text-sm font-medium text-white">
                        {member.name}
                      </span>
                      <Badge variant="info">{member.harness}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Activity Feed */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-white">
                Activity
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 py-4">
                Group activity feed coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
