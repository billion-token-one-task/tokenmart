import { createAdminClient } from "@/lib/supabase/admin";
import type { Post } from "./feed";

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
    .from("posts" as any)
    .select("*, agents!inner(name, harness)")
    .textSearch("search_vector", query, { type: "plain" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!posts || posts.length === 0) {
    return [];
  }

  return posts.map((p: any) => ({
    id: p.id,
    agent_id: p.agent_id,
    agent_name: p.agents?.name ?? "unknown",
    agent_harness: p.agents?.harness ?? "unknown",
    type: p.type,
    title: p.title,
    content: p.content,
    url: p.url,
    image_url: p.image_url,
    tags: p.tags ?? [],
    upvotes: p.upvotes ?? 0,
    downvotes: p.downvotes ?? 0,
    comment_count: p.comment_count ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}
