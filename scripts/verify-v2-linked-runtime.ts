import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { METACULUS_SUMMIT_SLUG, PLACEHOLDER_MOUNTAIN_SLUGS } from "../src/lib/v2/seed";

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    if (!existsSync(envFile)) continue;
    const text = readFileSync(envFile, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
      if (!match) continue;
      if (process.env[match[1]] == null) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [mountainsResult, campaignsResult, workSpecsResult, targetsResult] =
    await Promise.all([
      db.from("mountains").select("id, slug, title, status"),
      db.from("campaigns").select("id, mountain_id"),
      db.from("work_specs").select("id, mountain_id"),
      db
        .from("mountain_external_targets")
        .select("mountain_id, provider, target_slug, official_agent_id"),
    ]);

  for (const result of [
    mountainsResult,
    campaignsResult,
    workSpecsResult,
    targetsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const mountains = mountainsResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const workSpecs = workSpecsResult.data ?? [];
  const targets = targetsResult.data ?? [];

  const canonicalMountain = mountains.find(
    (mountain) => mountain.slug === METACULUS_SUMMIT_SLUG,
  );
  if (!canonicalMountain) {
    throw new Error(
      `Canonical summit ${METACULUS_SUMMIT_SLUG} is missing from the linked database`,
    );
  }

  const leakedPlaceholders = mountains.filter((mountain) =>
    PLACEHOLDER_MOUNTAIN_SLUGS.includes(
      (mountain.slug ?? "") as (typeof PLACEHOLDER_MOUNTAIN_SLUGS)[number],
    ),
  );
  if (leakedPlaceholders.length > 0) {
    throw new Error(
      `Placeholder mountains still present: ${leakedPlaceholders
        .map((mountain) => mountain.slug)
        .join(", ")}`,
    );
  }

  const canonicalCampaigns = campaigns.filter(
    (campaign) => campaign.mountain_id === canonicalMountain.id,
  );
  const canonicalWorkSpecs = workSpecs.filter(
    (workSpec) => workSpec.mountain_id === canonicalMountain.id,
  );
  const canonicalTarget = targets.find(
    (target) =>
      target.mountain_id === canonicalMountain.id &&
      target.provider === "metaculus" &&
      target.target_slug === "spring-aib-2026",
  );

  if (!canonicalTarget) {
    throw new Error(
      "Linked database is missing the canonical Metaculus external target binding",
    );
  }

  if (!canonicalTarget.official_agent_id) {
    throw new Error(
      "Canonical Metaculus external target is missing its official agent",
    );
  }

  console.log(
    JSON.stringify(
      {
        linked_database_ok: true,
        canonical_summit: canonicalMountain.slug,
        campaign_count: canonicalCampaigns.length,
        work_spec_count: canonicalWorkSpecs.length,
        external_target: canonicalTarget.target_slug,
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
