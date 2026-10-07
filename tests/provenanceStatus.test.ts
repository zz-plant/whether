import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import {
  FRED_SOURCE_LABEL,
  PROVENANCE_STATUS,
  historicalMacroStatus,
  isSavedCopy,
  publisherSourceLabel,
  resolveProvenanceStatus,
} from "../lib/report/provenanceStatus";
import { snapshotData } from "../lib/snapshot";

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
    expected: "Latest recorded reading",
  },
  {
    name: "canonical without a live feed",
    input: { isCanonical: true, isLive: false },
    expected: "Latest recorded reading",
  },
  { name: "live", input: { isCanonical: false, isLive: true }, expected: "Live reading" },
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

/*
 * Every cadence summary printed "Source: Canonical ingestion (FRED)", the saved
 * snapshot "Canonical snapshot (FRED)", and the strip's status "Canonical snapshot
 * (high confidence)" on a week whose published confidence was Medium.
 */
describe("provenance labels a reader meets", () => {
  it("claims no confidence and names no pipeline", () => {
    for (const label of Object.values(PROVENANCE_STATUS)) {
      assert.doesNotMatch(label, /confidence|canonical|snapshot|ingestion/i, label);
    }
  });

  it("names the publisher for a stored pipeline label and passes any other through", () => {
    assert.equal(FRED_SOURCE_LABEL, "Federal Reserve Economic Data (FRED)");
    assert.equal(publisherSourceLabel("Canonical snapshot (FRED)"), FRED_SOURCE_LABEL);
    assert.equal(publisherSourceLabel("Canonical ingestion (FRED)"), FRED_SOURCE_LABEL);
    assert.equal(publisherSourceLabel("US Treasury daily yield curve"), "US Treasury daily yield curve");
  });

  it("stamps a built operating snapshot with the publisher, live or saved", () => {
    const saved = buildOperatingSnapshot({ treasury: { ...snapshotData, isLive: false }, macroSeries }).provenance;
    const live = buildOperatingSnapshot({ treasury: { ...snapshotData, isLive: true }, macroSeries }).provenance;
    for (const provenance of [live, saved]) assert.equal(provenance.sourceLabel, FRED_SOURCE_LABEL);
    assert.equal(live.statusLabel, PROVENANCE_STATUS.live);
    assert.equal(saved.statusLabel, PROVENANCE_STATUS.cached);
  });
});

describe("isSavedCopy", () => {
  it("marks a reading saved when either stamp is present, and live when neither is", () => {
    assert.equal(isSavedCopy({ fallback_at: "2026-10-05T09:00:00Z", fallback_reason: null }), true);
    assert.equal(isSavedCopy({ fallback_at: null, fallback_reason: "Treasury feed timed out" }), true);
    assert.equal(isSavedCopy({ fallback_at: null, fallback_reason: null }), false);
    assert.equal(isSavedCopy({}), false);
    // An empty stamp is no stamp: the client never writes one, and a blank must not read as a saved copy.
    assert.equal(isSavedCopy({ fallback_at: "", fallback_reason: "" }), false);
    assert.equal(isSavedCopy(null), false);
    assert.equal(isSavedCopy(undefined), false);
  });
});
