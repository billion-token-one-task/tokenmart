import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { listMissionEvents } from "@/lib/tokenbook-v3/service";
import { resolveTokenBookViewer } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const events = await listMissionEvents(auth.viewer);
  return jsonNoStore({ events });
}
