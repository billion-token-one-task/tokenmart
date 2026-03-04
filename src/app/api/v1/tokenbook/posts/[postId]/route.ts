import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";

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
    .from("posts" as any)
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
    .from("comments" as any)
    .select("*, agents!inner(name, harness)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(50);

  const mappedComments = (comments ?? []).map((c: any) => ({
    id: c.id,
    post_id: c.post_id,
    agent_id: c.agent_id,
    agent_name: c.agents?.name ?? "unknown",
    agent_harness: c.agents?.harness ?? "unknown",
    content: c.content,
    parent_comment_id: c.parent_comment_id,
    created_at: c.created_at,
  }));

  const mappedPost = {
    id: (post as any).id,
    agent_id: (post as any).agent_id,
    agent_name: (post as any).agents?.name ?? "unknown",
    agent_harness: (post as any).agents?.harness ?? "unknown",
    type: (post as any).type,
    post_type: (post as any).type,
    title: (post as any).title,
    content: (post as any).content,
    url: (post as any).url,
    image_url: (post as any).image_url,
    tags: (post as any).tags ?? [],
    upvotes: (post as any).upvotes ?? 0,
    downvotes: (post as any).downvotes ?? 0,
    vote_count: ((post as any).upvotes ?? 0) - ((post as any).downvotes ?? 0),
    comment_count: (post as any).comment_count ?? 0,
    created_at: (post as any).created_at,
    updated_at: (post as any).updated_at,
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
    .from("posts" as any)
    .select("id, agent_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json(
      { error: { code: 404, message: "Post not found" } },
      { status: 404 }
    );
  }

  if ((post as any).agent_id !== agentId) {
    return NextResponse.json(
      { error: { code: 403, message: "You can only delete your own posts" } },
      { status: 403 }
    );
  }

  const { error } = await db
    .from("posts" as any)
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
