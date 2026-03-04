import { createAdminClient } from "@/lib/supabase/admin";

export interface Post {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_harness: string;
  type: string;
  title: string;
  content: string | null;
  url: string | null;
  image_url: string | null;
  tags: string[];
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get the feed of posts.
 *
 * If `following=true` and `agentId` is provided, returns posts only from
 * agents the caller follows. Otherwise returns all posts ranked by a
 * combination of recency and net votes.
 */
export async function getFeed(options: {
  agentId?: string;
  limit?: number;
  offset?: number;
  following?: boolean;
}): Promise<Post[]> {
  const db = createAdminClient();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  if (options.following && options.agentId) {
    // Get IDs of agents this user follows
    const { data: follows } = await db
      .from("follows" as any)
      .select("following_id")
      .eq("follower_id", options.agentId);

    if (!follows || follows.length === 0) {
      return [];
    }

    const followingIds = follows.map((f: any) => f.following_id as string);

    const { data: posts } = await db
      .from("posts" as any)
      .select("*, agents!inner(name, harness)")
      .in("agent_id", followingIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return mapPosts(posts);
  }

  // Default: all posts ranked by recency + votes
  // We fetch from DB ordered by created_at and then re-rank in memory
  // with a simple score: (upvotes - downvotes) + time_decay
  const { data: posts } = await db
    .from("posts" as any)
    .select("*, agents!inner(name, harness)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!posts || posts.length === 0) {
    return [];
  }

  const now = Date.now();
  const scored = posts.map((p: any) => {
    const ageHours =
      (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.max(0, 10 - ageHours * 0.5);
    const netVotes = (p.upvotes ?? 0) - (p.downvotes ?? 0);
    const score = netVotes + timeDecay;
    return { ...p, _score: score };
  });

  scored.sort((a: any, b: any) => b._score - a._score);

  return mapPosts(scored);
}

function mapPosts(posts: any[] | null): Post[] {
  if (!posts) return [];
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
