import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  PROVENANCE_STATUS,
  historicalMacroStatus,
  resolveProvenanceStatus,
} from "../lib/report/provenanceStatus";

/**
 * A table, because the thing being replaced was two nested ternary chains where
 * an unreachable branch would have looked exactly like a reachable one.
 */
const cases: Array<{
  name: string;
  input: Parameters<typeof resolveProvenanceStatus>[0];
  expected: string;
}> = [
  {
    name: "replay outranks canonical",
    input: { historicalLabel: PROVENANCE_STATUS.simulated, isCanonical: true, isLive: true },
    expected: "Simulated (low)",
  },
  {
    name: "replay outranks live",
    input: { historicalLabel: PROVENANCE_STATUS.historicalAligned, isCanonical: false, isLive: true },
    expected: "Historical aligned (medium)",
  },
  {
    name: "canonical outranks live",
    input: { isCanonical: true, isLive: true },
    expected: "Canonical snapshot (high confidence)",
  },
  {
    name: "canonical without a live feed",
    input: { isCanonical: true, isLive: false },
    expected: "Canonical snapshot (high confidence)",
  },
  { name: "live", input: { isCanonical: false, isLive: true }, expected: "Live (high confidence)" },
  { name: "cached", input: { isCanonical: false, isLive: false }, expected: "Cached (medium)" },
];

describe("provenance status", () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      assert.equal(resolveProvenanceStatus(testCase.input), testCase.expected);
    });
  }

  it("names a replay by what its coverage supports", () => {
    assert.equal(historicalMacroStatus("historical-aligned"), "Historical aligned (medium)");
    assert.equal(historicalMacroStatus("historical-partial"), "Historical aligned (partial)");
    // No coverage, an unknown mode and an absent one all mean the same thing: the
    // macro series could not be aligned, so only treasury backs the reading.
    assert.equal(historicalMacroStatus(undefined), "Treasury-only (low)");
    assert.equal(historicalMacroStatus("something-else"), "Treasury-only (low)");
  });
});
