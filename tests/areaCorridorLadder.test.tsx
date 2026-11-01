import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDecisionCorridorModel } from "../lib/report/operatingCalls";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { AreaCorridorLadder } from "../app/components/ui/areaCorridorLadder";

describe("5-area decision corridor ladder model & component", () => {
  const scores = { tightness: 90, riskAppetite: 55 };
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "SCARCITY",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores,
  });

  it("builds normalized coordinates for all 5 areas", () => {
    const model = buildDecisionCorridorModel(rules, scores);
    assert.equal(model.areas.length, 5);
    assert.equal(model.tightnessScore, 90);
    assert.equal(model.riskAppetiteScore, 55);

    // Hiring & Spending governed by tightness: 90 > 76 pause line -> on hold
    const hiring = model.areas.find((a) => a.area === "hiring");
    assert.ok(hiring);
    assert.equal(hiring.state, "crossed");
    assert.equal(hiring.pauseLine, 76);
    assert.equal(hiring.resumeLine, 66);
    assert.equal(hiring.distanceToUnlock, 24); // 90 - 66 = 24 pts to unlock

    // Roadmap governed by riskAppetite: 55 > 44 (pause is at 44) -> clear of pause
    const roadmap = model.areas.find((a) => a.area === "product-tempo");
    assert.ok(roadmap);
    assert.equal(roadmap.state, "clear");

    // Areas on hold should exist in SCARCITY
    assert.ok(model.heldCount > 0);
    assert.ok(model.closestToUnlock !== null);
  });

  it("renders the corridor tracks, deadbands, and unlocking distances", () => {
    const model = buildDecisionCorridorModel(rules, scores);
    const html = renderToStaticMarkup(<AreaCorridorLadder model={model} />);

    assert.match(html, /data-area-corridor-ladder/);
    assert.match(html, /Decision corridor &amp; unlocking order/);
    assert.match(html, /Safety buffer: \d+ pts gap/);
    assert.match(html, /On hold · \d+ pts to unlock/);
    assert.match(html, /Hiring/);
    assert.match(html, /Roadmap/);
    assert.match(html, /Fundraising/);
    assert.match(html, /Spending/);
    assert.match(html, /New bets/);
  });
});
