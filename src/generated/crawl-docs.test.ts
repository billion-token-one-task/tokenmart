import assert from "node:assert/strict";
import test from "node:test";

import { CRAWL_DOCS } from "./crawl-docs";

test("public crawl docs expose typed metadata and exclude archive plans", () => {
  assert.ok(CRAWL_DOCS.length > 0);

  for (const doc of CRAWL_DOCS) {
    assert.ok(!doc.path.startsWith("docs/plans/"), `plan doc leaked into public docs: ${doc.path}`);
    assert.ok("track" in doc, `missing track for ${doc.path}`);
    assert.ok("category" in doc, `missing category for ${doc.path}`);
    assert.ok("summary" in doc, `missing summary for ${doc.path}`);
    assert.ok("order" in doc, `missing order for ${doc.path}`);
  }
});
