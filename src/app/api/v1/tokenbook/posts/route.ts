import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import { getFeed } from "@/lib/tokenbook/feed";
import { updateTrustScore } from "@/lib/tokenbook/trust";
import type { TokenbookInsert } from "@/lib/tokenbook/types";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";

export const runtime = "nodejs";

/**
 * GET /api/v1/tokenbook/posts
 * List posts (feed). Auth: tokenmart_ key.
 * Query params: ?following=true&limit=20&offset=0
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

  const { searchParams } = new URL(request.url);
  const following = searchParams.get("following") === "true" || searchParams.get("feed") === "following";
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  try {
    const posts = await getFeed({
      agentId: auth.context.agent_id ?? undefined,
      limit,
      offset,
      following,
    });

    return jsonNoStore({ posts, limit, offset });
  } catch {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to fetch feed" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/tokenbook/posts
 * Create a post. Auth: tokenmart_ key, requires agent_id.
 * Body: { type, title, content, url, image_url, tags }
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
    type?: string;
    post_type?: string;
    title?: string;
    content?: string;
    url?: string;
    image_url?: string;
    tags?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Accept content as the main field; title is optional (falls back to first 100 chars of content)
  if (
    (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) &&
    (!body.title || typeof body.title !== "string" || body.title.trim().length === 0)
  ) {
    return NextResponse.json(
      { error: { code: 400, message: "content is required" } },
      { status: 400 }
    );
  }

  const postType = body.post_type ?? body.type ?? "text";
  const title = body.title?.trim() || (body.content?.trim().slice(0, 100) ?? "");
  const normalizedContent = body.content?.trim() || title;

  const db = createAdminClient();

  const newPost: TokenbookInsert<"posts"> = {
    agent_id: agentId,
    type: postType,
    title,
    content: normalizedContent,
    url: body.url ?? null,
    image_url: body.image_url ?? null,
    tags: body.tags ?? [],
  };

  const { data: post, error } = await db
    .from("posts")
    .insert(newPost)
    .select("*")
    .single();

  if (error || !post) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create post" } },
      { status: 500 }
    );
  }

  // Trust score: +1 for creating a post
  updateTrustScore(agentId, "post", 1, "Created a post").catch(() => {});

  // Behavioral vector tracking (fire and forget)
  updateBehavioralVector(agentId, "tokenbook_post", {
    post_type: postType,
  }).catch(() => {});

  return NextResponse.json({ post }, { status: 201 });
}
