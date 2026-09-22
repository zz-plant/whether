import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreLadder, buildLadderLines, describeLadderPosition, layoutLadderLabels, nearestLadderLine, type LadderLine } from "../app/components/ui/scoreLadder";
import { ScoreCell, formatScoreReference } from "../app/components/ui/scoreCell";
import { AreaTable } from "../app/components/ui/areaTable";
import { TrustStrip } from "../app/components/trustStrip";
import { MonthStrip, describeCurrentRun } from "../app/components/history/monthStrip";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";

/*
 * The five primitives the visual-organization pass converges on. Each is judged
 * on the property that made it worth having: the ladder names the nearest line
 * and the distance; a score never prints without its reference; the area table
 * keeps one order whatever order it is given; the trust strip is four facts and
 * a link; the month strip counts changes and the current run from the data.
 */
const lines = [
  { kind: "resume" as const, value: 66 },
  { kind: "callChange" as const, value: 70 },
  { kind: "pause" as const, value: 76 },
];

describe("ScoreLadder", () => {
  it("names the nearest line and the distance to it", () => {
    assert.equal(nearestLadderLine(72, lines)?.line.kind, "callChange");
    assert.equal(describeLadderPosition(72, lines), "72 of 100 · 2 pts above the call changes line");
    assert.equal(describeLadderPosition(76, lines), "76 of 100 · at the pause line");
    assert.equal(describeLadderPosition(60, lines), "60 of 100 · 6 pts below the resume line");
  });

  it("draws last week hollow only when there is a last week", () => {
    const withPrevious = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={72} previous={68} lines={lines} />);
    assert.match(withPrevious, /Last week 68/);
    const without = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={72} previous={null} lines={lines} />);
    assert.doesNotMatch(without, /Last week/);
    assert.doesNotMatch(without, /role="img"/);
  });

  it("paints every tick before any label, so no tick crosses a label", () => {
    /* Each line used to be one translated wrapper holding its tick and label.
       A transform makes a stacking context, so a later line's tick painted
       over an earlier line's label ("Call changes|70" on a phone). */
    const html = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={85} lines={lines} />);
    const lastTick = html.lastIndexOf("w-0.5");
    const firstLabel = Math.min(...["Resume 66", "Call changes 70", "Pause 76"].map((label) => html.indexOf(label)));
    assert.ok(lastTick > 0 && firstLabel > 0);
    assert.ok(lastTick < firstLabel, "all ticks come before the first label in paint order");
  });

  it("names the hollow dot for what it is when it is not last week", () => {
    /* /history/compare draws period B against period A; a hollow dot captioned
       "last week" there would claim a comparison nobody made. */
    const html = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={72} previous={61} previousLabel="Period B" lines={lines} />,
    );
    assert.match(html, /Period B 61/);
    assert.doesNotMatch(html, /Last week/);
  });

  it("stacks labels that would overprint in the narrowest column, and only those", () => {
    /* 55 and 70 are 15 points apart: clear by the old 13%-of-track rule, and
       overprinted in the homepage's 14rem column, where "Pause 55" and
       "Call changes 70" need about 70px between their ticks. */
    const rows = (values: LadderLine[]) =>
      Object.fromEntries(layoutLadderLabels(values).map(({ line, row }) => [line.kind, row]));
    assert.deepEqual(rows([{ kind: "pause", value: 55 }, { kind: "callChange", value: 70 }]), { pause: 0, callChange: 1 });
    assert.deepEqual(rows([{ kind: "resume", value: 10 }, { kind: "callChange", value: 70 }]), { resume: 0, callChange: 0 });
    const three = rows([{ kind: "resume", value: 66 }, { kind: "callChange", value: 70 }, { kind: "pause", value: 76 }]);
    assert.equal(new Set(Object.values(three)).size, 3, "three lines within ten points take three rows");
  });

  it("builds the three lines from the numbers a surface has, drawing only the ones it states", () => {
    assert.deepEqual(buildLadderLines({ pause: 76, resume: 66, callChange: 70 }), [
      { kind: "pause", value: 76 },
      { kind: "resume", value: 66 },
      { kind: "callChange", value: 70 },
    ]);
    assert.deepEqual(buildLadderLines({ callChange: 70 }), [{ kind: "callChange", value: 70 }]);
  });
});

