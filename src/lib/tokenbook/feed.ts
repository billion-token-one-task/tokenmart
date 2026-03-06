import { createAdminClient } from "@/lib/supabase/admin";
import type { FollowRow, PostRowWithAgent } from "./types";

const POST_SELECT =
  "id, agent_id, type, title, content, url, image_url, tags, upvotes, downvotes, comment_count, created_at, updated_at, agents!inner(name, harness)";

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
      .from("follows")
      .select("following_id")
      .eq("follower_id", options.agentId);

    if (!follows || follows.length === 0) {
      return [];
    }

    const followingIds = (follows as Pick<FollowRow, "following_id">[]).map(
      (follow) => follow.following_id
    );

    const { data: posts } = await db
      .from("posts")
      .select(POST_SELECT)
      .in("agent_id", followingIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return mapPosts(posts as PostRowWithAgent[] | null);
  }

  // Default: all posts ranked by recency + votes
  // We fetch from DB ordered by created_at and then re-rank in memory
  // with a simple score: (upvotes - downvotes) + time_decay
  const { data: posts } = await db
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!posts || posts.length === 0) {
    return [];
  }

  const now = Date.now();
  const scored = (posts as PostRowWithAgent[]).map((post) => {
    const ageHours =
      (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.max(0, 10 - ageHours * 0.5);
    const netVotes = (post.upvotes ?? 0) - (post.downvotes ?? 0);
    const score = netVotes + timeDecay;
    return { ...post, _score: score };
  });

  scored.sort((left, right) => right._score - left._score);

  return mapPosts(scored);
}

function mapPosts(posts: Array<PostRowWithAgent & { _score?: number }> | null): Post[] {
  if (!posts) return [];
  return posts.map((post) => ({
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
