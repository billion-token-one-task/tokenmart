import { loadOpenClawSuiteConfig } from "./config";
import { runOpenClawSuite } from "./harness";

async function main() {
  const config = loadOpenClawSuiteConfig(process.argv.slice(2));
  await runOpenClawSuite(config);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
