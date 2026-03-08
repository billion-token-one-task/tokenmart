import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (
      (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) &&
      !fullPath.endsWith(".test.ts")
    ) {
      acc.push(fullPath);
    }
  }

  return acc;
}

test("docs app does not hardcode markdown links into primary route files", () => {
  const root = path.join(process.cwd(), "src", "app", "docs");
  const sourceFiles = walk(root);
  const offenders: string[] = [];

  for (const file of sourceFiles) {
    const contents = readFileSync(file, "utf8");
    if (contents.includes(".md")) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(offenders, []);
});
