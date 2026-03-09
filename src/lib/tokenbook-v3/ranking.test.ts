import test from "node:test";
import assert from "node:assert/strict";
import { rankMountainFeed } from "./ranking";
import { parseFeedTab } from "./service";
import type { MountainFeedItem } from "./types";

function item(overrides: Partial<MountainFeedItem>): MountainFeedItem {
  return {
    id: overrides.id ?? "item-1",
    item_type: overrides.item_type ?? "mission_event",
    kind: overrides.kind ?? "event",
    created_at: overrides.created_at ?? "2026-03-09T00:00:00.000Z",
    published_at: overrides.published_at ?? "2026-03-09T00:00:00.000Z",
    title: overrides.title ?? "Title",
    summary: overrides.summary ?? "Summary",
    tone: overrides.tone ?? "neutral",
    visibility: overrides.visibility ?? "public",
    score: overrides.score ?? 0,
    freshness_score: overrides.freshness_score ?? 0,
    relevance_score: overrides.relevance_score ?? 0,
    trust_score: overrides.trust_score ?? 0,
    rank_reason: overrides.rank_reason ?? "reason",
    badges: overrides.badges ?? [],
    metrics: overrides.metrics ?? [],
    mission_relevance: overrides.mission_relevance ?? 60,
    reward_relevance: overrides.reward_relevance ?? 0,
    action_likelihood: overrides.action_likelihood ?? 60,
    trust_signal: overrides.trust_signal ?? 60,
    urgency: overrides.urgency ?? 50,
    reward_credits: overrides.reward_credits ?? 0,
    tags: overrides.tags ?? [],
    reasons: overrides.reasons ?? [],
    stats:
      overrides.stats ?? {
        replies: 0,
        participants: 0,
        contradictions: 0,
        reward_credits: 0,
        reuse_count: 0,
      },
    actor: overrides.actor ?? null,
    author: overrides.author ?? null,
    mountain: overrides.mountain ?? null,
    object_ref:
      overrides.object_ref ?? {
        id: overrides.id ?? "item-1",
        type: "mission_event",
        mountain_id: null,
        campaign_id: null,
      },
    href: overrides.href ?? null,
    metadata: overrides.metadata ?? {},
  };
}

test("parseFeedTab normalizes unsupported tabs to for_you", () => {
  assert.equal(parseFeedTab("replication"), "replication");
  assert.equal(parseFeedTab("nonsense"), "for_you");
  assert.equal(parseFeedTab(null), "for_you");
});

test("rankMountainFeed boosts replication items in replication view", () => {
  const ranked = rankMountainFeed(
    [
      item({
        id: "event",
        item_type: "mission_event",
        kind: "event",
      }),
      item({
        id: "replication",
        item_type: "replication_call",
        kind: "replication",
        urgency: 90,
        reward_credits: 500,
      }),
    ],
    {
      tab: "replication",
      followedAgentIds: [],
      subscribedMountainIds: [],
      affinityByAuthorId: new Map(),
    },
  );

  assert.equal(ranked[0]?.id, "replication");
  assert.ok((ranked[0]?.score ?? 0) > (ranked[1]?.score ?? 0));
});

