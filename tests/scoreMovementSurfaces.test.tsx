import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { SignalsWhatChangedSection } from "../app/signals/components/evidenceReaderSections";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { buildScoreMovementLine, previousScoresFromDynamics } from "../lib/export/scoreReference";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildSignalReferenceRows } from "../lib/report/evidenceReaderModel";
import { buildSignalChangeRows } from "../lib/report/home/homeSectionModel";
import type { RegimeSignalIndicator } from "../lib/report/homeBriefModel";
import type { ReportDynamics } from "../lib/report/reportDataTypes";
import { assessment, macros, sensors, treasury } from "./factories/exportFixtures";

/*
 * The move a score made is shown with what it is made of: the page's rows, the
 * evidence page and every paste that carries the readings. The numbers are the
 * week of Sep 25 (funding pressure 63 to 90, risk appetite 56 to 43), whose
 * split was checked against the engine: all 27 points of funding pressure are
 * rates; risk appetite is 2 from the curve and 11 from the startup-market
 * inputs, which the Aug 31 score was never built from.
 */
const comparedWith = { recordDate: "2026-08-31", label: "Aug 31" };

const week: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: true,
  changedSignals: [
    { key: "tightness", label: "Funding pressure", delta: 27 },
    { key: "riskAppetite", label: "Risk appetite", delta: -13 },
  ],
  anomalySignals: [],
  comparedWith,
  movement: {
    tightness: { parts: [{ source: "rates", points: 27 }] },
    riskAppetite: {
      parts: [
        { source: "curve", points: -2 },
        { source: "startupMarket", points: -11 },
      ],
    },
  },
};
const withoutMovement: ReportDynamics = { ...week, movement: undefined };

const FUNDING_ROW = "All from interest rates.";
const RISK_ROW =
  "-2 from the yield curve and -11 from startup-market inputs. The Aug 31 score was built from interest rates alone.";

describe("the homepage's changed-signals table", () => {
  const indicator = (key: RegimeSignalIndicator["key"], rawValue: number): RegimeSignalIndicator => ({
    key,
    label: key === "tightness" ? "Funding pressure" : key === "riskAppetite" ? "Risk appetite" : "Short-term borrowing rate",
    valueLabel: String(rawValue),
    rawValue,
    trendArrow: "→",
    trendDeltaLabel: "",
    sparkline: [],
    isFallback: false,
  });
  const build = (dynamics: ReportDynamics) =>
    buildSignalChangeRows({
      indicators: [indicator("tightness", 90), indicator("riskAppetite", 43), indicator("baseRate", 3.7)],
      lines: { tightness: { pause: 76, callChange: 70 }, riskAppetite: { pause: 44, callChange: 50 } },
      dynamics,
    });

  it("says what each score's move is made of, and says nothing for an input", () => {
    const rows = build(week);

    assert.equal(rows.find((row) => row.key === "tightness")?.movement, FUNDING_ROW);
    assert.equal(rows.find((row) => row.key === "riskAppetite")?.movement, RISK_ROW);
    assert.equal(rows.find((row) => row.key === "baseRate")?.movement, null, "an input is not split");
  });

  it("draws it under the score it explains, and draws nothing where the week has no split", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={build(week)} lead="The scores moved." comparisonUnavailable={false} basis={comparisonBasis(comparedWith)} />,
    );
    const funding = html.slice(html.indexOf('data-signal="tightness"'), html.indexOf('data-signal="riskAppetite"'));
    const risk = html.slice(html.indexOf('data-signal="riskAppetite"'), html.indexOf('data-signal="baseRate"'));
    const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    assert.match(text(funding), /What moved it: All from interest rates\./);
    assert.match(text(risk), /What moved it: -2 from the yield curve and -11 from startup-market inputs\./);
    assert.match(text(risk), /The Aug 31 score was built from interest rates alone\./);
    assert.equal((html.match(/data-movement=/g) ?? []).length, 2, "the two scores, not the market input");

    const plain = renderToStaticMarkup(
      <WhatChangedSection rows={build(withoutMovement)} lead="The scores moved." comparisonUnavailable={false} basis={comparisonBasis(comparedWith)} />,
    );
    assert.doesNotMatch(plain, /What moved it/);
  });
});

describe("the evidence page", () => {
  it("carries the same sentences on its rows, and none for a signal that is not a score", () => {
    const rows = buildSignalReferenceRows(assessment, week);

    assert.equal(rows.find((row) => row.key === "tightness")?.movement, FUNDING_ROW);
    assert.equal(rows.find((row) => row.key === "riskAppetite")?.movement, RISK_ROW);
    assert.equal(rows.find((row) => row.key === "baseRate")?.movement, null);
    assert.equal(rows.find((row) => row.key === "curveSlope")?.movement, null);
  });

  it("prints a score's sentence under its move", () => {
    const html = renderToStaticMarkup(
      <SignalsWhatChangedSection
        rows={buildSignalReferenceRows(assessment, week).map((row) => ({ ...row, note: null }))}
        activeFocus="all"
        focusLabelByTab={{ all: "All signals", growth: "Growth", inflation: "Inflation", labor: "Labor", financial: "Financial" }}
        focusInstruments={[]}
        basis={comparisonBasis(comparedWith)}
      />,
    );

    assert.equal((html.match(/data-movement=/g) ?? []).length, 2);
    assert.match(html, /All from interest rates\./);
    assert.match(html, /The Aug 31 score was built from interest rates alone\./);
  });

  it("prints rollup indicators bridging instruments to composite score ladders", () => {
    const html = renderToStaticMarkup(
      <SignalsWhatChangedSection
        rows={buildSignalReferenceRows(assessment, week).map((row) => ({ ...row, note: null }))}
        activeFocus="all"
        focusLabelByTab={{ all: "All signals", growth: "Growth", inflation: "Inflation", labor: "Labor", financial: "Financial" }}
        focusInstruments={[]}
        basis={comparisonBasis(comparedWith)}
      />,
    );

    assert.match(html, /Feeds into <a href="#call-lines"[^>]*>Funding pressure<\/a>/);
    assert.match(html, /Sets operating boundary lines/);
  });
});

describe("the pastes", () => {
  const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };

  it("carry the split from the week's dynamics, next to the readings it explains", () => {
    const previousScores = previousScoresFromDynamics(week, scores);

    assert.deepEqual(previousScores?.movement, week.movement);
    assert.equal(
      buildScoreMovementLine(previousScores),
      "What moved the scores since Aug 31: funding pressure +27 (all from interest rates); risk appetite -13 (-2 from the yield curve and -11 from startup-market inputs). The Aug 31 scores were built from interest rates alone.",
    );

    const brief = buildSlackBrief(assessment, treasury, sensors, macros, { previousScores });
    assert.match(brief, /^What moved the scores since Aug 31: funding pressure \+27/m);
    // Under the two readings, above the rate inputs they explain.
    assert.ok(brief.indexOf("Risk appetite ") < brief.indexOf("What moved the scores"));
    assert.ok(brief.indexOf("What moved the scores") < brief.indexOf("Short-term borrowing rate"));
  });

  it("print no line where the week has no split, rather than one that does not add up", () => {
    const previousScores = previousScoresFromDynamics(withoutMovement, scores);

    assert.equal(buildScoreMovementLine(previousScores), null);
    assert.doesNotMatch(buildSlackBrief(assessment, treasury, sensors, macros, { previousScores }), /What moved the scores/);
    assert.equal(buildScoreMovementLine(null), null);
  });
});
