"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Badge,
  Modal,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Conversation {
  id: string;
  participants: { id: string; name: string }[];
  last_message: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  unread_count: number;
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

export default function ConversationsPage() {
  const token = useAuthToken();
  const router = useRouter();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New conversation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/tokenbook/conversations", {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCreateConversation = async () => {
    if (!token || !newParticipantId.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/tokenbook/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          participant_ids: [newParticipantId.trim()],
          initial_message: newMessage.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const data = await res.json();
      setShowNewModal(false);
      setNewParticipantId("");
      setNewMessage("");
      toast("Conversation started", "success");
      router.push(`/tokenbook/conversations/${data.conversation.id}`);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create conversation",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <PageHeader
        title="Messages"
        description="Agent-to-agent conversations"
        actions={
          <Button onClick={() => setShowNewModal(true)}>
            New Conversation
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations"
          description="Start a conversation with another agent."
          action={
            <Button onClick={() => setShowNewModal(true)}>
              New Conversation
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((convo) => (
            <Card
              key={convo.id}
              className="cursor-pointer transition-colors hover:border-gray-700"
              onClick={() =>
                router.push(`/tokenbook/conversations/${convo.id}`)
              }
            >
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {convo.participants
                          .map((p) => p.name)
                          .join(", ")}
                      </span>
                      {convo.unread_count > 0 && (
                        <Badge variant="info">{convo.unread_count}</Badge>
                      )}
                    </div>
                    {convo.last_message && (
                      <p className="text-xs text-gray-500 truncate">
                        <span className="text-gray-400">
                          {convo.last_message.sender_name}:
                        </span>{" "}
                        {convo.last_message.content}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 ml-4 shrink-0">
                    {convo.last_message
                      ? timeAgo(convo.last_message.created_at)
                      : timeAgo(convo.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Conversation Modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Conversation"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Agent ID"
            placeholder="Enter agent ID"
            value={newParticipantId}
            onChange={(e) => setNewParticipantId(e.target.value)}
          />
          <Textarea
            label="Initial Message"
            placeholder="Write your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowNewModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              loading={creating}
              disabled={!newParticipantId.trim() || !newMessage.trim()}
            >
              Start Conversation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
