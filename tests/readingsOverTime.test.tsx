import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { ScoreLadder } from "../app/components/ui/scoreLadder";
import { SignalsWhatChangedSection } from "../app/signals/components/evidenceReaderSections";
import { evaluateRegime } from "../lib/regimeEngine";
import { areasGovernedBy } from "../lib/report/boundedDecisionRules";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildSignalReferenceRows } from "../lib/report/evidenceReaderModel";
import { buildInputTrails } from "../lib/report/home/inputTrail";
import type { SignalChangeRow } from "../lib/report/home/homeSectionModel";
import { describeConditionFacts, describeScoreDistribution } from "../lib/report/lastTimeCallChanged";
import type { ReportDynamics } from "../lib/report/reportDataTypes";
import { buildSignalFlow } from "../lib/report/signalFlow";
import { snapshotData } from "../lib/snapshot";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

/*
 * Readings over time (2026-11-18). Each graphic here sits beside the sentence that states
 * its fact, and draws its numbers from the object that sentence is built from: the trail
 * from the row whose figure is its last point, the rail from the row whose cell is its
 * caption, the diagram from the rows' own relations, the hero's distribution from the
 * series its "higher than most months" sentence counts.
 */

const days = (values: readonly number[], start = 8) =>
  values.map((value, index) => ({ date: `2026-10-${String(start + index).padStart(2, "0")}`, value }));

const inputRows = (overrides: Partial<Record<"baseRate" | "curveSlope", Partial<SignalChangeRow>>> = {}): SignalChangeRow[] => [
  {
    key: "baseRate",
    label: "Short-term borrowing rate",
    value: 4.1,
    valueLabel: "4.10",
    previous: 4.04,
    previousLabel: "4.04",
    delta: 0.06,
    increaseIsPositive: false,
    ...overrides.baseRate,
  },
  {
    key: "curveSlope",
    label: "Recession warning gauge",
    value: 0.29,
    valueLabel: "0.29",
    previous: 0.32,
    previousLabel: "0.32",
    delta: -0.03,
    increaseIsPositive: true,
    ...overrides.curveSlope,
  },
];

const treasury = {
  record_date: "2026-10-14",
  yields: { oneMonth: 4.1, threeMonth: 4.0, twoYear: 4.83, tenYear: 5.12 },
  oneMonthHistory: [...days([4.14, 4.13, 4.08, 4.04, 4.06, 4.1]), { date: "2026-10-15", value: 4.2 }],
};
const materializedSignals = {
  asOf: "2026-10-15T00:00:00.000Z",
  signals: {},
  recentHistory: {
    TREASURY_10Y: days([5.22, 5.2, 5.18, 5.16, 5.14, 5.12]),
    TREASURY_2Y: days([4.75, 4.8, 4.82, 4.84, 4.94, 4.83]),
  },
};

