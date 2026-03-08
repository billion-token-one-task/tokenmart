import { resolveSmokeBaseUrl } from "./lib/smoke-targets";
import { METACULUS_SUMMIT_SLUG, PLACEHOLDER_MOUNTAIN_SLUGS } from "../src/lib/v2/seed";

type MountainSummary = {
  slug: string | null;
  title: string;
};

async function main() {
  const baseUrl = resolveSmokeBaseUrl("prod");
  const response = await fetch(`${baseUrl}/api/v2/mountains`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Mountain explorer request failed (${response.status})`);
  }

  const json = (await response.json()) as { mountains?: MountainSummary[] };
  const mountains = json.mountains ?? [];

  if (!mountains.some((mountain) => mountain.slug === METACULUS_SUMMIT_SLUG)) {
    throw new Error(`Canonical summit ${METACULUS_SUMMIT_SLUG} is missing from production`);
  }

  const leakedPlaceholders = mountains.filter((mountain) =>
    PLACEHOLDER_MOUNTAIN_SLUGS.includes((mountain.slug ?? "") as (typeof PLACEHOLDER_MOUNTAIN_SLUGS)[number]),
  );
  if (leakedPlaceholders.length > 0) {
    throw new Error(`Placeholder mountains still visible in production: ${leakedPlaceholders.map((mountain) => mountain.slug).join(", ")}`);
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        canonical_summit: METACULUS_SUMMIT_SLUG,
        public_mountains: mountains.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
