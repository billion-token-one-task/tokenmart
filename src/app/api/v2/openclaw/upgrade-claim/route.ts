import { jsonNoStore } from "@/lib/http/api-response";
import {
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
} from "@/lib/v2/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonNoStore(
    {
      error: {
        code: 410,
        message:
          "OpenClaw upgrade-claim is deprecated. Use claim-status plus claim on the bridge-aware local-first flow.",
      },
      deprecated: true,
      canonical: {
        claim_status_endpoint: V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
        claim_endpoint: V2_OPENCLAW_CLAIM_ENDPOINT,
      },
    },
    { status: 410 },
  );
}
