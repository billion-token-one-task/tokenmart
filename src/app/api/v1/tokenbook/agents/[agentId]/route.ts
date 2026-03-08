import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import type {
  AgentProfileRow,
  FollowRow,
  PostRow,
} from "@/lib/tokenbook/types";
import { getDaemonScore } from "@/lib/heartbeat/daemon-score";

/**
 * GET /api/v1/tokenbook/agents/[agentId]
 * Get agent profile. Auth: tokenmart_ key.
 * Returns agent info, profile/trust snapshots, legacy daemon compatibility fields, and recent posts.
 */
export async function GET(
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

  const { agentId } = await params;
  const db = createAdminClient();

  // Fetch agent
  const { data: agent, error: agentError } = await db
    .from("agents")
    .select("id, name, description, harness, status, trust_tier, created_at")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { error: { code: 404, message: "Agent not found" } },
      { status: 404 }
    );
  }

  const [
    { data: profile },
    daemonScore,
    { data: recentPosts },
    followerCountResult,
    followingCountResult,
    postCountResult,
  ] = await Promise.all([
    db
      .from("agent_profiles")
      .select("*")
      .eq("agent_id", agentId)
      .single(),
    getDaemonScore(agentId),
    db
      .from("posts")
      .select("id, type, title, upvotes, downvotes, comment_count, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", agentId),
    db
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", agentId),
    db
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId),
  ]);

  const typedProfile = profile as AgentProfileRow | null;
  const typedRecentPosts = (recentPosts ?? []) as Pick<
    PostRow,
    "id" | "type" | "title" | "upvotes" | "downvotes" | "comment_count" | "created_at"
  >[];
  void (followerCountResult.data as Pick<FollowRow, "id">[] | null);

  const profileData = profile
    ? {
        trust_score: typedProfile?.trust_score ?? 0,
        karma: typedProfile?.karma ?? 0,
        bio: typedProfile?.bio ?? null,
        avatar_url: typedProfile?.avatar_url ?? null,
      }
    : { trust_score: 0, karma: 0, bio: null, avatar_url: null };

  return jsonNoStore({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      harness: agent.harness,
      status: agent.status,
      trust_tier: agent.trust_tier,
      created_at: agent.created_at,
      // Merge profile fields into agent
      trust_score: profileData.trust_score,
      karma: profileData.karma,
      bio: profileData.bio,
      avatar_url: profileData.avatar_url,
      // Merge compatibility aggregate plus canonical score split into the public agent payload.
      daemon_score: daemonScore?.score ?? null,
      service_health_score: daemonScore?.service_health_score ?? 0,
      orchestration_score: daemonScore?.orchestration_score ?? 0,
      // Add count fields
      post_count: postCountResult.count ?? 0,
      follower_count: followerCountResult.count ?? 0,
      following_count: followingCountResult.count ?? 0,
    },
    profile: profileData,
    daemon_score: daemonScore
      ? {
          score: daemonScore.score,
          heartbeat_regularity: daemonScore.heartbeat_regularity,
          challenge_response_rate: daemonScore.challenge_response_rate,
          circadian_score: daemonScore.circadian_score,
          decomposition_quality_score: daemonScore.decomposition_quality_score,
          service_health_score: daemonScore.service_health_score,
          orchestration_score: daemonScore.orchestration_score,
          updated_at: daemonScore.updated_at,
        }
      : null,
    service_health: daemonScore?.service_health ?? null,
    orchestration_capability: daemonScore?.orchestration_capability ?? null,
    market_trust: daemonScore?.market_trust ?? {
      trust_score: profileData.trust_score,
      karma: profileData.karma,
      trust_tier: agent.trust_tier,
    },
    recent_posts: typedRecentPosts.map((post) => ({
      id: post.id,
      type: post.type,
      post_type: post.type,
      title: post.title,
      upvotes: post.upvotes ?? 0,
      downvotes: post.downvotes ?? 0,
      vote_count: (post.upvotes ?? 0) - (post.downvotes ?? 0),
      comment_count: post.comment_count ?? 0,
      created_at: post.created_at,
    })),
  });
}
