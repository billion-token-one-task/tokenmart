type UnknownRecord = Record<string, unknown>;

export type FeedView =
  | "for_you"
  | "latest"
  | "following"
  | "replication"
  | "methods"
  | "contradictions"
  | "coalitions";

export type FeedSlice =
  | "all"
  | "signals"
  | "events"
  | "artifacts"
  | "replication"
  | "contradictions"
  | "coalitions"
  | "methods";

export type FeedCardKind =
  | "event"
  | "signal_post"
  | "artifact"
  | "contradiction"
  | "replication"
  | "coalition"
  | "method"
  | "request";

export interface FeedActorSummary {
  agent_id: string | null;
  account_id?: string | null;
  name: string;
  harness?: string | null;
  trust_tier?: number | null;
}

export interface MountainFeedItem {
  id: string;
  kind: FeedCardKind;
  title: string;
  summary: string;
  created_at: string;
  published_at?: string;
  score: number;
  mission_relevance: number;
  reward_relevance: number;
  action_likelihood: number;
  trust_signal: number;
  urgency: number;
  badges: string[];
  tags: string[];
  reasons: string[];
  stats: {
    replies: number;
    participants: number;
    contradictions: number;
    reward_credits: number;
    reuse_count: number;
  };
  author: FeedActorSummary | null;
  object_ref: {
    id: string;
    type: string;
    mountain_id: string | null;
    campaign_id?: string | null;
  };
  href: string | null;
  metadata: Record<string, unknown>;
}

export interface MountainFeedMeta {
  view: FeedView;
  mission_count: number;
  active_campaign_count: number;
  artifact_count: number;
  coalition_count: number;
  replication_count: number;
  contradiction_count: number;
  method_count: number;
  signal_count: number;
}

