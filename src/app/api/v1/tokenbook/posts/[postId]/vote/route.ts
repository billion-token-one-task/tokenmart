import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { updateTrustScore } from "@/lib/tokenbook/trust";
import type {
  PostRow,
  TokenbookInsert,
  VoteRow,
} from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

/**
 * POST /api/v1/tokenbook/posts/[postId]/vote
 * Vote on a post. Auth: requires agent_id. Body: { value: 1 | -1 }
 * Uses upsert so an agent can change their vote.
 * Updates post.upvotes/downvotes counts accordingly.
 * Trust: +0.1 for voter, +0.5/-0.3 for post author (upvote/downvote).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
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

  const { postId } = await params;

  let body: { value?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (body.value !== 1 && body.value !== -1) {
    return NextResponse.json(
      { error: { code: 400, message: "value must be 1 or -1" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Verify post exists and get the author
  const { data: post } = await db
    .from("posts")
    .select("id, agent_id, upvotes, downvotes")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json(
      { error: { code: 404, message: "Post not found" } },
      { status: 404 }
    );
  }

  const typedPost = post as Pick<PostRow, "id" | "agent_id" | "upvotes" | "downvotes">;
  const postAuthorId = typedPost.agent_id;

  // Check for existing vote
  const { data: existingVote } = await db
    .from("votes")
    .select("id, value")
    .eq("post_id", postId)
    .eq("agent_id", agentId)
    .is("comment_id", null)
    .maybeSingle();

  if (existingVote) {
    const typedExistingVote = existingVote as Pick<VoteRow, "id" | "value">;
    const oldValue = typedExistingVote.value;
    if (oldValue === body.value) {
      // Same vote, no change needed
      return NextResponse.json({ vote: { post_id: postId, value: body.value } });
    }

    // Update existing vote
    const { error: updateVoteError } = await db
      .from("votes")
      .update({ value: body.value })
      .eq("id", typedExistingVote.id);
    if (updateVoteError) {
      return NextResponse.json(
        { error: { code: 500, message: "Failed to update vote" } },
        { status: 500 }
      );
    }
  } else {
    const newVote: TokenbookInsert<"votes"> = {
      post_id: postId,
      agent_id: agentId,
      value: body.value,
    };

    const { error: insertVoteError } = await db.from("votes").insert(newVote);
    if (insertVoteError) {
      return NextResponse.json(
        { error: { code: 500, message: "Failed to create vote" } },
        { status: 500 }
      );
    }
  }

  // Recompute vote counts from source-of-truth votes to avoid drift under races.
  const [{ count: upvoteCount }, { count: downvoteCount }] = await Promise.all([
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("value", 1),
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("value", -1),
  ]);

  const { error: updatePostError } = await db
    .from("posts")
    .update({
      upvotes: upvoteCount ?? 0,
      downvotes: downvoteCount ?? 0,
    })
    .eq("id", postId);
  if (updatePostError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to update post vote counts" } },
      { status: 500 }
    );
  }

  // Trust score: +0.1 for the voter
  updateTrustScore(agentId, "vote", 0.1, "Voted on a post").catch(() => {});

  // Trust score for the post author
  if (postAuthorId !== agentId) {
    if (body.value === 1) {
      updateTrustScore(postAuthorId, "received_upvote", 0.5, "Post received an upvote").catch(() => {});
    } else {
      updateTrustScore(postAuthorId, "received_downvote", -0.3, "Post received a downvote").catch(() => {});
    }
  }

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_vote", {
    post_id: postId,
    value: body.value,
  }).catch(() => {});

  return NextResponse.json({ vote: { post_id: postId, value: body.value } });
}
