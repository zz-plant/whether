import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
import { buildSummaryDelta } from "../lib/summary/summaryDelta";
import { buildWeeklySummary } from "../lib/summary/weeklySummary";

const assessment = evaluateRegime({
  source: "https://example.com/treasury",
  record_date: "2026-10-05",
  fetched_at: "2026-10-05T12:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
});

const summariesAged = (weeklyAge: string, monthlyAge: string) => {
  const provenance = { sourceLabel: "FRED", timestampLabel: "Oct 5, 2026", statusLabel: "Live" };
  return buildSummaryDelta(
    buildWeeklySummary({ assessment, provenance: { ...provenance, ageLabel: weeklyAge } }),
    buildMonthlySummary({ assessment, provenance: { ...provenance, ageLabel: monthlyAge } }),
  );
};

describe("buildSummaryDelta", () => {
  // "Regime steady in Freezing." put the engine's noun in a reader sentence.
  it("says conditions held, in the weather word", () => {
    const delta = summariesAged("6m.", "6m.");
    assert.equal(assessment.regime, "SCARCITY");
    assert.equal(delta.bullets[0], "Conditions held at Freezing.");
    assert.ok(delta.bullets.every((bullet) => !/\bregime\b/i.test(bullet)), delta.bullets.join(" | "));
  });

  // The age was read from its digits alone: "6m." (six minutes) published 6 hours.
  it("reads the age label's unit", () => {
    const minutes = summariesAged("6m.", "6m.");
    assert.equal(minutes.provenance.weeklyAgeHours, 0.1);
    assert.equal(minutes.provenance.ageDeltaHours, 0);
    assert.equal(minutes.bullets[2], "Provenance age unchanged at 6m.");

    const mixed = summariesAged("30m.", "2h.");
    assert.equal(mixed.provenance.weeklyAgeHours, 0.5);
    assert.equal(mixed.provenance.monthlyAgeHours, 2);
    assert.equal(mixed.provenance.ageDeltaHours, 1.5);

    assert.equal(summariesAged("3d.", "—").provenance.weeklyAgeHours, 72);
    assert.equal(summariesAged("3d.", "—").provenance.ageDeltaHours, null);
  });
});
