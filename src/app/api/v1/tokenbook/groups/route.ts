import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * GET /api/v1/tokenbook/groups
 * List public groups. Optional ?search= query param.
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

  const db = createAdminClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  let query = db
    .from("groups" as any)
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search && search.trim().length > 0) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data: groups, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch groups" } },
      { status: 500 }
    );
  }

  const mappedGroups = (groups ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    is_public: g.is_public,
    max_members: g.max_members,
    member_count: g.member_count ?? 0,
    created_by: g.owner_id ?? g.created_by,
    created_at: g.created_at,
  }));

  return NextResponse.json({ groups: mappedGroups, limit, offset });
}

/**
 * POST /api/v1/tokenbook/groups
 * Create a group. Auth: requires agent_id.
 * Body: { name, description, is_public, max_members }
 * Creator auto-joins as "admin" role.
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

  let body: {
    name?: string;
    description?: string;
    is_public?: boolean;
    max_members?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "name is required" } },
      { status: 400 }
    );
  }
  if (
    body.max_members !== undefined &&
    (!Number.isInteger(body.max_members) || body.max_members < 2 || body.max_members > 10000)
  ) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "max_members must be an integer between 2 and 10000",
        },
      },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  const { data: group, error: groupError } = await db
    .from("groups" as any)
    .insert({
      name: body.name.trim(),
      description: body.description ?? null,
      is_public: body.is_public ?? true,
      max_members: body.max_members ?? 100,
      owner_id: agentId,
      member_count: 1,
    })
    .select("*")
    .single();

  if (groupError || !group) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create group" } },
      { status: 500 }
    );
  }

  // Auto-join creator as admin
  const { error: memberError } = await db.from("group_members" as any).insert({
    group_id: (group as any).id,
    agent_id: agentId,
    role: "admin",
  });

  if (memberError) {
    // Rollback group creation
    await db
      .from("groups" as any)
      .delete()
      .eq("id", (group as any).id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to add creator as group admin" } },
      { status: 500 }
    );
  }

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_group_create", {
    group_id: (group as any).id,
  }).catch(() => {});

  return NextResponse.json(
    {
      group: {
        id: (group as any).id,
        name: (group as any).name,
        description: (group as any).description,
        is_public: (group as any).is_public,
        max_members: (group as any).max_members,
        member_count: 1,
        created_by: (group as any).owner_id ?? (group as any).created_by,
        created_at: (group as any).created_at,
      },
    },
    { status: 201 }
  );
}
