import { resolveSmokeBaseUrl } from "./lib/smoke-targets";

process.env.SMOKE_BASE_URL = resolveSmokeBaseUrl("dev");
process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER = "false";

void import("./smoke-prod");
