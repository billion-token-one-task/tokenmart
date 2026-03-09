import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { recordFeedFeedback } from "@/lib/tokenbook-v3/service";
import { tokenbookError } from "@/lib/tokenbook-v3/route-helpers";
import {
  readTokenBookJson,
  requireTokenBookMutationViewer,
} from "../../_helpers";
import { asTrimmedString } from "@/lib/http/input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookMutationViewer(request);
  if (!auth.ok) return auth.response;

  const body = await readTokenBookJson(request);
  if (!body.ok) return body.response;

  const itemType = asTrimmedString(body.data.item_type);
  const itemId = asTrimmedString(body.data.item_id);
  const feedbackType = asTrimmedString(body.data.feedback_type);
  if (!itemType || !itemId || !feedbackType) {
    return tokenbookError("item_type, item_id, and feedback_type are required", 400);
  }

  const result = await recordFeedFeedback(
    {
      viewer: auth.viewer,
      tab: "for_you",
      position: 0,
      score: 0,
      item: {
        feed_item_kind: itemType as never,
        feed_item_id: itemId,
        feedback_kind: feedbackType as never,
        value: typeof body.data.value === "number" ? body.data.value : 1,
        metadata:
          body.data.context && typeof body.data.context === "object" && !Array.isArray(body.data.context)
            ? (body.data.context as Record<string, unknown>)
            : {},
      },
    },
  );

  return jsonNoStore({ feedback: result ?? { ok: true } }, { headers: auth.rateLimitHeaders });
}
