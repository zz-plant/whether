import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AreaTable } from "../app/components/ui/areaTable";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import type { RegimeKey } from "../lib/regimeEngine";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { areaLinesFromRules, buildDecisionMovement, describeMovementCause } from "../lib/report/decisionMovement";
import { buildHomeAreaRows } from "../lib/report/home/homeSectionModel";

/*
 * The "Changed" column of the by-area table used to carry a fixed re-check sentence for whichever
 * three areas the largest signal moves pointed at, whether or not the area's rule had anything to
 * re-check, and a bare dash for the other two. It now says what the week did to each area's own
 * lines, and on a week nothing crossed a line it says nothing per row: the section's lead says so once.
 */
const week = ({
  from,
  to,
  regime,
}: {
  from: { tightness: number; riskAppetite: number };
  to: { tightness: number; riskAppetite: number };
  regime: RegimeKey;
}) => {
  const decisionRules = buildCanonicalBoundedDecisionRules({ regime, thresholds: DEFAULT_THRESHOLDS, scores: to });
  const movement = buildDecisionMovement({
    scores: to,
    previous: { ...from, comparedWith: { label: "Aug 31" } },
    thresholds: DEFAULT_THRESHOLDS,
    regime,
    areas: areaLinesFromRules(decisionRules),
  });
  return { movement, rows: buildHomeAreaRows({ decisionRules, movement, scores: to }) };
};

const renderTable = (rows: ReturnType<typeof buildHomeAreaRows>) =>
  renderToStaticMarkup(
    <AreaTable
      caption="by area"
      rows={rows.map((row) => ({ area: row.area, rule: row.rule, changed: row.changed }))}
    />,
  );

describe("the by-area Changed column", () => {
  it("says what the week did to each area's own lines", () => {
    const { rows } = week({ from: { tightness: 63, riskAppetite: 56 }, to: { tightness: 90, riskAppetite: 43 }, regime: "SCARCITY" });
    const byArea = new Map(rows.map((row) => [row.area, row]));

    assert.equal(byArea.get("burn-discipline")?.changed, "Pause now applies: funding pressure rose above 76.");
    assert.equal(byArea.get("product-tempo")?.changed, "Pause now applies: risk appetite fell below 44.");
    assert.ok(rows.every((row) => row.changedKind === "paused"));

    const html = renderTable(rows);
    assert.match(html, /<th[^>]*>Changed<\/th>/);
    assert.match(html, /Pause now applies: funding pressure rose above 76\./);
    assert.doesNotMatch(html, /Re-check|Look at the roadmap again/, "the fixed re-check sentences are gone");
  });

  it("names the area a move did not touch, so a moved row is not the only row with an answer", () => {
    // Funding pressure alone crosses the pause line: the roadmap rule is written on risk appetite.
    const { rows } = week({ from: { tightness: 60, riskAppetite: 60 }, to: { tightness: 80, riskAppetite: 60 }, regime: "DEFENSIVE" });
    const byArea = new Map(rows.map((row) => [row.area, row]));

    // The roadmap held past its resume line, and says so.
    assert.equal(byArea.get("product-tempo")?.changed, "Resume line still met: no line crossed since Aug 31.");
    assert.equal(byArea.get("product-tempo")?.changedKind, "held");
    assert.equal(byArea.get("hiring")?.changedKind, "paused");
    assert.match(renderTable(rows), /Resume line still met: no line crossed since Aug 31\./);
  });

  /* On a week no line was crossed the card's line under the call says so once
     (`describeMovementCause`), so no row repeats it. */
  it("draws no column on a week nothing crossed a line", () => {
    const { rows, movement } = week({ from: { tightness: 77, riskAppetite: 42 }, to: { tightness: 85, riskAppetite: 39 }, regime: "SCARCITY" });

    assert.ok(rows.every((row) => row.changed === undefined && row.changedKind === undefined));
    assert.doesNotMatch(renderTable(rows), /<th[^>]*>Changed<\/th>/);
    assert.ok(movement);
    assert.equal(describeMovementCause(movement), "No score crossed a pause or resume line since Aug 31.");
  });

  it("carries no claim where nothing was compared", () => {
    const decisionRules = buildCanonicalBoundedDecisionRules({ regime: "SCARCITY", thresholds: DEFAULT_THRESHOLDS, scores: { tightness: 90, riskAppetite: 43 } });
    const rows = buildHomeAreaRows({ decisionRules, movement: null, scores: { tightness: 90, riskAppetite: 43 } });

    assert.ok(rows.every((row) => row.changed === undefined));
  });
});
