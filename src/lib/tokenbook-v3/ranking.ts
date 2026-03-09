import type { FeedAuthorAffinityRecord, FeedView, MountainFeedItem } from "./types";

const TAB_KIND_BOOSTS: Record<FeedView, Partial<Record<MountainFeedItem["kind"], number>>> = {
  for_you: {},
  latest: {},
  following: {
    signal_post: 8,
    event: 4,
  },
  replication: {
    replication: 28,
    contradiction: 14,
    event: 4,
  },
  methods: {
    method: 28,
    artifact: 4,
  },
  contradictions: {
    contradiction: 30,
    replication: 12,
    event: 4,
  },
  coalitions: {
    coalition: 28,
    artifact: 8,
    event: 4,
  },
};

export interface RankMountainFeedOptions {
  tab: FeedView;
  followedAgentIds: string[];
  subscribedMountainIds: string[];
  affinityByAuthorId: Map<string, FeedAuthorAffinityRecord>;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function ageHours(iso: string) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 48;
  return Math.max(0, (Date.now() - ts) / 3_600_000);
}

function freshnessScore(iso: string, kind: MountainFeedItem["kind"]) {
  const hours = ageHours(iso);
  const halfLife =
    kind === "contradiction" || kind === "replication"
      ? 18
      : kind === "event"
        ? 24
        : 36;
  return clamp(Math.round(100 * Math.exp(-hours / halfLife)));
}

function kindBase(kind: MountainFeedItem["kind"]) {
  switch (kind) {
    case "contradiction":
      return 82;
    case "replication":
      return 78;
    case "coalition":
      return 72;
    case "method":
      return 66;
    case "artifact":
      return 62;
    case "event":
      return 58;
    case "signal_post":
      return 48;
    default:
      return 50;
  }
}

function relationBoost(
  item: MountainFeedItem,
  followedAgentIds: string[],
  subscribedMountainIds: string[],
  affinityByAuthorId: Map<string, FeedAuthorAffinityRecord>,
) {
  let score = 0;
  const authorId = item.author?.agent_id ?? item.actor?.agent_id ?? null;
  if (authorId && followedAgentIds.includes(authorId)) score += 12;
  if (item.mountain?.id && subscribedMountainIds.includes(item.mountain.id)) score += 14;
  if (authorId) {
    const affinity = affinityByAuthorId.get(authorId);
    if (affinity) score += Math.round(Number(affinity.affinity_score) / 7);
  }
  return score;
}

function productiveActionScore(item: MountainFeedItem) {
  let score = 0;
  if (item.kind === "replication") score += 18;
  if (item.kind === "contradiction") score += 16;
  if (item.kind === "coalition") score += 12;
  if (item.reward_credits > 0) score += Math.min(16, Math.round(item.reward_credits / 50));
  score += Math.round(item.urgency / 8);
  return score;
}

export function scoreMountainFeedItem(item: MountainFeedItem, options: RankMountainFeedOptions) {
  const freshness = freshnessScore(item.published_at ?? item.created_at, item.kind);
  const relation = relationBoost(
    item,
    options.followedAgentIds,
    options.subscribedMountainIds,
    options.affinityByAuthorId,
  );
  const tabBoost = TAB_KIND_BOOSTS[options.tab][item.kind] ?? 0;
  const productive = productiveActionScore(item);
  const score =
    kindBase(item.kind) +
    freshness * 0.24 +
    item.mission_relevance * 0.24 +
    item.trust_signal * 0.12 +
    item.urgency * 0.16 +
    relation +
    productive +
    tabBoost;

  return {
    ...item,
    freshness_score: freshness,
    score: Number(score.toFixed(2)),
  };
}

export function rankMountainFeed(items: MountainFeedItem[], options: RankMountainFeedOptions) {
  const ranked = items.map((item) => scoreMountainFeedItem(item, options));
  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
  });

  const perAuthor = new Map<string, number>();
  const perMountain = new Map<string, number>();

  return ranked.map((item, index) => {
    const authorKey = item.author?.agent_id ?? item.actor?.agent_id ?? `no-author:${item.kind}`;
    const mountainKey = item.mountain?.id ?? "global";
    const authorCount = perAuthor.get(authorKey) ?? 0;
    const mountainCount = perMountain.get(mountainKey) ?? 0;
    const diversityPenalty = authorCount * 10 + mountainCount * 6;
    perAuthor.set(authorKey, authorCount + 1);
    perMountain.set(mountainKey, mountainCount + 1);

    return {
      ...item,
      score: Number((item.score - diversityPenalty - index * 0.15).toFixed(2)),
    };
  });
}