describe("ScoreCell", () => {
  it("prints value, line, distance and last week in that order", () => {
    assert.equal(
      formatScoreReference({ label: "Funding pressure", value: 12, line: { value: 76, label: "pause line" }, previous: 15 }),
      "Funding pressure 12 of 100 · pause line 76 · 64 pts below · last week 15",
    );
    const html = renderToStaticMarkup(<ScoreCell label="Risk appetite" value={68} line={{ value: 44, label: "Pause line" }} previous={64} />);
    assert.ok(html.indexOf("68") < html.indexOf("Pause line"));
    assert.ok(html.indexOf("Pause line") < html.indexOf("Last week"));
  });

  it("carries a reading that is not a score in its own units", () => {
    /* The base rate is a percent and the curve a spread; both are judged
       against a line the same way, and neither is "of 100". */
    assert.equal(
      formatScoreReference({
        label: "Short-term borrowing rate",
        value: 4.2,
        line: { value: 3.5, label: "Pressure line" },
        previous: 4.1,
        units: { suffix: "%", scale: "", distance: "" },
      }),
      "Short-term borrowing rate 4.2% · Pressure line 3.5% · 0.7% above · last week 4.1%",
    );
    const html = renderToStaticMarkup(
      <ScoreCell label="Curve" value={0.3} line={{ value: 0, label: "Inversion line" }} units={{ suffix: "pp", scale: "", distance: "" }} />,
    );
    assert.doesNotMatch(html, /of 100/);
    assert.match(html, /0\.3pp/);
  });
});

describe("AreaTable", () => {
  it("keeps the canonical order whatever order the rows arrive in", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "expansion-bets", rule: "Hold." },
          { area: "hiring", rule: "Backfills only." },
          { area: "capital-raising", rule: "If you plan to raise, start now." },
        ]}
      />,
    );
    const positions = ["hiring", "capital-raising", "expansion-bets"].map((area) => html.indexOf(`data-area="${area}"`));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.equal(decisionAreaOrder[0], "hiring");
    assert.match(html, /—/, "an empty slot renders a dash, not a reflow");
  });

  it("labels the pause and resume cells in every row, for the stacked phone layout", () => {
    /* Below sm the header row is not drawn and each row restacks, so a cell
       that did not name itself would leave two bare conditions side by side. */
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "hiring", rule: "Backfills only.", pause: { line: "Funding pressure > 76" }, resume: { line: "Risk appetite > 54" } },
          { area: "product-tempo", rule: "Keep the roadmap." },
        ]}
      />,
    );
    const rows = html.split("data-area=").slice(1);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.match(row, />Pause line</);
      assert.match(row, />Resume line</);
    }
    assert.doesNotMatch(html, /class="[^"]*(?<![:\w-])min-w-\[/, "no minimum width outside sm, or the table scrolls sideways on a phone");
  });
});

describe("TrustStrip", () => {
  it("is four facts and, off /trust, a link", () => {
    const html = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Sep 18, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="HIGH" couldChangeNextWeek={false} href="/trust" />,
    );
    for (const cell of ["As of", "Sources", "Confidence", "Could change next week"]) assert.match(html, new RegExp(cell));
    assert.match(html, /href="\/trust"/);
    assert.doesNotMatch(html, /HIGH|MED|LOW/, "the engine's confidence key must not reach the reader");
  });
});

describe("MonthStrip", () => {
  const entries = [
    { recordDate: "2026-03-31", regime: "EXPANSION" },
    { recordDate: "2026-04-30", regime: "EXPANSION" },
    { recordDate: "2026-05-31", regime: "DEFENSIVE" },
    { recordDate: "2026-06-30", regime: "DEFENSIVE" },
    { recordDate: "2026-07-31", regime: "DEFENSIVE" },
  ];
  it("counts changes and the current run from the data", () => {
    assert.deepEqual(describeCurrentRun(entries), { label: "Cloudy", held: 3, since: "2026-05-31", latest: "2026-07-31" });
    const html = renderToStaticMarkup(<MonthStrip entries={[...entries].reverse()} />);
    assert.match(html, /1 call change/);
    assert.match(html, /Cloudy, held 3 months since May 2026/);
    const visible = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(visible, /EXPANSION|DEFENSIVE/, "the strip must not print engine keys (the data-regime attribute is how it gets its colour)");
    /* Five month segments and one legend swatch per condition that appears. */
    assert.equal((html.match(/data-regime=/g) ?? []).length, 5 + 2);
    assert.match(visible, /Sunny\s+2 months/, "the legend names each colour and its months");
  });
});
