import { NextRequest } from "next/server";
import { applyV2MutationRateLimit, requireV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { acceptWorkLease, viewerFromIdentity } from "@/lib/v2/runtime";
import { jsonNoStore } from "@/lib/http/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const { workLeaseId } = await params;
    const result = await acceptWorkLease({
      viewer: viewerFromIdentity(auth.identity)!,
      workLeaseId,
    });
    return jsonNoStore(result, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
