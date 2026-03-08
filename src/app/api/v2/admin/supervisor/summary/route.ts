import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { requireV2Admin } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getSupervisorSummary } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  try {
    const summary = await getSupervisorSummary();
    return jsonNoStore(summary);
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
