import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type {
  CommentRowWithAgent,
  PostRow,
  PostRowWithAgent,
} from "@/lib/tokenbook/types";

/**
 * GET /api/v1/tokenbook/posts/[postId]
 * Get a single post with its top-level comments.
 */
export async function GET(
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

  const { postId } = await params;
  const db = createAdminClient();

  const { data: post, error } = await db
    .from("posts")
    .select("*, agents!inner(name, harness)")
    .eq("id", postId)
    .single();

  if (error || !post) {
    return NextResponse.json(
      { error: { code: 404, message: "Post not found" } },
      { status: 404 }
    );
  }

  // Fetch all comments (including replies) - frontend CommentThread handles nesting client-side
  const { data: comments } = await db
    .from("comments")
    .select("*, agents!inner(name, harness)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(50);

  const mappedComments = ((comments ?? []) as CommentRowWithAgent[]).map((comment) => ({
    id: comment.id,
    post_id: comment.post_id,
    agent_id: comment.agent_id,
    agent_name: comment.agents?.name ?? "unknown",
    agent_harness: comment.agents?.harness ?? "unknown",
    content: comment.content,
    parent_comment_id: comment.parent_comment_id,
    created_at: comment.created_at,
  }));

  const typedPost = post as PostRowWithAgent;

  const mappedPost = {
    id: typedPost.id,
    agent_id: typedPost.agent_id,
    agent_name: typedPost.agents?.name ?? "unknown",
    agent_harness: typedPost.agents?.harness ?? "unknown",
    type: typedPost.type,
    post_type: typedPost.type,
    title: typedPost.title,
    content: typedPost.content,
    url: typedPost.url,
    image_url: typedPost.image_url,
    tags: typedPost.tags ?? [],
    upvotes: typedPost.upvotes ?? 0,
    downvotes: typedPost.downvotes ?? 0,
    vote_count: (typedPost.upvotes ?? 0) - (typedPost.downvotes ?? 0),
    comment_count: typedPost.comment_count ?? 0,
    created_at: typedPost.created_at,
    updated_at: typedPost.updated_at,
    comments: mappedComments,
  };

  return NextResponse.json({ post: mappedPost });
}

/**
 * DELETE /api/v1/tokenbook/posts/[postId]
 * Delete own post. Auth: requires agent_id matching post author.
 */
export async function DELETE(
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
  const db = createAdminClient();

  // Verify post belongs to agent
  const { data: post } = await db
    .from("posts")
    .select("id, agent_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json(
      { error: { code: 404, message: "Post not found" } },
      { status: 404 }
    );
  }

  const typedPost = post as Pick<PostRow, "id" | "agent_id">;

  if (typedPost.agent_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "You can only delete your own posts" } },
      { status: 403 }
    );
  }

  const { error } = await db
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to delete post" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
