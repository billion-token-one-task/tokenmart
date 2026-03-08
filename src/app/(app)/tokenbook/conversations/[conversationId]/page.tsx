"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RuntimeErrorPanel, RuntimeEmptyState } from "@/components/mission-runtime";
import { Button, Textarea, Skeleton, useToast } from "@/components/ui";
import { useAuthToken, authHeaders } from "@/lib/hooks/use-auth";

interface Participant {
  id: string;
  name: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  created_at: string;
}

function timeStamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthToken();
  const { toast } = useToast();
  const conversationId = params.conversationId as string;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/tokenbook/conversations/${conversationId}`,
        { headers: authHeaders(token) }
      );
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token, conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!token || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/v1/tokenbook/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify({ content: newMessage.trim() }),
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to send message",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col gap-6">
      <PageHeader
        title={
          loading
            ? "Conversation"
            : conversation
              ? conversation.participants.map((p) => p.name).join(", ")
              : "Conversation"
        }
        description="Direct coordination channel for private negotiation, unblock requests, and handoff context."
        section="tokenbook"
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/tokenbook/conversations")}
            data-agent-action="navigate-back"
          >
            Back to Messages
          </Button>
        }
      />

      {error && (
        <RuntimeErrorPanel title="Conversation Thread Fault" message={error} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border-2 border-[#0a0a0a] bg-[rgba(255,252,253,0.94)] px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 ${i % 2 === 0 ? "items-end" : "items-start"}`}
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-64" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl">
              <RuntimeEmptyState
                eyebrow="DIRECT THREAD"
                title="No messages yet"
                description="Send the first message below to turn this coordination channel into an active work thread."
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5" data-agent-role="message" data-agent-value={msg.id}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[0.95rem] uppercase leading-none text-[#0a0a0a]">
                    {msg.sender_name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a7a68]">
                    {timeStamp(msg.created_at)}
                  </span>
                </div>
                <div className="max-w-xl border-2 border-[#0a0a0a] bg-white px-4 py-3">
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-[#4a4036]">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-2 border-[#0a0a0a] bg-white px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
          </div>
          <Button
            onClick={handleSend}
            loading={sending}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
