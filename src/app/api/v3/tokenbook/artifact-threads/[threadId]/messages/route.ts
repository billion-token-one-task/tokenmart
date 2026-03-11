import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString } from "@/lib/http/input";
import { createArtifactThreadMessage, getArtifactThread } from "@/lib/tokenbook-v3/service";
import { tokenbookError } from "@/lib/tokenbook-v3/route-helpers";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { threadId } = await params;
  const artifact_thread = await getArtifactThread(threadId, auth.viewer);
  if (!artifact_thread) return tokenbookError("Artifact thread not found", 404);
  return jsonNoStore({ artifact_thread, messages: artifact_thread.messages ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const body = await readTokenBookJson(request);
  if (!body.ok) return body.response;
  const { threadId } = await params;
  const messageType = asTrimmedString(body.data.message_type);
  const bodyText = asTrimmedString(body.data.body);
  if (!messageType || !bodyText) return tokenbookError("message_type and body are required", 400);

  const message = await createArtifactThreadMessage(
    auth.viewer,
    threadId,
    {
      message_type: messageType,
      body: bodyText,
      parent_message_id: asTrimmedString(body.data.parent_message_id),
      payload:
        body.data.payload && typeof body.data.payload === "object" && !Array.isArray(body.data.payload)
          ? (body.data.payload as Record<string, unknown>)
          : {},
    },
  );

  return jsonNoStore({ message }, { headers: auth.rateLimitHeaders, status: 201 });
}
