import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDecisionCorridorModel } from "../lib/report/operatingCalls";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildHomeAreaRows } from "../lib/report/home/homeSectionModel";
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
    assert.match(html, /How far each area is from changing/);
    assert.match(html, /Safety buffer: \d+ pts gap/);
    /* The gap between the two lines is the one stretch of the scale where
       nothing happens, so it may not be drawn in the crossed red (2026-11-02).
       Amber resolves to that red; the buffer and its legend swatch use the
       neutral ink instead. */
    assert.doesNotMatch(html, /amber-400\/20/);
    assert.ok(html.includes("bg-[color:var(--app-text-muted)]/18"), "the buffer is drawn in the neutral ink");
    assert.match(html, /On hold · \d+ pts from restarting/);
    assert.match(html, /\d+ pts from pausing/);
    assert.match(html, /Hiring/);
    assert.match(html, /Roadmap/);
    assert.match(html, /Fundraising/);
    assert.match(html, /Spending/);
    assert.match(html, /New bets/);
    /* Four areas sit 24 points from their restart line on this reading, so the
       caption names the count rather than picking one of them. */
    assert.match(html, /4 areas 24 pts from restarting/);
    assert.doesNotMatch(html, /closest to restarting/);
  });

  /*
   * One rule, one line, one answer (2026-11-01). The ladder used to pick a metric
   * per area from a fixed table — risk appetite for roadmap and new bets — while
   * the card beside it showed a pause line already crossed if there was one. At
   * funding pressure 90 and risk appetite 55 the card said "New bets · On hold"
   * (its tightness line, at 90) and the ladder said "11 pts from pausing" (its
   * risk-appetite line, at 55): two statements about one area, on one screen.
   *
   * The grid is the guard: every reading, every area, the same state and the same
   * distance in both surfaces.
   */
  it("binds the same pause line the area cards do, at every reading", () => {
    const regimes = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;
    const disagreements: string[] = [];
    for (const regime of regimes) {
      for (let tightness = 0; tightness <= 100; tightness += 10) {
        for (let riskAppetite = 0; riskAppetite <= 100; riskAppetite += 10) {
          const gridScores = { tightness, riskAppetite };
          const gridRules = buildCanonicalBoundedDecisionRules({
            regime,
            thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
            scores: gridScores,
          });
          const cards = buildHomeAreaRows({ decisionRules: gridRules, movement: null, scores: gridScores });
          const ladder = buildDecisionCorridorModel(gridRules, gridScores);
          for (const area of ladder.areas) {
            const card = cards.find((candidate) => candidate.area === area.area);
            if (!card?.pause) continue;
            const held = area.state === "crossed";
            const cardPoints = card.pause.met ? 0 : card.pause.points;
            const ladderPoints = held ? 0 : area.distanceToPause;
            if (card.pause.met !== held || Math.abs(cardPoints - ladderPoints) > 1e-9) {
              disagreements.push(
                `${regime} ${tightness}/${riskAppetite} ${area.area}: card ${card.pause.met ? "On hold" : `${card.pause.points} pts`} (${card.pause.metric}), ladder ${area.state} ${area.distanceToPause} pts (${area.metric})`,
              );
            }
          }
        }
      }
    }
    assert.deepEqual(disagreements, [], `\n${disagreements.slice(0, 10).join("\n")}\n`);
  });

  /* A rule whose restart line is on the other metric has no gap to shade on this
     row's scale. It still says where the area stands. No canonical rule has that
     shape, so the fixture strips hiring's tightness restart line. */
  it("draws a row without a shaded gap when the two lines are on different metrics", () => {
    const splitScores = { tightness: 90, riskAppetite: 55 };
    const splitRules = buildCanonicalBoundedDecisionRules({
      regime: "SCARCITY",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: splitScores,
    }).map((rule) =>
      rule.area === "hiring"
        ? {
            ...rule,
            resume: { ...rule.resume, conditions: rule.resume.conditions.filter((condition) => condition.metric !== "tightness") },
          }
        : rule,
    );
    const model = buildDecisionCorridorModel(splitRules, splitScores);
    const hiring = model.areas.find((area) => area.area === "hiring");
    assert.ok(hiring);
    assert.equal(hiring.metric, "tightness");
    assert.equal(hiring.resumeLine, undefined);
    assert.equal(hiring.normalizedResume, undefined);
    assert.equal(hiring.distanceToUnlock, undefined);
    const html = renderToStaticMarkup(<AreaCorridorLadder model={model} />);
    assert.match(html, /On hold<\/span>/);
  });
});
