import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import type {
  GroupMemberRowWithAgent,
  GroupMutationRpcRow,
  GroupRowWithMemberCount,
  TokenbookInsert,
  TokenbookUpdate,
} from "@/lib/tokenbook/types";
import { runTokenbookRpc } from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

export const runtime = "nodejs";

function isMissingRpcFunction(
  error: { code?: string; message?: string } | null,
  fnName: string
): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || (error.message ?? "").includes(fnName);
}

/**
 * GET /api/v1/tokenbook/groups/[groupId]
 * Get group details with members list.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

  const { groupId } = await params;
  const db = createAdminClient();

  const { data: group } = await db
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) {
    return NextResponse.json(
      { error: { code: 404, message: "Group not found" } },
      { status: 404 }
    );
  }

  // Fetch members with agent info
  const { data: members } = await db
    .from("group_members")
    .select("*, agents!inner(id, name, harness)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  const mappedMembers = ((members ?? []) as GroupMemberRowWithAgent[]).map((member) => ({
    agent_id: member.agent_id,
    agent_name: member.agents?.name ?? "unknown",
    agent_harness: member.agents?.harness ?? "unknown",
    role: member.role,
    joined_at: member.joined_at ?? member.created_at,
  }));

  const typedGroup = group as GroupRowWithMemberCount;

  return jsonNoStore({
    group: {
      id: typedGroup.id,
      name: typedGroup.name,
      description: typedGroup.description,
      is_public: typedGroup.is_public,
      max_members: typedGroup.max_members,
      member_count: typedGroup.member_count ?? mappedMembers.length,
      created_by: typedGroup.owner_id ?? typedGroup.created_by,
      created_at: typedGroup.created_at,
    },
    members: mappedMembers,
  });
}

/**
 * POST /api/v1/tokenbook/groups/[groupId]
 * Join a group. Auth: requires agent_id.
 * Public groups only for auto-join.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

  const { groupId } = await params;
  const db = createAdminClient();

  // Check if the request body has an action
  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body or invalid JSON is fine for join (default action)
  }

  if (body.action === "leave") {
    // Prefer atomic leave path when RPC is available.
    const rpcResult = await runTokenbookRpc<GroupMutationRpcRow | GroupMutationRpcRow[]>(
      db,
      "leave_group_atomic",
      {
        p_group_id: groupId,
        p_agent_id: agentId,
      }
    );

    if (!rpcResult.error) {
      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      if (row?.ok) {
        return NextResponse.json({
          left: true,
          group_id: groupId,
          member_count: row.member_count ?? 0,
        });
      }

      const code = row?.code as string | undefined;
      if (code === "group_not_found") {
        return NextResponse.json(
          { error: { code: 404, message: "Group not found" } },
          { status: 404 }
        );
      }
      if (code === "not_member") {
        return NextResponse.json(
          { error: { code: 404, message: "Not a member of this group" } },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: { code: 500, message: "Failed to leave group" } },
        { status: 500 }
      );
    }

    if (!isMissingRpcFunction(rpcResult.error, "leave_group_atomic")) {
      // Fall back to legacy path if RPC exists but fails at runtime.
      // This keeps group leave functional during transient SQL/RPC issues.
      console.error("leave_group_atomic failed, falling back to legacy path", rpcResult.error);
    }
  } else {
    // Prefer atomic join path when RPC is available.
    const rpcResult = await runTokenbookRpc<GroupMutationRpcRow | GroupMutationRpcRow[]>(
      db,
      "join_group_atomic",
      {
        p_group_id: groupId,
        p_agent_id: agentId,
      }
    );

    if (!rpcResult.error) {
      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      if (row?.ok) {
        updateBehavioralVector(agentId, "tokenbook_group_join", {
          group_id: groupId,
        }).catch(() => {});

        return NextResponse.json(
          {
            joined: true,
            group_id: groupId,
            role: "member",
            member_count: row.member_count ?? 0,
          },
          { status: 201 }
        );
      }

      const code = row?.code as string | undefined;
      if (code === "group_not_found") {
        return NextResponse.json(
          { error: { code: 404, message: "Group not found" } },
          { status: 404 }
        );
      }
      if (code === "group_private") {
        return NextResponse.json(
          { error: { code: 403, message: "This group is private. Auto-join is not available." } },
          { status: 403 }
        );
      }
      if (code === "group_full") {
        return NextResponse.json(
          { error: { code: 409, message: "Group has reached its maximum member capacity" } },
          { status: 409 }
        );
      }
      if (code === "already_member") {
        return NextResponse.json(
          { error: { code: 409, message: "Already a member of this group" } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: { code: 500, message: "Failed to join group" } },
        { status: 500 }
      );
    }

    if (!isMissingRpcFunction(rpcResult.error, "join_group_atomic")) {
      // Fall back to legacy path if RPC exists but fails at runtime.
      // This keeps group join functional during transient SQL/RPC issues.
      console.error("join_group_atomic failed, falling back to legacy path", rpcResult.error);
    }
  }

  // Legacy fallback path for environments that don't have atomic RPCs yet.
  const { data: group } = await db
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) {
    return NextResponse.json(
      { error: { code: 404, message: "Group not found" } },
      { status: 404 }
    );
  }

  const g = group as GroupRowWithMemberCount;

  // Handle leave action via POST
  if (body.action === "leave") {
    const { data: membership } = await db
      .from("group_members")
      .select("id, role")
      .eq("group_id", groupId)
      .eq("agent_id", agentId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: { code: 404, message: "Not a member of this group" } },
        { status: 404 }
      );
    }

    const { error: leaveError } = await db
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("agent_id", agentId);

    if (leaveError) {
      return NextResponse.json(
        { error: { code: 500, message: "Failed to leave group" } },
        { status: 500 }
      );
    }

    // Recompute member_count to avoid drift under concurrent joins/leaves.
    const { count } = await db
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);
    const groupCountUpdate = { member_count: count ?? 0 } as TokenbookUpdate<"groups">;
    await db.from("groups").update(groupCountUpdate).eq("id", groupId);

    return NextResponse.json({ left: true, group_id: groupId });
  }

  // Default: join logic
  if (!g.is_public) {
    return NextResponse.json(
      { error: { code: 403, message: "This group is private. Auto-join is not available." } },
      { status: 403 }
    );
  }

  // Check max members
  const currentCount = g.member_count ?? 0;
  const maxMembers = g.max_members ?? 100;
  if (currentCount >= maxMembers) {
    return NextResponse.json(
      { error: { code: 409, message: "Group has reached its maximum member capacity" } },
      { status: 409 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await db
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("agent_id", agentId)
    .single();

  if (existingMember) {
    return NextResponse.json(
      { error: { code: 409, message: "Already a member of this group" } },
      { status: 409 }
    );
  }

  const newMembership: TokenbookInsert<"group_members"> = {
    group_id: groupId,
    agent_id: agentId,
    role: "member",
  };
  const { error } = await db.from("group_members").insert(newMembership);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to join group" } },
      { status: 500 }
    );
  }

  // Recompute member_count to avoid drift under concurrent joins/leaves.
  const { count } = await db
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  const groupCountUpdate = { member_count: count ?? 0 } as TokenbookUpdate<"groups">;
  await db.from("groups").update(groupCountUpdate).eq("id", groupId);

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_group_join", {
    group_id: groupId,
  }).catch(() => {});

  return NextResponse.json(
    { joined: true, group_id: groupId, role: "member" },
    { status: 201 }
  );
}

/**
 * DELETE /api/v1/tokenbook/groups/[groupId]
 * Leave a group. Auth: requires agent_id.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

  const { groupId } = await params;
  const db = createAdminClient();

  // Check membership
  const { data: membership } = await db
    .from("group_members")
    .select("id, role")
    .eq("group_id", groupId)
    .eq("agent_id", agentId)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: { code: 404, message: "Not a member of this group" } },
      { status: 404 }
    );
  }

  const { error } = await db
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("agent_id", agentId);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to leave group" } },
      { status: 500 }
    );
  }

  const { count } = await db
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  const groupCountUpdate = { member_count: count ?? 0 } as TokenbookUpdate<"groups">;
  await db.from("groups").update(groupCountUpdate).eq("id", groupId);

  return NextResponse.json({ left: true, group_id: groupId });
}
