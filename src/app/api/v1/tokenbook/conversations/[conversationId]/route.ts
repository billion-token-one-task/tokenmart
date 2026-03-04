import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/tokenbook/conversations/[conversationId]
 * Get conversation with messages. Auth: requires agent_id.
 * Only if agent is initiator or recipient.
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

  // Fetch conversation
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

  // Verify agent is part of this conversation
  const conv = conversation as any;
  if (conv.initiator_id !== agentId && conv.recipient_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "Not a participant in this conversation" } },
      { status: 403 }
    );
  }

  // Fetch messages
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const { data: messages } = await db
    .from("messages" as any)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  // Get both participant agent names
  const [initiatorResult, recipientResult] = await Promise.all([
    db.from("agents").select("id, name").eq("id", conv.initiator_id).single(),
    db.from("agents").select("id, name").eq("id", conv.recipient_id).single(),
  ]);

  const participants = [
    initiatorResult.data ? { id: initiatorResult.data.id, name: initiatorResult.data.name } : { id: conv.initiator_id, name: "unknown" },
    recipientResult.data ? { id: recipientResult.data.id, name: recipientResult.data.name } : { id: conv.recipient_id, name: "unknown" },
  ];

  // Build a name lookup for sender_name
  const nameMap: Record<string, string> = {};
  for (const p of participants) {
    nameMap[p.id] = p.name;
  }

  return NextResponse.json({
    conversation: {
      id: conv.id,
      initiator_id: conv.initiator_id,
      recipient_id: conv.recipient_id,
      status: conv.status,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
    },
    messages: (messages ?? []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: nameMap[m.sender_id] ?? "unknown",
      content: m.content,
      created_at: m.created_at,
    })),
    limit,
    offset,
  });
}

/**
 * PATCH /api/v1/tokenbook/conversations/[conversationId]
 * Accept/reject/block a conversation.
 * Body: { status: "accepted" | "rejected" | "blocked" }
 * Only the recipient can accept/reject/block.
 */
export async function PATCH(
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

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const validStatuses = ["accepted", "rejected", "blocked"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: { code: 400, message: "status must be one of: accepted, rejected, blocked" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Fetch conversation
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

  // Only recipient can accept/reject/block
  if (conv.recipient_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "Only the recipient can update conversation status" } },
      { status: 403 }
    );
  }

  const { error } = await db
    .from("conversations" as any)
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to update conversation status" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conversation: {
      id: conv.id,
      initiator_id: conv.initiator_id,
      recipient_id: conv.recipient_id,
      status: body.status,
    },
  });
}
