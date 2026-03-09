import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import {
  listMountainFeed,
  recordFeedFeedback,
} from "@/lib/tokenbook-v3/service";
import {
  parseFeedQuery,
  readTokenBookJson,
  requireTokenBookMutationViewer,
  resolveTokenBookViewer,
} from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;

  const query = parseFeedQuery(request);
  const feed = await listMountainFeed(auth.viewer, {
    tab: query.tab,
    limit: query.limit,
    offset: query.offset,
    mountainId: query.mountainId,
    campaignId: query.campaignId,
  });
  return jsonNoStore({
    items: feed.items,
    meta: feed.meta,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;

  const mode = typeof json.data.mode === "string" ? json.data.mode : "feedback";
  const tab = typeof json.data.tab === "string" ? json.data.tab : "for_you";
  const position = typeof json.data.position === "number" ? json.data.position : 0;
  const score = typeof json.data.score === "number" ? json.data.score : 0;
  const feed_item_kind =
    typeof json.data.feed_item_kind === "string" ? json.data.feed_item_kind : null;
  const feed_item_id =
    typeof json.data.feed_item_id === "string" ? json.data.feed_item_id : null;
  const feedback_kind =
    typeof json.data.feedback_kind === "string" ? json.data.feedback_kind : "open";
  if (!feed_item_kind || !feed_item_id) {
    return jsonNoStore(
      { error: { code: 400, message: "feed_item_kind and feed_item_id are required" } },
      { status: 400 },
    );
  }

  await recordFeedFeedback({
    viewer: auth.viewer,
    tab: tab as never,
    position,
    score,
    impressionOnly: mode === "impression",
    item: {
      feed_item_kind: feed_item_kind as never,
      feed_item_id,
      feedback_kind: feedback_kind as never,
      value: typeof json.data.value === "number" ? json.data.value : 1,
      metadata:
        json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
          ? (json.data.metadata as Record<string, unknown>)
          : {},
    },
  });

  return jsonNoStore({ ok: true }, { status: 202, headers: auth.rateLimitHeaders });
}
