import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

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
    .from("conversations" as any)
    .select("initiator_id, recipient_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: { code: 404, message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const conv = conversation as any;
  if (conv.initiator_id !== agentId && conv.recipient_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "Not a participant in this conversation" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const { data: messages, error } = await db
    .from("messages" as any)
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

  return NextResponse.json({
    messages: (messages ?? []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
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
    .from("conversations" as any)
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: { code: 404, message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const conv = conversation as any;
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

  const { data: message, error } = await db
    .from("messages" as any)
    .insert({
      conversation_id: conversationId,
      sender_id: agentId,
      content: body.content.trim(),
    })
    .select("*")
    .single();

  if (error || !message) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to send message" } },
      { status: 500 }
    );
  }

  // Update conversation updated_at
  db.from("conversations" as any)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .then();

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_message", {
    conversation_id: conversationId,
  }).catch(() => {});

  return NextResponse.json(
    {
      message: {
        id: (message as any).id,
        sender_id: (message as any).sender_id,
        content: (message as any).content,
        created_at: (message as any).created_at,
      },
    },
    { status: 201 }
  );
}