describe("the trailing readings of the two market inputs", () => {
  const trails = buildInputTrails({
    treasury,
    materializedSignals,
    rows: inputRows(),
    baseRateLine: 3.5,
    comparedWith: { recordDate: "2026-10-11" },
  });

  it("ends each trail at the figure its row prints, and drops what came after the reading", () => {
    assert.equal(trails.baseRate?.points.at(-1)?.value, 4.1);
    assert.equal(trails.baseRate?.points.length, 6, "Oct 15 is after the Oct 14 reading");
    assert.equal(trails.curveSlope?.points.at(-1)?.value, 0.29, "10-year less 2-year, day by day");
  });

  it("marks the earlier reading at the day on or before its date, with the row's earlier value", () => {
    assert.deepEqual(trails.baseRate?.comparison, { index: 3, value: 4.04 });
    assert.deepEqual(trails.curveSlope?.comparison, { index: 3, value: 0.32 });
  });

  it("draws the line where it is within reach, and names the edge it lies past where not", () => {
    assert.equal(trails.curveSlope?.line.offScale, null);
    assert.equal(trails.curveSlope?.domain[0], 0, "the drawn range takes in the 0.00 line");
    assert.equal(trails.curveSlope?.line.crossed, false);
    assert.equal(trails.baseRate?.line.offScale, "below");
    assert.equal(trails.baseRate?.line.crossed, true, "4.10 counts against you above 3.50");
    assert.equal(trails.baseRate?.lineCaption, "Counts against you above 3.50, under this range");
  });

  it("states the drawn range and its days", () => {
    assert.equal(trails.baseRate?.caption, "Daily, Oct 8 to Oct 13 · 4.04–4.14");
    assert.equal(trails.curveSlope?.caption, "Daily, Oct 8 to Oct 13 · 0.00–0.47");
  });

  it("draws nothing it cannot draw honestly", () => {
    const disagreeing = buildInputTrails({
      treasury,
      materializedSignals,
      rows: inputRows({ baseRate: { value: 4.2 } }),
      baseRateLine: 3.5,
      comparedWith: null,
    });
    assert.equal(disagreeing.baseRate, undefined, "a last point that is not the row's figure");
    assert.equal(disagreeing.curveSlope?.comparison, null, "no comparison, no tick");

    const fedFunds = buildInputTrails({
      treasury: { ...treasury, yields: { ...treasury.yields, fedFunds: 4.33 } },
      materializedSignals: null,
      rows: inputRows(),
      baseRateLine: 3.5,
      comparedWith: null,
    });
    assert.deepEqual(fedFunds, {}, "the bill's history is not the fed funds rate's, and an untyped model reads as none");

    const short = buildInputTrails({
      treasury: { ...treasury, oneMonthHistory: days([4.08, 4.1]) },
      materializedSignals: { recentHistory: "not a history" },
      rows: inputRows(),
      baseRateLine: 3.5,
      comparedWith: null,
    });
    assert.deepEqual(short, {}, "two readings make a segment, not a shape");
  });

  it("draws under the figure in the homepage table, with a readout and its key", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={inputRows()} inputTrails={trails} comparisonUnavailable={false} basis={comparisonBasis({ label: "Oct 11" })} />,
    );
    const rate = html.slice(html.indexOf('data-signal="baseRate"'), html.indexOf('data-signal="curveSlope"'));
    const text = rate.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.match(text, /4\.10 Oct 11: 4\.04/, "the figure and the earlier reading stay as its label");
    assert.match(rate, /<input type="range"[^>]*aria-label="Short-term borrowing rate, daily readings"/);
    assert.match(rate, /aria-valuetext="Oct 13: 4\.10"/);
    assert.match(text, /Daily, Oct 8 to Oct 13 · 4\.04–4\.14/);
    assert.match(text, /↓ Counts against you above 3\.50, under this range/);
    assert.match(rate, /data-sparkline-mark/);
    assert.doesNotMatch(rate, /data-sparkline-reference=/, "a line off the range is named, not drawn");
    const curve = html.slice(html.indexOf('data-signal="curveSlope"'));
    assert.match(curve, /data-sparkline-reference/);

    const without = renderToStaticMarkup(<WhatChangedSection rows={inputRows()} comparisonUnavailable={false} />);
    assert.doesNotMatch(without, /data-input-trail/);
  });
});

describe("a score held by its ceiling", () => {
  const lines = [{ kind: "pause" as const, value: 76 }, { kind: "resume" as const, value: 66 }, { kind: "callChange" as const, value: 70 }];

  it("puts the uncapped score past the scale's end, with its key, where it is over 100", () => {
    const html = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={lines} uncapped={108} />);
    assert.match(html, /data-ladder-uncapped="past"/);
    assert.match(html, /Uncapped 108, past 100/);
    /* Higher is worse, so the scale runs 100 to 0 and its end is the left. */
    assert.match(html, /data-ladder-uncapped="past"[^>]*style="left:0%"/);
  });

  it("draws a ghost on the scale where the uncapped score fits, and nothing without one", () => {
    const ghost = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={lines} uncapped={96} />);
    assert.match(ghost, /data-ladder-uncapped="ghost"/);
    assert.match(ghost, /Uncapped 96/);
    const plain = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={lines} />);
    assert.doesNotMatch(plain, /data-ladder-uncapped/);
  });

  it("is drawn on the homepage's ladder beside the sentence that gives the number", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection
        rows={[{ key: "tightness", label: "Funding pressure", value: 90, valueLabel: "90", previous: 90, previousLabel: "90", delta: 0, increaseIsPositive: false, lines, saturatedPressure: 108 }]}
        comparisonUnavailable={false}
      />,
    );
    assert.match(html, /data-ladder-uncapped="past"/);
    assert.match(html, /Uncapped it would be 108, so a further rise can’t show here\./);
  });
});

