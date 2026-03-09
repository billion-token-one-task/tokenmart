import { jsonNoStore } from "@/lib/http/api-response";
import {
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_INJECTOR_PATH,
} from "@/lib/v2/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonNoStore(
    {
      error: {
        code: 410,
        message:
          "Legacy OpenClaw recover is deprecated. Reattach from the local bridge or use claim-status plus claim from the current console.",
      },
      deprecated: true,
      canonical: {
        injector_url: `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`,
        claim_status_endpoint: V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
        claim_endpoint: V2_OPENCLAW_CLAIM_ENDPOINT,
      },
    },
    { status: 410 },
  );
}
