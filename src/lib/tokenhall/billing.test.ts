import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCostFromPricing,
  normalizeModelPricing,
  type ModelPricingRow,
} from "./billing";

test("normalizeModelPricing converts decimal strings into numeric pricing", () => {
  const pricing = normalizeModelPricing({
    input_price_per_million: "2.5",
    output_price_per_million: "10",
  } satisfies ModelPricingRow);

  assert.deepEqual(pricing, {
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10,
  });
});

test("calculateCostFromPricing returns zero when pricing is unavailable", () => {
  assert.equal(calculateCostFromPricing(null, 12_000, 6_000), 0);
});

test("calculateCostFromPricing computes prompt and completion cost", () => {
  const cost = calculateCostFromPricing(
    {
      inputPricePerMillion: 1.5,
      outputPricePerMillion: 6,
    },
    250_000,
    50_000,
  );

  assert.equal(cost, 0.675);
});
