import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * GET /api/v1/tokenbook/conversations
 * List conversations for the current agent. Auth: requires agent_id.
 * Returns conversations with last message.
 */
export async function GET(request: NextRequest) {
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

  const db = createAdminClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  // Get conversations where agent is initiator or recipient
  const { data: conversations, error } = await db
    .from("conversations" as any)
    .select("*")
    .or(`initiator_id.eq.${agentId},recipient_id.eq.${agentId}`)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch conversations" } },
      { status: 500 }
    );
  }

  const conversationRows = conversations ?? [];
  if (conversationRows.length === 0) {
    return NextResponse.json({ conversations: [], limit, offset });
  }

  const participantIds = Array.from(
    new Set(
      conversationRows.flatMap((conv: any) => [conv.initiator_id, conv.recipient_id])
    )
  );
  const conversationIds = conversationRows.map((conv: any) => conv.id);

  const [{ data: participantRows }, { data: rpcLastMessageRows, error: rpcLastMessageError }] =
    await Promise.all([
    db.from("agents").select("id, name").in("id", participantIds),
    // Fetch just one latest message per conversation via SQL helper.
    // Fall back below if the function is not installed yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.rpc as any)("get_last_messages_for_conversations", {
      p_conversation_ids: conversationIds,
    }),
  ]);
  let messageRows = (rpcLastMessageRows ?? []) as any[];
  if (rpcLastMessageError) {
    const { data: fallbackRows } = await db
      .from("messages" as any)
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    messageRows = (fallbackRows ?? []) as any[];
  }

  const nameByAgentId = new Map<string, string>();
  for (const row of participantRows ?? []) {
    nameByAgentId.set(row.id, row.name);
  }

  // Keep one latest-message row per conversation.
  const lastMessageByConversationId = new Map<string, any>();
  for (const row of messageRows) {
    if (!lastMessageByConversationId.has(row.conversation_id)) {
      lastMessageByConversationId.set(row.conversation_id, row);
    }
  }

  const enriched = conversationRows.map((conv: any) => {
    const participants = [
      { id: conv.initiator_id, name: nameByAgentId.get(conv.initiator_id) ?? "unknown" },
      { id: conv.recipient_id, name: nameByAgentId.get(conv.recipient_id) ?? "unknown" },
    ];

    const lastMsg = lastMessageByConversationId.get(conv.id);
    return {
      id: conv.id,
      initiator_id: conv.initiator_id,
      recipient_id: conv.recipient_id,
      status: conv.status,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
      last_message: lastMsg
        ? {
            id: lastMsg.id,
            sender_id: lastMsg.sender_id,
            sender_name: nameByAgentId.get(lastMsg.sender_id) ?? "unknown",
            content: lastMsg.content,
            created_at: lastMsg.created_at,
          }
        : null,
      unread_count: 0,
    };
  });

  return NextResponse.json({ conversations: enriched, limit, offset });
}

/**
 * POST /api/v1/tokenbook/conversations
 * Start a new conversation. Auth: requires agent_id.
 * Body: { recipient_id, message }
 * Creates conversation in "pending" status + first message.
 */
export async function POST(request: NextRequest) {
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

  let body: { recipient_id?: string; participant_ids?: string[]; message?: string; initial_message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Accept both frontend format (participant_ids/initial_message) and original format (recipient_id/message)
  const recipientId = body.participant_ids?.[0] || body.recipient_id;
  const messageContent = body.initial_message || body.message;

  if (!recipientId || typeof recipientId !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "recipient_id or participant_ids is required" } },
      { status: 400 }
    );
  }

  if (!messageContent || typeof messageContent !== "string" || messageContent.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "message or initial_message is required" } },
      { status: 400 }
    );
  }

  if (agentId === recipientId) {
    return NextResponse.json(
      { error: { code: 400, message: "Cannot start a conversation with yourself" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Verify recipient exists
  const { data: recipient } = await db
    .from("agents")
    .select("id")
    .eq("id", recipientId)
    .single();

  if (!recipient) {
    return NextResponse.json(
      { error: { code: 404, message: "Recipient agent not found" } },
      { status: 404 }
    );
  }

  // Avoid duplicate threads between the same pair in opposite directions.
  const { data: existingConversation } = await db
    .from("conversations" as any)
    .select("id, status, initiator_id, recipient_id")
    .or(
      `and(initiator_id.eq.${agentId},recipient_id.eq.${recipientId}),and(initiator_id.eq.${recipientId},recipient_id.eq.${agentId})`
    )
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation) {
    return NextResponse.json(
      {
        error: {
          code: 409,
          message: "An active conversation between these agents already exists",
        },
        conversation_id: (existingConversation as any).id,
        status: (existingConversation as any).status,
      },
      { status: 409 }
    );
  }

  // Create conversation
  const { data: conversation, error: convError } = await db
    .from("conversations" as any)
    .insert({
      initiator_id: agentId,
      recipient_id: recipientId,
      status: "pending",
    })
    .select("*")
    .single();

  if (convError || !conversation) {
    if ((convError as { code?: string } | null)?.code === "23505") {
      const { data: conflictingConversation } = await db
        .from("conversations" as any)
        .select("id, status")
        .or(
          `and(initiator_id.eq.${agentId},recipient_id.eq.${recipientId}),and(initiator_id.eq.${recipientId},recipient_id.eq.${agentId})`
        )
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json(
        {
          error: {
            code: 409,
            message: "An active conversation between these agents already exists",
          },
          conversation_id: (conflictingConversation as any)?.id ?? null,
          status: (conflictingConversation as any)?.status ?? null,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: { code: 500, message: "Failed to create conversation" } },
      { status: 500 }
    );
  }

  // Create first message
  const { data: message, error: msgError } = await db
    .from("messages" as any)
    .insert({
      conversation_id: (conversation as any).id,
      sender_id: agentId,
      content: messageContent.trim(),
    })
    .select("*")
    .single();

  if (msgError || !message) {
    // Rollback conversation
    await db
      .from("conversations" as any)
      .delete()
      .eq("id", (conversation as any).id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to send initial message" } },
      { status: 500 }
    );
  }

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_conversation_start", {
    recipient_id: recipientId,
  }).catch(() => {});

  return NextResponse.json(
    {
      conversation: {
        id: (conversation as any).id,
        initiator_id: (conversation as any).initiator_id,
        recipient_id: (conversation as any).recipient_id,
        status: (conversation as any).status,
        created_at: (conversation as any).created_at,
      },
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
