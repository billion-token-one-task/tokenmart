import assert from "node:assert/strict";
import test from "node:test";

import {
  getHumanDocsByRoutes,
  getHumanDocByLegacySourcePath,
  getHumanDocsByLane,
  humanDocLegacySourcePaths,
  humanDocPages,
} from "./web-docs";

test("all 27 source markdown docs map to canonical web routes", () => {
  assert.equal(new Set(humanDocLegacySourcePaths).size, 27);

  for (const sourcePath of humanDocLegacySourcePaths) {
    const page = getHumanDocByLegacySourcePath(sourcePath);
    assert.ok(page, `expected canonical web page for ${sourcePath}`);
    assert.ok(page?.route.startsWith("/docs"));
    assert.equal(page?.route.includes(".md"), false);
  }
});

test("runtime lane is first-class and fully web-native", () => {
  const runtimeDocs = getHumanDocsByLane("runtime");

  assert.ok(runtimeDocs.length >= 4);
  assert.ok(
    runtimeDocs.every((page) => page.route.startsWith("/docs/runtime")),
  );
  assert.ok(runtimeDocs.every((page) => !page.route.endsWith(".md")));
});

test("archive lane is webified with slug routes", () => {
  const archiveDocs = getHumanDocsByLane("archive");

  assert.equal(archiveDocs.length, 9);
  assert.ok(archiveDocs.every((page) => page.route.startsWith("/docs/plans/")));
  assert.ok(archiveDocs.every((page) => page.status === "archive"));
});

test("canonical human docs are route-native and ordered", () => {
  const primaryDocs = humanDocPages.filter((page) => page.status === "primary");

  assert.ok(primaryDocs.length > 20);
  assert.ok(primaryDocs.every((page) => page.route.startsWith("/docs")));
  assert.ok(primaryDocs.every((page) => !page.route.includes(".md")));

  const orders = primaryDocs.map((page) => page.order);
  assert.deepEqual(
    [...orders].sort((left, right) => left - right),
    orders,
  );
});

test("related-route lookups resolve canonical pages without markdown indirection", () => {
  const pages = getHumanDocsByRoutes([
    "/docs/methodology/foundations",
    "/docs/operators/security",
  ]);

  assert.equal(pages.length, 2);
  assert.ok(pages.every((page) => page.route.startsWith("/docs/")));
  assert.ok(pages.every((page) => !page.route.includes(".md")));
});

test("injector doc explains the bridge backend contract in detail", () => {
  const injectorDoc = humanDocPages.find((page) => page.route === "/docs/runtime/injector");

  assert.ok(injectorDoc);
  assert.ok(
    injectorDoc?.sections.some((section) => section.id === "attach-and-status-shape"),
  );
  assert.ok(
    injectorDoc?.sections.some((section) => section.id === "backend-verification-checklist"),
  );
});

test("openclaw bench doc exists as a first-class runtime page", () => {
  const benchDoc = humanDocPages.find((page) => page.route === "/docs/runtime/openclaw-bench");

  assert.ok(benchDoc);
  assert.ok(
    benchDoc?.sections.some((section) => section.id === "how-to-run"),
  );
});
