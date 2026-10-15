import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { carryUnchangedEntries } from "../scripts/carryUnchangedEntries";

const entry = (fetchedAt: string, label: string, tightness: number) => ({
  year: 2012,
  month: 1,
  tightness,
  provenance: { timestampLabel: label, ageLabel: "0h." },
  inputs: [{ id: "ten-year", recordDate: "2012-01-31", fetchedAt }],
  copy: `Timestamp: ${label}\nData age: 0h.`,
});
const getKey = (value: { year: number; month: number }) => `${value.year}-${value.month}`;

describe("carryUnchangedEntries", () => {
  it("keeps the stored entry when only the run's stamps differ", () => {
    const stored = entry("2026-10-09T18:29:37.440Z", "Oct 9, 2026 at 6:29 PM", 40);
    const [kept] = carryUnchangedEntries([stored], [entry("2026-10-13T12:24:57.798Z", "Oct 13, 2026, 12:24 PM", 40)], getKey);
    assert.equal(kept, stored);
  });

  it("takes the incoming entry when its data changed", () => {
    const stored = entry("2026-10-09T18:29:37.440Z", "Oct 9, 2026 at 6:29 PM", 40);
    const incoming = entry("2026-10-13T12:24:57.798Z", "Oct 13, 2026, 12:24 PM", 41);
    assert.equal(carryUnchangedEntries([stored], [incoming], getKey)[0], incoming);
  });

  it("takes a new period as written", () => {
    const incoming = { ...entry("2026-10-13T12:24:57.798Z", "Oct 13, 2026, 12:24 PM", 40), month: 2 };
    assert.equal(carryUnchangedEntries([entry("x", "y", 40)], [incoming], getKey)[0], incoming);
  });
});
