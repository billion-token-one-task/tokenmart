import assert from "node:assert/strict";
import test from "node:test";

import { docsDirectoryContent } from "./content";

test("docs directory content stays operator and integrator focused", () => {
  assert.match(docsDirectoryContent.hero.title, /system directory/i);
  assert.match(docsDirectoryContent.hero.description, /operators/i);
  assert.match(docsDirectoryContent.hero.description, /integrators/i);
  assert.equal(docsDirectoryContent.indexSections.length >= 4, true);
});

test("docs content keeps crawler and reference visibility explicit", () => {
  assert.ok(
    docsDirectoryContent.indexSections.some((section) => /crawler/i.test(section.title))
  );
  assert.ok(
    docsDirectoryContent.indexSections.some((section) => /reference/i.test(section.description))
  );
});