describe("the record behind the brief's two figures", () => {
  const series: TimeMachineRegimeEntry[] = Array.from({ length: 40 }, (_, index) => ({
    year: 2012 + Math.floor(index / 12),
    month: (index % 12) + 1,
    recordDate: `${2012 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-28`,
    regime: "EXPANSION",
    summary: "",
    tightness: index < 30 ? 2 : 92,
    riskAppetite: 20 + index,
  }));

  it("counts every month-end once, and ranks the score as the sentence beside it does", () => {
    const distribution = describeScoreDistribution({ series, metric: "tightness", value: 90 });
    assert.ok(distribution);
    assert.equal(distribution.bins.reduce((sum, count) => sum + count, 0), series.length);
    assert.equal(distribution.bins[0], 30);
    assert.equal(distribution.bins[18], 10);
    assert.equal(distribution.summary, "Higher than 75% of the 40 month-end readings since Jan 2012.");
    assert.match(describeConditionFacts({ series, regime: "SCARCITY", tightness: 90, riskAppetite: 45 }) ?? "", /Funding pressure is 90, higher than most months since 2012\./);
    assert.equal(describeScoreDistribution({ series: series.slice(0, 10), metric: "tightness", value: 90 }), null, "too short a record to rank against");
  });

  it("draws it behind the figure's rule with the rank as its title, and not on the compact figure", () => {
    const distribution = describeScoreDistribution({ series, metric: "riskAppetite", value: 30 });
    const lines = [{ kind: "pause" as const, value: 44 }, { kind: "resume" as const, value: 54 }, { kind: "callChange" as const, value: 50 }];
    const html = renderToStaticMarkup(<ScoreLadder figure label="Risk appetite" value={30} lines={lines} distribution={distribution} />);
    assert.match(html, /data-ladder-distribution[^>]*title="Lower than 73% of the 40 month-end readings since Jan 2012\."/);
    /* The rank is the drawing's title, not repeated as hidden text: the sentence beside the
       brief's figures says it in words ("lower than most months since 2012"). */
    assert.doesNotMatch(html, /<span class="sr-only">[^<]*Lower than 73%/);
    const compact = renderToStaticMarkup(<ScoreLadder figure="compact" label="Risk appetite" value={30} lines={lines} distribution={distribution} />);
    assert.doesNotMatch(compact, /data-ladder-distribution|Lower than 73%/);
    const off = renderToStaticMarkup(<ScoreLadder figure label="Risk appetite" value={30} lines={lines} />);
    assert.doesNotMatch(off, /data-ladder-distribution/, "off unless asked for");
  });
});

const week: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: false,
  changedSignals: [
    { key: "riskAppetite", label: "Risk appetite", delta: -9 },
    { key: "baseRate", label: "Short-term borrowing rate", delta: 0.06 },
  ],
  anomalySignals: [],
  comparedWith: { recordDate: "2026-11-09", label: "Nov 9" },
};
const assessment = evaluateRegime(snapshotData);
const rows = buildSignalReferenceRows(assessment, week);

