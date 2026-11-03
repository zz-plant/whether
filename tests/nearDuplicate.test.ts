import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { findNearDuplicates, jaccardSimilarity } from "../lib/answers/nearDuplicate";

describe("near-duplicate detection", () => {
  it("scores identical bodies at 1 and unrelated bodies near 0", () => {
    const a = new Set(["one two three four five"]);
    assert.equal(jaccardSimilarity(a, a), 1);
    assert.equal(jaccardSimilarity(a, new Set(["six seven eight nine ten"])), 0);
  });

  it("flags a paraphrase and leaves a distinct answer alone", () => {
    const base =
      "Raise prices only where customers already see the value, and only with a clear way back. "
      + "Hold the base price steady if churn risk is real or if buyers are scrutinizing spend. "
      + "Test a price increase on new customers or one segment first, measure churn and win rate.";
    const paraphrase =
      "Raise prices only where customers already see the value, and only with a clear way back. "
      + "Keep the base price steady if churn risk is real or if buyers are scrutinizing spend. "
      + "Test a price increase on new customers or one segment first, measure churn and win rate.";
    const distinct =
      "Cut roles only when the runway math forces it or when the role no longer fits the plan. "
      + "Protect the people who ship and sell. Work out how many months each cut buys before you announce it.";

    const pairs = findNearDuplicates([
      { id: "pricing", text: base },
      { id: "pricing-paraphrase", text: paraphrase },
      { id: "layoffs", text: distinct },
    ]);

    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.a, "pricing");
    assert.equal(pairs[0]?.b, "pricing-paraphrase");
  });

  it("does not flag short bodies that share only a few words", () => {
    const pairs = findNearDuplicates([
      { id: "a", text: "Hold the base price steady." },
      { id: "b", text: "Cut fixed payroll before cutting people." },
    ]);
    assert.deepEqual(pairs, []);
  });
});
