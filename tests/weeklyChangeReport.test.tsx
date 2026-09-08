import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyChangeReport } from "../app/components/hero/weeklyChangeReport";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../lib/report/homeBriefModel";

const tightnessRose: RegimeSignalIndicator = {
  key: "tightness",
  label: "Funding pressure",
  valueLabel: "64",
  rawValue: 64,
  trendArrow: "↑",
  trendDeltaLabel: "+3.0 vs last week",
  sparkline: [61, 64],
  isFallback: false,
};

const riskAppetiteFlat: RegimeSignalIndicator = {
  key: "riskAppetite",
  label: "Risk appetite",
  valueLabel: "55",
  rawValue: 55,
  trendArrow: "→",
  trendDeltaLabel: "No weekly delta",
  sparkline: [55, 55],
  isFallback: true,
};

const driverSentence = "Funding pressure rose 3 points this week.";

const revisitItem = (
  id: RevisitQueueItem["id"],
  label: string,
  recheck: string,
): RevisitQueueItem => ({
  id,
  label,
  action: `Stage ${label.toLowerCase()} approvals`,
  driver: driverSentence,
  recheck,
  reason: `${driverSentence} ${recheck}`,
  flipCondition: "Reverse only after threshold recovery",
});

const render = (props: Parameters<typeof WeeklyChangeReport>[0]) =>
  renderToStaticMarkup(<WeeklyChangeReport {...props} />);

const baseProps = {
  recordDate: "2026-09-04",
  sourceLabel: "FRED",
};

describe("WeeklyChangeReport", () => {
  it("reduces an unchanged week to one sentence and the unchanged list", () => {
    const html = render({
      ...baseProps,
      revisitDecisions: false,
      revisitQueue: [],
      noChangeAreas: ["Hiring", "Burn discipline"],
      signalIndicators: [riskAppetiteFlat],
    });

    assert.match(html, /No signal moved enough to register/);
    assert.match(html, /Hiring · Burn discipline/);
    assert.match(html, /No change/);
    // The three band headings would label two empty sections on a quiet week.
    assert.ok(!html.includes("What that changes for you"), "quiet week skips the band scaffolding");
  });

  it("states the signal move once, however many decisions it reopens", () => {
    const html = render({
      ...baseProps,
      revisitDecisions: true,
      revisitQueue: [
        revisitItem("hiring", "Hiring", "Recheck fixed-cost approvals."),
        revisitItem("burn-discipline", "Burn discipline", "Re-approve discretionary spend."),
        revisitItem("capital-raising", "Capital raising", "Refresh raise timing assumptions."),
      ],
      noChangeAreas: ["Product tempo"],
      signalIndicators: [tightnessRose],
    });

    // The hoist `RevisitQueueItem.driver` documents: one sentence, not one per area.
    assert.equal(html.split(driverSentence).length - 1, 1);
    for (const area of ["Hiring", "Burn discipline", "Capital raising"]) {
      assert.ok(html.includes(area), `consequence band lists ${area}`);
    }
    assert.match(html, /3 need attention/);
  });

  it("attaches reading, movement, date and source to the change it explains", () => {
    const html = render({
      ...baseProps,
      revisitDecisions: true,
      revisitQueue: [revisitItem("hiring", "Hiring", "Recheck fixed-cost approvals.")],
      noChangeAreas: [],
      signalIndicators: [tightnessRose],
    });

    assert.match(html, /Reading/);
    assert.match(html, /\+3\.0 vs last week/);
    assert.match(html, /2026-09-04/);
    assert.match(html, /FRED/);
  });

  it("names a move that changed no rule instead of dropping it", () => {
    // `revisitDecisions` is false whenever the direction is "stable", which empties
    // the queue. The block this replaced rendered the queue only, so a week that
    // moved without tripping a threshold reported "No change" and showed nothing.
    const html = render({
      ...baseProps,
      revisitDecisions: false,
      revisitQueue: [],
      noChangeAreas: ["Hiring"],
      signalIndicators: [tightnessRose],
    });

    assert.match(html, /Funding pressure rose to 64/);
    assert.match(html, /stayed inside every threshold/);
  });

  it("ignores a move that rounds to zero at the precision it reports", () => {
    // `formatTrendArrow` returns "→" only for an exact 0, so a -0.04 delta
    // arrives with a "↓" beside the label "-0.0 vs last week".
    const html = render({
      ...baseProps,
      revisitDecisions: false,
      revisitQueue: [],
      noChangeAreas: [],
      signalIndicators: [{
        key: "curveSlope",
        label: "Recession warning gauge",
        valueLabel: "0.4",
        rawValue: 0.4,
        trendArrow: "↓",
        trendDeltaLabel: "-0.0 vs last week",
        sparkline: [0.4, 0.4],
        isFallback: false,
      }],
    });

    assert.ok(!html.includes("Recession warning gauge"), "a delta of -0.0 is not a change");
    assert.match(html, /No signal moved enough to register/);
  });

  it("ignores a signal with no prior read rather than calling it flat", () => {
    const html = render({
      ...baseProps,
      revisitDecisions: false,
      revisitQueue: [],
      noChangeAreas: [],
      signalIndicators: [riskAppetiteFlat],
    });

    assert.ok(!html.includes("Risk appetite"), "a missing delta is not a movement claim");
  });
});