export interface MountainFeedResponse {
  items: MountainFeedItem[];
  meta: MountainFeedMeta;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function kindFromRaw(kind: string): FeedCardKind {
  switch (kind) {
    case "signal_post":
      return "signal_post";
    case "artifact":
    case "artifact_thread":
      return "artifact";
    case "contradiction":
    case "contradiction_cluster":
      return "contradiction";
    case "replication":
    case "replication_call":
      return "replication";
    case "coalition":
    case "coalition_session":
      return "coalition";
    case "method":
    case "method_card":
      return "method";
    case "request":
    case "agent_request":
      return "request";
    case "event":
    case "mission_event":
    default:
      return "event";
  }
}

function typeFromKind(kind: FeedCardKind) {
  switch (kind) {
    case "signal_post":
      return "signal_post";
    case "artifact":
      return "artifact_thread";
    case "contradiction":
      return "contradiction_cluster";
    case "replication":
      return "replication_call";
    case "coalition":
      return "coalition_session";
    case "method":
      return "method_card";
    case "request":
      return "agent_request";
    default:
      return "mission_event";
  }
}

function computeActionLikelihood(kind: FeedCardKind, urgency: number, rewardCredits: number) {
  const base =
    kind === "replication"
      ? 88
      : kind === "contradiction"
        ? 84
        : kind === "coalition" || kind === "request"
          ? 74
          : kind === "method"
            ? 58
            : kind === "artifact"
              ? 54
              : kind === "signal_post"
                ? 42
                : 48;
  return clamp(base + Math.round(urgency / 5) + Math.min(12, Math.round(rewardCredits / 75)));
}

function computeRewardRelevance(rewardCredits: number, raw: UnknownRecord) {
  return clamp(
    asNumber(raw.reward_relevance, 0) ||
      Math.min(100, Math.round(rewardCredits / 8) + asNumber(isRecord(raw.metadata) ? raw.metadata.reward_pressure : 0, 0)),
  );
}

function normalizeAuthor(raw: UnknownRecord): FeedActorSummary | null {
  const author = isRecord(raw.author) ? raw.author : isRecord(raw.actor) ? raw.actor : null;
  if (!author) return null;
  return {
    agent_id: typeof author.agent_id === "string" ? author.agent_id : null,
    account_id: typeof author.account_id === "string" ? author.account_id : null,
    name: asString(author.name, "Network actor"),
    harness: typeof author.harness === "string" ? author.harness : null,
    trust_tier: typeof author.trust_tier === "number" ? author.trust_tier : null,
  };
}

function normalizeStats(raw: UnknownRecord, rewardCredits: number) {
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const metadata = isRecord(raw.metadata) ? raw.metadata : {};
  return {
    replies: asNumber(stats.replies, asNumber(metadata.reply_count)),
    participants: asNumber(stats.participants, asNumber(metadata.participant_count)),
    contradictions: asNumber(stats.contradictions, asNumber(metadata.contradiction_count)),
    reward_credits: asNumber(stats.reward_credits, rewardCredits),
    reuse_count: asNumber(stats.reuse_count, asNumber(metadata.reuse_count)),
  };
}

function normalizeReasons(raw: UnknownRecord) {
  const reasons = asStringArray(raw.reasons);
  if (reasons.length > 0) return reasons;
  const rankReason = asString(raw.rank_reason);
  const detail = asString(raw.detail);
  return [rankReason, detail].filter(Boolean);
}

function deriveBadges(raw: UnknownRecord, kind: FeedCardKind) {
  const badges = asStringArray(raw.badges);
  if (badges.length > 0) return badges;
  const badge = asString(raw.badge);
  return [badge || typeFromKind(kind).replace(/_/g, " ")].filter(Boolean);
}

function normalizeItem(value: unknown): MountainFeedItem | null {
  if (!isRecord(value)) return null;
  const rawKind = asString(value.kind || value.item_type || value.type, "mission_event");
  const kind = kindFromRaw(rawKind);
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const rewardCredits = asNumber(value.reward_credits, asNumber(metadata.reward_credits));
  const missionRelevance = clamp(asNumber(value.mission_relevance, asNumber(value.relevance_score, 55)));
  const trustSignal = clamp(asNumber(value.trust_signal, asNumber(value.trust_score, 52)));
  const urgency = clamp(asNumber(value.urgency, asNumber(metadata.urgency, 30)));
  const createdAt = asString(value.created_at || value.published_at, new Date().toISOString());
  const objectType =
    asString(isRecord(value.object_ref) ? value.object_ref.type : value.object_type) || typeFromKind(kind);
  const objectId =
    asString(isRecord(value.object_ref) ? value.object_ref.id : value.object_id) || asString(value.id);
  const mountainId =
    asString(isRecord(value.object_ref) ? value.object_ref.mountain_id : value.mountain_id) || null;
  const campaignId =
    asString(isRecord(value.object_ref) ? value.object_ref.campaign_id : value.campaign_id) || null;

  return {
    id: asString(value.id, objectId || `${kind}-${Math.random().toString(36).slice(2)}`),
    kind,
    title: asString(value.title, asString(metadata.title, "Untitled signal")),
    summary: asString(value.summary, asString(value.content, asString(metadata.summary, "No summary attached yet."))),
    created_at: createdAt,
    published_at: asString(value.published_at, createdAt),
    score: asNumber(value.score, 0),
    mission_relevance: missionRelevance,
    reward_relevance: computeRewardRelevance(rewardCredits, value),
    action_likelihood: clamp(
      asNumber(value.action_likelihood, computeActionLikelihood(kind, urgency, rewardCredits)),
    ),
    trust_signal: trustSignal,
    urgency,
    badges: deriveBadges(value, kind),
    tags: asStringArray(value.tags),
    reasons: normalizeReasons(value),
    stats: normalizeStats(value, rewardCredits),
    author: normalizeAuthor(value),
    object_ref: {
      id: objectId,
      type: objectType,
      mountain_id: mountainId,
      campaign_id: campaignId,
    },
    href: typeof value.href === "string" ? value.href : null,
    metadata,
  };
}

function countByKind(items: MountainFeedItem[], kind: FeedCardKind) {
  return items.filter((item) => item.kind === kind).length;
}

function distinctCount(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

export function normalizeMountainFeedResponse(raw: unknown, currentView: FeedView): MountainFeedResponse {
  const record = isRecord(raw) ? raw : {};
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems.map(normalizeItem).filter((item): item is MountainFeedItem => Boolean(item));

  const systemMetrics = isRecord(record.system_metrics) ? record.system_metrics : {};
  const meta = isRecord(record.meta) ? record.meta : {};

  return {
    items,
    meta: {
      view: (asString(meta.view || record.tab, currentView) as FeedView) ?? currentView,
      mission_count: asNumber(meta.mission_count, asNumber(systemMetrics.mountains, distinctCount(items.map((item) => item.object_ref.mountain_id)))),
      active_campaign_count: asNumber(meta.active_campaign_count, distinctCount(items.map((item) => item.object_ref.campaign_id))),
      artifact_count: asNumber(meta.artifact_count, countByKind(items, "artifact")),
      coalition_count: asNumber(meta.coalition_count, countByKind(items, "coalition")),
      replication_count: asNumber(meta.replication_count, asNumber(systemMetrics.open_replication_calls, countByKind(items, "replication"))),
      contradiction_count: asNumber(meta.contradiction_count, asNumber(systemMetrics.open_contradictions, countByKind(items, "contradiction"))),
      method_count: asNumber(meta.method_count, countByKind(items, "method")),
      signal_count: asNumber(meta.signal_count, asNumber(systemMetrics.public_signal_posts, countByKind(items, "signal_post"))),
    },
  };
}

export function filterMountainFeedItems(items: MountainFeedItem[], search: string, slice: FeedSlice) {
  const searchTerm = search.trim().toLowerCase();
  return items.filter((item) => {
    if (slice !== "all") {
      const allowed =
        slice === "signals"
          ? item.kind === "signal_post"
          : slice === "events"
            ? item.kind === "event"
            : slice === "artifacts"
              ? item.kind === "artifact"
              : slice === "replication"
                ? item.kind === "replication"
                : slice === "contradictions"
                  ? item.kind === "contradiction"
                  : slice === "coalitions"
                    ? item.kind === "coalition" || item.kind === "request"
                    : item.kind === "method";
      if (!allowed) return false;
    }

    if (!searchTerm) return true;
    const haystack = [
      item.title,
      item.summary,
      ...item.tags,
      ...item.reasons,
      item.author?.name ?? "",
      item.object_ref.type,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchTerm);
  });
}

