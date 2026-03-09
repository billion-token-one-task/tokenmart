import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { listSubscriptions, upsertSubscription } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookMutationViewer,
  resolveTokenBookViewer,
} from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const subscriptions = await listSubscriptions(auth.viewer);
  return jsonNoStore({ subscriptions });
}

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const subject_kind =
    typeof json.data.subject_kind === "string" ? json.data.subject_kind : null;
  const subject_id =
    typeof json.data.subject_id === "string" ? json.data.subject_id : null;
  const subscribed =
    typeof json.data.subscribed === "boolean" ? json.data.subscribed : true;
  if (!subject_kind || !subject_id) {
    return jsonNoStore({ error: { code: 400, message: "subject_kind and subject_id are required" } }, { status: 400 });
  }
  const result = await upsertSubscription({
    viewer: auth.viewer,
    subjectKind: subject_kind as never,
    subjectId: subject_id,
    subscribed,
    metadata:
      json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
        ? (json.data.metadata as Record<string, unknown>)
        : {},
  });
  return jsonNoStore(result, { status: 200, headers: auth.rateLimitHeaders });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTokenBookMutationViewer(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const subject_kind = searchParams.get("subject_kind");
  const subject_id = searchParams.get("subject_id");
  if (!subject_kind || !subject_id) {
    return jsonNoStore({ error: { code: 400, message: "subject_kind and subject_id are required" } }, { status: 400 });
  }
  const result = await upsertSubscription({
    viewer: auth.viewer,
    subjectKind: subject_kind as never,
    subjectId: subject_id,
    subscribed: false,
  });
  return jsonNoStore(result, { status: 200, headers: auth.rateLimitHeaders });
}
