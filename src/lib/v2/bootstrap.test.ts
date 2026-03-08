import test from "node:test";
import assert from "node:assert/strict";
import { buildMetaculusBootstrapBlueprint } from "./bootstrap";
import { METACULUS_SUMMIT_SLUG, PLACEHOLDER_MOUNTAIN_SLUGS } from "./seed";

test("Metaculus bootstrap blueprint installs the canonical summit and required work graph", () => {
  const blueprint = buildMetaculusBootstrapBlueprint();

  assert.equal(blueprint.mountain.slug, METACULUS_SUMMIT_SLUG);
  assert.equal(blueprint.mountain.visibility, "public");
  assert.equal(blueprint.external_target.provider, "metaculus");
  assert.equal(blueprint.external_target.target_slug, "spring-aib-2026");
  assert.equal(blueprint.official_agent_name, "metaculus-official-bot");
  assert.ok(blueprint.campaigns.length >= 8);
  assert.ok(
    blueprint.work_specs.some((spec) => spec.title === "Build the competition compliance matrix"),
  );
  assert.ok(
    blueprint.work_specs.some((spec) => spec.title === "Operate the official submission bot"),
  );
  assert.ok(
    blueprint.work_specs.some((spec) => spec.title === "Probe reliability and rule-failure scenarios"),
  );
  assert.ok(!PLACEHOLDER_MOUNTAIN_SLUGS.includes(blueprint.mountain.slug as never));
});
