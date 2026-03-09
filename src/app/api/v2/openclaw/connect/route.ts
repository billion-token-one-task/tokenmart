import { jsonNoStore } from "@/lib/http/api-response";
import {
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_INJECTOR_PATH,
  V2_OPENCLAW_REKEY_ENDPOINT,
  V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT,
  V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
} from "@/lib/v2/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonNoStore(
    {
      error: {
        code: 410,
        message:
          "Browser-first OpenClaw connect is deprecated. Use the macOS injector on the machine where OpenClaw already lives.",
      },
      deprecated: true,
      canonical: {
        injector_url: `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`,
        bridge_manifest_endpoint: V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
        bridge_attach_endpoint: V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT,
        claim_status_endpoint: V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
        claim_endpoint: V2_OPENCLAW_CLAIM_ENDPOINT,
        rekey_endpoint: V2_OPENCLAW_REKEY_ENDPOINT,
      },
    },
    { status: 410 },
  );
}