describe("the evidence table's rails", () => {
  it("states each row's scale: 0–100 for a score, the record's room for the rate, the scored spread for the curve", () => {
    assert.deepEqual(Object.fromEntries(rows.map((row) => [row.key, row.scale])), {
      tightness: { min: 0, max: 100 },
      riskAppetite: { min: 0, max: 100 },
      baseRate: { min: 0, max: 6 },
      curveSlope: { min: -1, max: 1.5 },
    });
  });

  it("puts the hard side of every line on the left, so the rows compare", () => {
    const html = renderToStaticMarkup(
      <SignalsWhatChangedSection
        rows={rows.map((row) => ({ ...row, note: null }))}
        activeFocus="all"
        focusLabelByTab={{ all: "All", growth: "Growth", inflation: "Inflation", labor: "Labor", financial: "Financial" }}
        focusInstruments={[]}
        basis={comparisonBasis(week.comparedWith)}
      />,
    );
    assert.equal((html.match(/data-signal-rail=/g) ?? []).length, 4, "one rail per row");
    assert.equal((html.match(/data-signal-rail-hard="true" [^>]*style="left:0%/g) ?? []).length, 4);
    const rail = (key: string) => html.slice(html.indexOf(`data-signal-rail="${key}"`), html.indexOf("</figure>", html.indexOf(`data-signal-rail="${key}"`)));
    /* Higher is worse for funding pressure and the rate: their rails run high to low. */
    assert.match(rail("tightness").replace(/<[^>]+>/g, " "), /100 .*70 .*0 /);
    assert.match(rail("baseRate").replace(/<[^>]+>/g, " "), /6% .*3\.50% .*0% /);
    assert.match(rail("riskAppetite").replace(/<[^>]+>/g, " "), /0 .*50 .*100 /);
    assert.match(rail("curveSlope").replace(/<[^>]+>/g, " "), /-1pp .*0\.00pp .*1\.5pp /);
    assert.match(rail("riskAppetite"), /data-signal-rail-previous/, "the earlier reading, hollow");
    /* The numbers stay, as the rail's caption. */
    assert.match(rail("tightness"), /<figcaption[\s\S]*This week[\s\S]*Change line/);
  });
});

describe("inputs to scores to areas", () => {
  const flow = buildSignalFlow(rows, "Nov 9");

  it("draws an edge per feed and per area a score sets the lines for", () => {
    const edges = flow.edges.map((edge) => `${edge.from}>${edge.to}${edge.condition ? "?" : ""}`);
    assert.deepEqual(edges.slice(0, 3), ["baseRate>tightness", "curveSlope>riskAppetite", "curveSlope>tightness?"]);
    for (const metric of ["tightness", "riskAppetite"] as const) {
      assert.deepEqual(
        flow.edges.filter((edge) => edge.from === metric).map((edge) => edge.to),
        areasGovernedBy(metric),
      );
    }
  });

  it("lights every path through a node and nothing else", () => {
    assert.deepEqual([...(flow.reach.baseRate ?? [])].sort(), ["baseRate", "burn-discipline", "capital-raising", "hiring", "tightness"]);
    assert.deepEqual([...(flow.reach["capital-raising"] ?? [])].sort(), ["baseRate", "capital-raising", "curveSlope", "riskAppetite", "tightness"]);
  });

  it("replaces the rows' relation lines, which stay for a screen reader as words with no links", () => {
    const html = renderToStaticMarkup(
      <SignalsWhatChangedSection
        rows={rows.map((row) => ({ ...row, note: null }))}
        activeFocus="all"
        focusLabelByTab={{ all: "All", growth: "Growth", inflation: "Inflation", labor: "Labor", financial: "Financial" }}
        focusInstruments={[]}
        basis={comparisonBasis(week.comparedWith)}
        flow={flow}
      />,
    );
    assert.match(html, /data-signal-flow/);
    assert.match(html, /<a href="\/\?decision=hiring#what-it-changes"[^>]*data-signal-flow-node="hiring"/);
    assert.match(html, /<a href="#baseRate"[^>]*data-signal-flow-node="baseRate"/);
    assert.doesNotMatch(html, /data-governs=/, "no visible Affects line beside the diagram");
    assert.match(html, /<span class="sr-only">Affects: Hiring, Fundraising, Spending\.<\/span>/);
    assert.match(html, /<span class="sr-only">Feeds into Risk appetite, and Funding pressure once inverted \(short-term rates above long-term\)\.<\/span>/);
    /* Moved since Nov 9: risk appetite and the rate carry their arrow; funding pressure did not move. */
    const node = (key: string) => html.slice(html.indexOf(`data-signal-flow-node="${key}"`), html.indexOf("</a>", html.indexOf(`data-signal-flow-node="${key}"`)));
    assert.match(node("riskAppetite"), /, fell since Nov 9/);
    assert.match(node("baseRate"), /, rose since Nov 9/);
    assert.doesNotMatch(node("tightness"), /, rose|, fell/);
    assert.match(html, /An arrow beside a signal is its move since Nov 9\./);
  });
});
