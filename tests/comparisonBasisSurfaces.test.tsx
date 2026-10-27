import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import { SignalsCallLinesSection, SignalsWhatChangedSection } from "../app/signals/components/evidenceReaderSections";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { evaluateRegime } from "../lib/regimeEngine";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildCallLineLadders, buildSignalReferenceRows } from "../lib/report/evidenceReaderModel";
import { buildSignalChangeRows, describeWeeklyMovement } from "../lib/report/home/homeSectionModel";
import type { RegimeSignalIndicator } from "../lib/report/homeBriefModel";
import type { ReportDynamics } from "../lib/report/reportDataTypes";
import { snapshotData } from "../lib/snapshot";

/*
 * The comparison behind every move on the reading routes is the previous
 * monthly snapshot, so a Sep 25 read compares with Aug 31, not with last week.
 * These render each surface from a week that records that date and hold that
 * none of them still says "last week" over it, and from a week that does not
 * record one and hold that the wording it always had is unchanged
 * (`lib/report/comparisonBasis.ts`).
 */
const comparedWith = { recordDate: "2026-08-31", label: "Aug 31" };

const datedWeek: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: true,
  changedSignals: [
    { key: "tightness", label: "Funding pressure", delta: 27 },
    { key: "riskAppetite", label: "Risk appetite", delta: -13 },
  ],
  anomalySignals: [],
  comparedWith,
};
const undatedWeek: ReportDynamics = { ...datedWeek, comparedWith: undefined };

const assessment = evaluateRegime(snapshotData);
const noWords = /last week/i;

describe("the earlier scores a week hands every surface", () => {
  const current = { tightness: 90, riskAppetite: 43 };

  it("carry the reading they are from, and none where the week records none", () => {
    assert.deepEqual(previousScoresFromDynamics(datedWeek, current), {
      tightness: 63,
      riskAppetite: 56,
      comparedWith,
    });
    assert.deepEqual(previousScoresFromDynamics(undatedWeek, current), { tightness: 63, riskAppetite: 56 });
  });
});

describe("the sentence over the homepage table", () => {
  const moved = { tightnessDelta: 27, riskAppetiteDelta: -13, comparisonUnavailable: false };

  it("says since the date, not this week, when it knows the date", () => {
    assert.equal(
      describeWeeklyMovement({ ...moved, basis: comparisonBasis(comparedWith) }),
      "The scores moved toward tighter money since Aug 31.",
    );
    assert.equal(
      describeWeeklyMovement({ tightnessDelta: 0, riskAppetiteDelta: 0, comparisonUnavailable: false, basis: comparisonBasis(comparedWith) }),
      "Neither score moved much since Aug 31.",
    );
  });

  it("keeps its old wording for a week with no date, and says nothing was compared when nothing was", () => {
    assert.equal(describeWeeklyMovement(moved), "The scores moved toward tighter money this week.");
    assert.equal(
      describeWeeklyMovement({ ...moved, comparisonUnavailable: true, basis: comparisonBasis(comparedWith) }),
      "No previous week to compare the scores against.",
    );
  });
});

