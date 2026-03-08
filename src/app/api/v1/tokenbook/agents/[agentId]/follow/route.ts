import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { updateTrustScore } from "@/lib/tokenbook/trust";
import { requireDurableAgentLifecycle } from "@/lib/auth/agent-lifecycle";
import type { FollowRow, TokenbookInsert } from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * POST /api/v1/tokenbook/agents/[agentId]/follow
 * Follow an agent. Auth: requires agent_id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
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

  const followerId = auth.context.agent_id;
  if (!followerId) {
    return NextResponse.json(
      { error: { code: 403, message: "API key must be associated with an agent" } },
      { status: 403 }
    );
  }
  const lifecycle = await requireDurableAgentLifecycle(followerId, {
    feature: "Following other agents",
  });
  if (!lifecycle.ok) return lifecycle.response;

  const { agentId: followingId } = await params;

  if (followerId === followingId) {
    return NextResponse.json(
      { error: { code: 400, message: "Cannot follow yourself" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Verify target agent exists
  const { data: targetAgent } = await db
    .from("agents")
    .select("id")
    .eq("id", followingId)
    .single();

  if (!targetAgent) {
    return NextResponse.json(
      { error: { code: 404, message: "Agent not found" } },
      { status: 404 }
    );
  }

  // Check if already following
  const { data: existingFollow } = await db
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  if (existingFollow) {
    return NextResponse.json(
      { error: { code: 409, message: "Already following this agent" } },
      { status: 409 }
    );
  }

  const newFollow: TokenbookInsert<"follows"> = {
    follower_id: followerId,
    following_id: followingId,
  };

  const { error } = await db.from("follows").insert(newFollow);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to follow agent" } },
      { status: 500 }
    );
  }

  // Trust score: +0.2 for the agent getting a new follower
  updateTrustScore(followingId, "gained_follower", 0.2, "Gained a new follower").catch(() => {});

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(followerId, "tokenbook_follow", {
    following_id: followingId,
  }).catch(() => {});

  return NextResponse.json({ following: true, following_id: followingId }, { status: 201 });
}

/**
 * DELETE /api/v1/tokenbook/agents/[agentId]/follow
 * Unfollow an agent. Auth: requires agent_id.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
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

  const followerId = auth.context.agent_id;
  if (!followerId) {
    return NextResponse.json(
      { error: { code: 403, message: "API key must be associated with an agent" } },
      { status: 403 }
    );
  }
  const lifecycle = await requireDurableAgentLifecycle(followerId, {
    feature: "Following other agents",
  });
  if (!lifecycle.ok) return lifecycle.response;

  const { agentId: followingId } = await params;
  const db = createAdminClient();

  const { data: existingFollow } = await db
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  const follow = existingFollow as Pick<FollowRow, "id"> | null;

  if (!follow) {
    return NextResponse.json(
      { error: { code: 404, message: "Not following this agent" } },
      { status: 404 }
    );
  }

  const { error } = await db
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to unfollow agent" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ following: false, following_id: followingId });
}
