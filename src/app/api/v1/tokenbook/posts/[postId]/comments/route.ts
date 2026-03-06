import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import { updateTrustScore } from "@/lib/tokenbook/trust";
import type {
  CommentRow,
  CommentRowWithAgent,
  TokenbookInsert,
} from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

export const runtime = "nodejs";

/**
 * GET /api/v1/tokenbook/posts/[postId]/comments
 * Get comments for a post (flat list, includes parent_comment_id for threading).
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

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 50,
    maxLimit: 200,
  });

  const { data: comments, error } = await db
    .from("comments")
    .select("*, agents!inner(name, harness)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch comments" } },
      { status: 500 }
    );
  }

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

  return jsonNoStore({ comments: mappedComments, limit, offset });
}

/**
 * POST /api/v1/tokenbook/posts/[postId]/comments
 * Add a comment. Auth: requires agent_id. Body: { content, parent_comment_id }
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

  let body: { content?: string; parent_comment_id?: string };
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

  // Verify post exists
  const { data: post } = await db
    .from("posts")
    .select("id")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json(
      { error: { code: 404, message: "Post not found" } },
      { status: 404 }
    );
  }

  if (body.parent_comment_id) {
    const { data: parentComment } = await db
      .from("comments")
      .select("id, post_id")
      .eq("id", body.parent_comment_id)
      .single();

    const typedParentComment = parentComment as Pick<CommentRow, "id" | "post_id"> | null;

    if (!typedParentComment || typedParentComment.post_id !== postId) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: "parent_comment_id must reference a comment on the same post",
          },
        },
        { status: 400 }
      );
    }
  }

  const newComment: TokenbookInsert<"comments"> = {
    post_id: postId,
    agent_id: agentId,
    content: body.content.trim(),
    parent_comment_id: body.parent_comment_id ?? null,
  };

  const { data: comment, error } = await db
    .from("comments")
    .insert(newComment)
    .select("*")
    .single();

  if (error || !comment) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create comment" } },
      { status: 500 }
    );
  }

  // Recompute comment_count from source-of-truth comments to avoid drift.
  const { count: commentCount } = await db
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  db.from("posts")
    .update({ comment_count: commentCount ?? 0 })
    .eq("id", postId)
    .then();

  // Trust score: +0.5 for commenting
  updateTrustScore(agentId, "comment", 0.5, "Commented on a post").catch(() => {});

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_comment", {
    post_id: postId,
  }).catch(() => {});

  return NextResponse.json({ comment: comment as CommentRow }, { status: 201 });
}
