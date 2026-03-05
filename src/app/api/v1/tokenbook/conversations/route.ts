import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type {
  AgentNameSummary,
  ConversationRow,
  LastConversationMessageRow,
  MessageRow,
  TokenbookInsert,
} from "@/lib/tokenbook/types";
import { runTokenbookRpc } from "@/lib/tokenbook/types";
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
    .from("conversations")
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

  const conversationRows = (conversations ?? []) as ConversationRow[];
  if (conversationRows.length === 0) {
    return NextResponse.json({ conversations: [], limit, offset });
  }

  const participantIds = Array.from(
    new Set(conversationRows.flatMap((conversation) => [conversation.initiator_id, conversation.recipient_id]))
  );
  const conversationIds = conversationRows.map((conversation) => conversation.id);

  const [{ data: participantRows }, { data: rpcLastMessageRows, error: rpcLastMessageError }] =
    await Promise.all([
      db.from("agents").select("id, name").in("id", participantIds),
      runTokenbookRpc<LastConversationMessageRow[]>(db, "get_last_messages_for_conversations", {
        p_conversation_ids: conversationIds,
      }),
    ]);
  let messageRows = (rpcLastMessageRows ?? []) as LastConversationMessageRow[];
  if (rpcLastMessageError) {
    const { data: fallbackRows } = await db
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    messageRows = (fallbackRows ?? []) as Pick<
      MessageRow,
      "id" | "conversation_id" | "sender_id" | "content" | "created_at"
    >[];
  }

  const nameByAgentId = new Map<string, string>();
  for (const row of (participantRows ?? []) as AgentNameSummary[]) {
    nameByAgentId.set(row.id, row.name);
  }

  // Keep one latest-message row per conversation.
  const lastMessageByConversationId = new Map<string, LastConversationMessageRow>();
  for (const row of messageRows) {
    if (!lastMessageByConversationId.has(row.conversation_id)) {
      lastMessageByConversationId.set(row.conversation_id, row);
    }
  }

  const enriched = conversationRows.map((conversation) => {
    const participants = [
      { id: conversation.initiator_id, name: nameByAgentId.get(conversation.initiator_id) ?? "unknown" },
      { id: conversation.recipient_id, name: nameByAgentId.get(conversation.recipient_id) ?? "unknown" },
    ];

    const lastMessage = lastMessageByConversationId.get(conversation.id);
    return {
      id: conversation.id,
      initiator_id: conversation.initiator_id,
      recipient_id: conversation.recipient_id,
      status: conversation.status,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      participants,
      last_message: lastMessage
        ? {
            id: lastMessage.id,
            sender_id: lastMessage.sender_id,
            sender_name: nameByAgentId.get(lastMessage.sender_id) ?? "unknown",
            content: lastMessage.content,
            created_at: lastMessage.created_at,
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
    .from("conversations")
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
        conversation_id: existingConversation.id,
        status: existingConversation.status,
      },
      { status: 409 }
    );
  }

  // Create conversation
  const newConversation: TokenbookInsert<"conversations"> = {
    initiator_id: agentId,
    recipient_id: recipientId,
    status: "pending",
  };
  const { data: conversation, error: convError } = await db
    .from("conversations")
    .insert(newConversation)
    .select("*")
    .single();

  if (convError || !conversation) {
    if ((convError as { code?: string } | null)?.code === "23505") {
      const { data: conflictingConversation } = await db
        .from("conversations")
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
          conversation_id: conflictingConversation?.id ?? null,
          status: conflictingConversation?.status ?? null,
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
  const typedConversation = conversation as ConversationRow;
  const newMessage: TokenbookInsert<"messages"> = {
    conversation_id: typedConversation.id,
    sender_id: agentId,
    content: messageContent.trim(),
  };
  const { data: message, error: msgError } = await db
    .from("messages")
    .insert(newMessage)
    .select("*")
    .single();

  if (msgError || !message) {
    // Rollback conversation
    await db
      .from("conversations")
      .delete()
      .eq("id", typedConversation.id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to send initial message" } },
      { status: 500 }
    );
  }

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_conversation_start", {
    recipient_id: recipientId,
  }).catch(() => {});

  const typedMessage = message as MessageRow;

  return NextResponse.json(
    {
      conversation: {
        id: typedConversation.id,
        initiator_id: typedConversation.initiator_id,
        recipient_id: typedConversation.recipient_id,
        status: typedConversation.status,
        created_at: typedConversation.created_at,
      },
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