describe("the homepage's changed-signals table", () => {
  const indicator = (key: RegimeSignalIndicator["key"], rawValue: number): RegimeSignalIndicator => ({
    key,
    label: key === "tightness" ? "Funding pressure" : "Risk appetite",
    valueLabel: String(rawValue),
    rawValue,
    trendArrow: "→",
    trendDeltaLabel: "",
    sparkline: [],
    isFallback: false,
  });
  const rows = buildSignalChangeRows({
    indicators: [indicator("tightness", 90), indicator("riskAppetite", 43)],
    lines: { tightness: { pause: 76, callChange: 70 }, riskAppetite: { pause: 44, callChange: 50 } },
    dynamics: datedWeek,
  });

  it("heads its comparison column with the date and draws the hollow dot under it", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection
        rows={rows}
        lead="The scores moved toward tighter money since Aug 31."
        comparisonUnavailable={false}
        basis={comparisonBasis(comparedWith)}
      />,
    );
    const text = html.replace(/<[^>]+>/g, " ");

    assert.match(text, /Aug 31 → this week/);
    assert.match(text, /Aug 31: 63/, "the ladder names its hollow dot for the reading it is drawn from");
    assert.match(text, /against Aug 31 and against its lines/);
    assert.match(text, /since Aug 31/, "and the move is read out against it");
    assert.doesNotMatch(text, noWords);
  });

  it("keeps last week for a week that does not date its comparison", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={rows} lead="The scores moved toward tighter money this week." comparisonUnavailable={false} />,
    );

    assert.match(html, /Last week → this week/);
    assert.match(html, /Last week: 63/);
  });

  it("leaves the dated ladders to What changed, and says nothing undated over the move", () => {
    /* The section used to redraw the two ladders "What changed" draws, hollow
       dot and all (DD-039). It keeps the radar and the market moves, folded
       under the call-change line; the dated dot is asserted on the "What
       changed" table above. */
    const html = renderToStaticMarkup(
      <WhatWouldChangeSection
        ladders={[
          {
            metric: "tightness",
            label: "Funding pressure",
            value: 90,
            previous: 63,
            lines: [{ kind: "pause", value: 76 }, { kind: "callChange", value: 70 }],
          },
        ]}
        flipProximity={[{ axis: "tightness", sentence: "If the 1-month bill rate falls 0.15%, conditions turn Stormy." }]}
        callChangeLines={{ tightness: 70, riskAppetite: 50 }}
      />,
    );

    assert.doesNotMatch(html, /data-ladder-row=/, "no score ladder is redrawn here");
    assert.match(html.replace(/<[^>]+>/g, " "), /Funding pressure:\s+If the 1-month bill rate falls 0\.15%/);
    assert.doesNotMatch(html, noWords);
  });
});

describe("the evidence page", () => {
  const rows = buildSignalReferenceRows(assessment, datedWeek);

  it("reads every row's move against the date, and gives each score cell the same head", () => {
    const funding = rows.find((row) => row.key === "tightness");
    const curve = rows.find((row) => row.key === "curveSlope");

    assert.equal(funding?.direction.label, "+27 points since Aug 31.");
    // A signal the week did not move is unchanged since the date, not "from last week".
    assert.equal(curve?.direction.label, "Unchanged since Aug 31.");
  });

  it("keeps the old wording for a week that does not date its comparison", () => {
    const undated = buildSignalReferenceRows(assessment, undatedWeek);

    assert.equal(undated.find((row) => row.key === "tightness")?.direction.label, "+27 points since last week.");
    assert.equal(undated.find((row) => row.key === "curveSlope")?.direction.label, "Unchanged from last week.");
  });

  it("prints the date in the table head, the caption, the score cells and the call-line ladders", () => {
    const changed = renderToStaticMarkup(
      <SignalsWhatChangedSection
        rows={rows.map((row) => ({ ...row, note: null }))}
        activeFocus="all"
        focusLabelByTab={{ all: "All signals", growth: "Growth", inflation: "Inflation", labor: "Labor", financial: "Financial" }}
        focusInstruments={[]}
        basis={comparisonBasis(comparedWith)}
      />,
    );
    const ladders = renderToStaticMarkup(
      <SignalsCallLinesSection
        ladders={buildCallLineLadders(assessment, datedWeek, [])}
        triggerCondition="Pause net-new hiring if funding pressure rises above 76."
        reversalCondition="Resume once both scores are back across their resume lines."
        showMicroDecisionRows={false}
      />,
    );
    const text = `${changed} ${ladders}`.replace(/<[^>]+>/g, " ");

    assert.match(text, /Since Aug 31/);
    assert.match(text, /against its line and Aug 31/);
    assert.match(text, /Aug 31/);
    assert.match(ladders.replace(/<[^>]+>/g, " "), /Aug 31: \d/);
    assert.doesNotMatch(text, noWords);
  });
});
