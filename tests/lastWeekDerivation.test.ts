import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET as getSlackBriefRoute } from "../app/api/brief/slack/route";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { findSignalDelta } from "../lib/report/evidenceReaderModel";
import { buildSignalChangeRows } from "../lib/report/home/homeSectionModel";
import type { RegimeSignalIndicator } from "../lib/report/homeBriefModel";
import type { ReportDynamics } from "../lib/report/reportDataTypes";

/*
 * "Last week" has one derivation, and every surface reads it: the homepage
 * rows and ladders, /signals, /trust, and every export. Before this, the
 * homepage read the indicator's label (which drops an unmoved signal to "no
 * comparison" and never sees an anomaly), /trust and the page ladders read
 * `changedSignals` alone (a move past the sanity limit drew as flat), and the
 * live exports were handed no previous week at all.
 */
type Dynamics = Pick<ReportDynamics, "directionLabel" | "changedSignals" | "anomalySignals">;

const noComparison: Dynamics = { directionLabel: "unavailable", changedSignals: [], anomalySignals: [] };
const quietWeek: Dynamics = { directionLabel: "stable", changedSignals: [], anomalySignals: [] };
const anomalousWeek: Dynamics = {
  directionLabel: "improving",
  changedSignals: [{ key: "tightness", label: "Funding pressure", delta: -3 }],
  anomalySignals: [{ key: "riskAppetite", label: "Risk appetite", delta: 55, reason: "Exceeded weekly sanity threshold of ±50." }],
};

describe("findSignalDelta", () => {
  it("separates no comparison from a comparison that found no move", () => {
    assert.equal(findSignalDelta(noComparison, "tightness"), null);
    assert.equal(findSignalDelta(quietWeek, "tightness"), 0);
  });

  it("counts a move past the weekly sanity limit", () => {
    assert.equal(findSignalDelta(anomalousWeek, "riskAppetite"), 55);
    assert.equal(findSignalDelta(anomalousWeek, "tightness"), -3);
  });
});

describe("previousScoresFromDynamics", () => {
  const current = { tightness: 79, riskAppetite: 75 };

  it("prints no last week when no comparison was made", () => {
    assert.equal(previousScoresFromDynamics(noComparison, current), null);
  });

  it("reads an unmoved week as last week equal to this week", () => {
    assert.deepEqual(previousScoresFromDynamics(quietWeek, current), current);
  });

  it("does not draw a 55-point week as flat", () => {
    assert.deepEqual(previousScoresFromDynamics(anomalousWeek, current), { tightness: 82, riskAppetite: 20 });
  });
});

describe("homepage signal rows", () => {
  const indicator = (key: RegimeSignalIndicator["key"], rawValue: number): RegimeSignalIndicator => ({
    key,
    label: key,
    valueLabel: String(rawValue),
    rawValue,
    trendArrow: "→",
    /* What the indicator says for a signal that is missing from
       `changedSignals`: the label the rows used to read the delta off. */
    trendDeltaLabel: "No weekly delta",
    sparkline: [],
    isFallback: true,
  });
  const indicators = [indicator("tightness", 100), indicator("riskAppetite", 75)];
  const lines = { tightness: { callChange: 70 }, riskAppetite: { callChange: 50 } };

  it("shows an unmoved score as unmoved, with last week, when a comparison happened", () => {
    const rows = buildSignalChangeRows({ indicators, lines, dynamics: quietWeek });
    const tightness = rows.find((row) => row.key === "tightness");
    assert.equal(tightness?.delta, 0);
    assert.equal(tightness?.previous, 100);
  });

  it("shows no last week when there was no comparison", () => {
    const rows = buildSignalChangeRows({ indicators, lines, dynamics: noComparison });
    assert.ok(rows.every((row) => row.previous === null && row.delta === null));
  });

  it("draws an anomalous move", () => {
    const rows = buildSignalChangeRows({ indicators, lines, dynamics: anomalousWeek });
    assert.equal(rows.find((row) => row.key === "riskAppetite")?.previous, 20);
  });
});

describe("the live Slack brief", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = async () => {
      throw new Error("Test fetch disabled");
    };
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /* The builders' five-area section rendered only when a caller handed them
     the area rows, and no live caller did, so every paste dropped it. */
  it("carries all five decision areas", async () => {
    const response = await getSlackBriefRoute();
    const body = await response.json();
    const brief: unknown = body.brief ?? body.data?.brief;
    assert.equal(typeof brief, "string");
    for (const area of ["Hiring", "Roadmap", "Fundraising", "Spending", "New bets"]) {
      assert.match(String(brief), new RegExp(`^• ${area}: `, "m"), `missing the ${area} row`);
    }
  });
});
