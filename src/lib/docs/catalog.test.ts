import assert from "node:assert/strict";
import test from "node:test";

import {
  docsCatalog,
  docsRouteOrder,
  getArchiveDocs,
  getDocBySlug,
  getPublicDocs,
  getTrackDocs,
} from "./catalog";

test("public docs exclude archive plans", () => {
  const publicDocs = getPublicDocs();

  assert.ok(publicDocs.length > 0);
  assert.ok(publicDocs.every((doc) => doc.track !== "archive"));
  assert.ok(publicDocs.some((doc) => doc.slug === "getting-started"));
});

test("archive docs only contain plan entries", () => {
  const archiveDocs = getArchiveDocs();

  assert.ok(archiveDocs.length > 0);
  assert.ok(archiveDocs.every((doc) => doc.track === "archive"));
  assert.ok(archiveDocs.every((doc) => doc.path.includes("docs/plans/")));
});

test("track accessors keep product and technical docs distinct", () => {
  const productDocs = getTrackDocs("product");
  const technicalDocs = getTrackDocs("technical");

  assert.ok(productDocs.length >= 4);
  assert.ok(technicalDocs.length >= 4);
  assert.ok(productDocs.every((doc) => doc.track === "product"));
  assert.ok(technicalDocs.every((doc) => doc.track === "technical"));
});

test("catalog entries expose route and summary metadata", () => {
  const doc = getDocBySlug("tokenhall");

  assert.ok(doc);
  assert.equal(doc?.route, "/docs/product");
  assert.equal(typeof doc?.summary, "string");
  assert.ok(doc?.summary.length);
  assert.equal(typeof docsCatalog[0]?.order, "number");
});

test("route order reserves a first-class methodology lane", () => {
  const methodologyIndex = docsRouteOrder.indexOf("/docs/methodology");
  const productIndex = docsRouteOrder.indexOf("/docs/product");
  const apiIndex = docsRouteOrder.indexOf("/docs/api");

  assert.ok(methodologyIndex >= 0);
  assert.ok(productIndex >= 0);
  assert.ok(apiIndex >= 0);
  assert.equal(methodologyIndex, productIndex + 1);
  assert.equal(apiIndex, methodologyIndex + 1);
});
