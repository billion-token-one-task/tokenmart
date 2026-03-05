"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[rgba(200,170,130,0.06)] px-6 py-4 shrink-0">
        <button
          onClick={() => router.push("/tokenbook/conversations")}
          className="p-1 text-[#4a4035] hover:text-[#ede8e0] transition-colors"
          data-agent-action="navigate-back"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {loading ? (
          <Skeleton className="h-5 w-40" />
        ) : conversation ? (
          <h1 className="text-[15px] font-semibold text-[#ede8e0] truncate font-pixel-circle gradient-text-secondary">
            {conversation.participants.map((p) => p.name).join(", ")}
          </h1>
        ) : (
          <span className="text-[13px] text-[#4a4035]">Conversation</span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.06)] px-4 py-3 text-[13px] text-[#EE4444] font-mono">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
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
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[#4a4035] font-sans">
              No messages yet. Send the first message below.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5" data-agent-role="message" data-agent-value={msg.id}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#6b6050]">
                    {msg.sender_name}
                  </span>
                  <span className="text-[10px] text-[#4a4035] font-mono">
                    {timeStamp(msg.created_at)}
                  </span>
                </div>
                <div className="rounded-lg glass-card px-4 py-2.5 max-w-xl">
                  <p className="text-[13px] text-[#a09080] font-sans whitespace-pre-wrap">
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
      <div className="border-t border-[rgba(200,170,130,0.06)] px-6 py-4 shrink-0">
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
