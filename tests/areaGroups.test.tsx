import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AreaGroups } from "../app/components/home/AreaGroups";
import { buildAreaGroups, type HomeAreaLineSlot, type HomeAreaRow } from "../lib/report/home/homeSectionModel";
import { describeScoreMoveBand } from "../lib/report/marketMoveScale";

/*
 * Every area's rule, grouped by the condition that changes it (2026-11-03). The week of
 * Oct 6, 2026: funding pressure pinned at 90 held four areas, and the roadmap sat four
 * points above its pause line on risk appetite.
 */
const slot = (overrides: Partial<HomeAreaLineSlot>): HomeAreaLineSlot => ({
  line: "",
  distance: "",
  points: 10,
  met: false,
  metric: "tightness",
  ...overrides,
});

const heldRow = (area: HomeAreaRow["area"]): HomeAreaRow => ({
  area,
  rule: `Rule for ${area}`,
  pause: slot({ met: true, points: 14, value: 76, holdsAbove: true }),
  resume: slot({ points: 24, value: 66, holdsAbove: false }),
  changed: "Pause still applies; no change since Sep 30.",
  changedKind: "held",
});

const ROWS: HomeAreaRow[] = [
  heldRow("hiring"),
  {
    area: "product-tempo",
    rule: "Ship what is committed",
    pause: slot({ points: 4, value: 44, holdsAbove: false, metric: "riskAppetite" }),
    changed: "Restart condition no longer holds: risk appetite fell below 54.",
    changedKind: "resumeLost",
  },
  heldRow("capital-raising"),
  heldRow("burn-discipline"),
  heldRow("expansion-bets"),
];

const SCORES = { tightness: 90, riskAppetite: 48 };

describe("buildAreaGroups", () => {
  const groups = buildAreaGroups(ROWS, SCORES);

  it("says a shared restart condition once, over the four areas it holds", () => {
    assert.equal(groups.length, 2);
    const [held, near] = groups;
    assert.equal(held?.status, "On hold");
    assert.deepEqual(held?.areas.map((entry) => entry.label), ["Hiring", "Fundraising", "Spending", "New bets"]);
    assert.equal(held?.condition, "Restarts when funding pressure falls below 66.");
    assert.equal(near?.status, "Close to pausing");
    assert.equal(near?.condition, "Pauses if risk appetite falls below 44.");
  });

  it("puts today's score and the size of the move beside each condition", () => {
    const [held, near] = groups;
    const band = describeScoreMoveBand("tightness", 24);
    assert.ok(band, "the record sizes a 24-point move");
    assert.equal(held?.distance, `It is 90 today, ${band} away.`);
    assert.match(near?.distance ?? "", /^It is 48 today, .+ away\.$/);
  });

  it("keeps a move this week with the area it moved, and drops the standing state the group says", () => {
    const [held, near] = groups;
    assert.ok(held?.areas.every((entry) => entry.changed === undefined), "\"Pause still applies\" is the group's heading");
    assert.equal(near?.areas.at(0)?.changed, "Restart condition no longer holds: risk appetite fell below 54.");
  });

  it("at the line, gives the score without a move to size", () => {
    const [group] = buildAreaGroups(
      [{ area: "hiring", rule: "Hold", pause: slot({ points: 0, value: 76, holdsAbove: true }) }],
      { tightness: 76, riskAppetite: 50 },
    );
    assert.equal(group?.distance, "It is 76 today.");
  });

  it("is empty when no area states a pause", () => {
    assert.deepEqual(buildAreaGroups([{ area: "hiring", rule: "Hold" }], SCORES), []);
  });
});

describe("AreaGroups", () => {
  const html = renderToStaticMarkup(<AreaGroups groups={buildAreaGroups(ROWS, SCORES)} />);

  it("names a held group with the crossed-line glyph and the word, in the line ink", () => {
    assert.match(html, /<h3 class="[^"]*text-line-crossed-fg[^"]*"><svg[^>]*lucide-pause[\s\S]*?<\/svg><span>On hold: Hiring, Fundraising, Spending and New bets<\/span><\/h3>/);
    assert.doesNotMatch(html, /warning/i);
    assert.doesNotMatch(html, /border-l-\d|border-l-semantic/, "no side stripe");
  });

  it("prints each area's action under its group, with the anchor the distance ladder links to", () => {
    for (const area of ["hiring", "product-tempo", "capital-raising", "burn-discipline", "expansion-bets"]) {
      assert.equal((html.match(new RegExp(`id="area-${area}"`, "g")) ?? []).length, 1, area);
    }
    assert.match(html, /<span class="[^"]*">Roadmap\.<\/span> Ship what is committed\./);
    assert.equal((html.match(/Restarts when funding pressure falls below 66/g) ?? []).length, 1, "the shared condition, once");
  });

  it("renders nothing with no groups", () => {
    assert.equal(renderToStaticMarkup(<AreaGroups groups={[]} />), "");
  });
});
