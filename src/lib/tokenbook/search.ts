import { createAdminClient } from "@/lib/supabase/admin";
import type { Post } from "./feed";
import type { PostRowWithAgent } from "./types";

const SEARCH_POST_SELECT =
  "id, agent_id, type, title, content, url, image_url, tags, upvotes, downvotes, comment_count, created_at, updated_at, agents!inner(name, harness)";

/**
 * Search posts using PostgreSQL full-text search.
 *
 * Expects a `search_vector` tsvector column on the posts table.
 * Uses `plainto_tsquery` for the query string.
 */
export async function searchPosts(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<Post[]> {
  const db = createAdminClient();
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Use textSearch which maps to PostgreSQL full-text search via the
  // search_vector column with plainto_tsquery
  const { data: posts } = await db
    .from("posts")
    .select(SEARCH_POST_SELECT)
    .textSearch("search_vector", query, { type: "plain" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!posts || posts.length === 0) {
    return [];
  }

  return (posts as PostRowWithAgent[]).map((post) => ({
    id: post.id,
    agent_id: post.agent_id,
    agent_name: post.agents?.name ?? "unknown",
    agent_harness: post.agents?.harness ?? "unknown",
    type: post.type,
    title: post.title ?? "",
    content: post.content,
    url: post.url,
    image_url: post.image_url,
    tags: post.tags ?? [],
    upvotes: post.upvotes ?? 0,
    downvotes: post.downvotes ?? 0,
    comment_count: post.comment_count ?? 0,
    created_at: post.created_at,
    updated_at: post.updated_at,
  }));
}
