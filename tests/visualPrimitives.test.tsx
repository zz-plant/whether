import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreLadder, describeLadderPosition, nearestLadderLine } from "../app/components/ui/scoreLadder";
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
    assert.match(withPrevious, /Last week 68\./);
    const without = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={72} previous={null} lines={lines} />);
    assert.doesNotMatch(without, /Last week/);
    assert.doesNotMatch(without, /role="img"/);
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
    assert.equal((html.match(/data-regime=/g) ?? []).length, 5);
  });
});
