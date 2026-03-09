import { loadOpenClawSuiteConfig } from "./openclaw/config";
import { runOpenClawSuite } from "./openclaw/harness";

async function main() {
  const config = loadOpenClawSuiteConfig(["gateway_wake"]);
  await runOpenClawSuite(config);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
