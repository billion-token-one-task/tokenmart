import { jsonNoStore } from "@/lib/http/api-response";
import {
  V2_OPENCLAW_INJECTOR_PATH,
  V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
} from "@/lib/v2/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonNoStore(
    {
      error: {
        code: 410,
        message:
          "OpenClaw install bundles are deprecated. The canonical onboarding path is the macOS injector plus bridge manifest.",
      },
      deprecated: true,
      canonical: {
        injector_url: `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`,
        bridge_manifest_endpoint: V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
      },
    },
    { status: 410 },
  );
}
