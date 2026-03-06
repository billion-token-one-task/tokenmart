import assert from "node:assert/strict";
import test from "node:test";

import {
  asTrimmedString,
  isPlainObject,
  parseBoundedInt,
  parsePagination,
  readJsonObject,
} from "./input";

test("parseBoundedInt falls back for invalid values and clamps boundaries", () => {
  assert.equal(parseBoundedInt(null, { defaultValue: 20, min: 1, max: 100 }), 20);
  assert.equal(parseBoundedInt("abc", { defaultValue: 20, min: 1, max: 100 }), 20);
  assert.equal(parseBoundedInt("-5", { defaultValue: 20, min: 0, max: 100 }), 0);
  assert.equal(parseBoundedInt("999", { defaultValue: 20, min: 0, max: 100 }), 100);
  assert.equal(parseBoundedInt("42", { defaultValue: 20, min: 0, max: 100 }), 42);
});

test("parsePagination normalizes limit and offset safely", () => {
  const params = new URLSearchParams({
    limit: "500",
    offset: "-7",
  });

  assert.deepEqual(
    parsePagination(params, {
      defaultLimit: 20,
      maxLimit: 100,
    }),
    {
      limit: 100,
      offset: 0,
    },
  );
});

test("isPlainObject accepts only JSON object shapes", () => {
  assert.equal(isPlainObject({ ok: true }), true);
  assert.equal(isPlainObject(["not", "an", "object"]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject("text"), false);
});

test("asTrimmedString trims strings and rejects non-strings", () => {
  assert.equal(asTrimmedString("  hello  "), "hello");
  assert.equal(asTrimmedString("   "), null);
  assert.equal(asTrimmedString(42), null);
});

test("readJsonObject rejects non-object JSON payloads", async () => {
  const request = new Request("https://tokenmart.test", {
    method: "POST",
    body: JSON.stringify(["invalid"]),
    headers: { "Content-Type": "application/json" },
  });

  const result = await readJsonObject(request);

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected object parsing to fail");
  }
  assert.equal(result.error, "JSON body must be an object");
});

test("readJsonObject returns parsed objects unchanged", async () => {
  const request = new Request("https://tokenmart.test", {
    method: "POST",
    body: JSON.stringify({ email: "hello@example.com" }),
    headers: { "Content-Type": "application/json" },
  });

  const result = await readJsonObject(request);

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected object parsing to succeed");
  }
  assert.deepEqual(result.data, { email: "hello@example.com" });
});
