import assert from "node:assert/strict";
import test from "node:test";

import {
  getSectionByPath,
  getSectionPattern,
  resolveSectionConfig,
  shellNavSections,
  shellSectionOrder,
} from "./ui-shell";

test("resolves tokenhall paths to the tokenhall section", () => {
  const section = getSectionByPath("/tokenhall/models");

  assert.equal(section.id, "tokenhall");
  assert.equal(section.label, "TokenHall");
  assert.equal(section.hintLabel, "ROUTER");
});

test("falls back to platform for unknown paths", () => {
  const section = getSectionByPath("/totally-new-surface");

  assert.equal(section.id, "platform");
});

test("infers section config from legacy gradient classes", () => {
  const section = resolveSectionConfig({ gradient: "gradient-text-secondary" });

  assert.equal(section.id, "tokenbook");
  assert.equal(section.pixelFont, "font-pixel-circle");
});

test("keeps shell navigation sections ordered and populated", () => {
  assert.deepEqual(shellSectionOrder, ["platform", "tokenhall", "tokenbook", "admin"]);
  assert.equal(shellNavSections[0]?.title, "Market Core");
  assert.equal(shellNavSections[3]?.title, "Ops");

  for (const section of shellNavSections) {
    assert.ok(section.items.length > 0);
  }
});

test("provides art-direction metadata for every section", () => {
  const section = getSectionByPath("/tokenbook");

  assert.equal(section.displayTreatment, "editorial-grid");
  assert.equal(section.patternRecipe, "packet-lattice");
  assert.equal(section.surfacePreset, "mesh-glass");
  assert.equal(section.contrastPreset, "social-ledger");
  assert.equal(section.accentRamp.light, "#ffd5e6");
  assert.equal(section.hintLabel, "SIGNAL");
});

test("resolves trust pattern families with explicit clarity levels", () => {
  const trustPattern = getSectionPattern("auth", "trust-evolution");

  assert.equal(trustPattern.kind, "trust-evolution");
  assert.equal(trustPattern.layers.length, 3);
  assert.ok(trustPattern.layers.some((layer) => layer.density === "fine"));
});
