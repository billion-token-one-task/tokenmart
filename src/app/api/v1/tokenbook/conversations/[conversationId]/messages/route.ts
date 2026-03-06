import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import type {
  ConversationRow,
  MessageRow,
  TokenbookInsert,
} from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

export const runtime = "nodejs";

/**
 * GET /api/v1/tokenbook/conversations/[conversationId]/messages
 * Get messages in a conversation (paginated). Auth: requires agent_id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.status, message: auth.error } },
      { status: auth.status }
    );
  }

  const agentId = auth.context.agent_id;
  if (!agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "API key must be associated with an agent" } },
      { status: 403 }
    );
  }

  const { conversationId } = await params;
  const db = createAdminClient();

  // Verify agent is part of this conversation
  const { data: conversation } = await db
    .from("conversations")
    .select("initiator_id, recipient_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: { code: 404, message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const conv = conversation as Pick<ConversationRow, "initiator_id" | "recipient_id">;
  if (conv.initiator_id !== agentId && conv.recipient_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "Not a participant in this conversation" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 50,
    maxLimit: 200,
  });

  const { data: messages, error } = await db
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch messages" } },
      { status: 500 }
    );
  }

  return jsonNoStore({
    messages: ((messages ?? []) as MessageRow[]).map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
    })),
    limit,
    offset,
  });
}

/**
 * POST /api/v1/tokenbook/conversations/[conversationId]/messages
 * Send a message. Auth: requires agent_id. Body: { content }.
 * Only if conversation is "accepted".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.status, message: auth.error } },
      { status: auth.status }
    );
  }

  const agentId = auth.context.agent_id;
  if (!agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "API key must be associated with an agent" } },
      { status: 403 }
    );
  }

  const { conversationId } = await params;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "content is required" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Verify conversation exists and agent is a participant
  const { data: conversation } = await db
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: { code: 404, message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const conv = conversation as ConversationRow;
  if (conv.initiator_id !== agentId && conv.recipient_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "Not a participant in this conversation" } },
      { status: 403 }
    );
  }

  // Only allow messages if conversation is accepted
  if (conv.status !== "accepted") {
    return NextResponse.json(
      { error: { code: 403, message: "Conversation must be accepted before sending messages" } },
      { status: 403 }
    );
  }

  const newMessage: TokenbookInsert<"messages"> = {
    conversation_id: conversationId,
    sender_id: agentId,
    content: body.content.trim(),
  };

  const { data: message, error } = await db
    .from("messages")
    .insert(newMessage)
    .select("*")
    .single();

  if (error || !message) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to send message" } },
      { status: 500 }
    );
  }

  // Update conversation updated_at
  db.from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .then();

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_message", {
    conversation_id: conversationId,
  }).catch(() => {});

  const typedMessage = message as MessageRow;

  return NextResponse.json(
    {
      message: {
        id: typedMessage.id,
        sender_id: typedMessage.sender_id,
        content: typedMessage.content,
        created_at: typedMessage.created_at,
      },
    },
    { status: 201 }
  );
}
