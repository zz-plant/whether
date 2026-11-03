import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { FLASH_BASE_RATE_MOVE, FLASH_CURVE_MOVE } from "../lib/alert/flashMoves";
import { REGIME_CONFIDENCE_NEAR_THRESHOLD } from "../lib/regimeEngineCore";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { describeInputMovement } from "../lib/report/inputMovement";
import { describeRateMoveInFedSteps } from "../lib/report/marketMoveScale";
import type { RegimeSignalKey } from "../lib/report/reportFormatting";
import { describeSignalMoveMeaning } from "../lib/report/signalMoveMeaning";

/*
 * The homepage's "What changed" rows open on what a move means in everyday words
 * (2026-11-03). These hold the words to the direction each number counts as
 * better, and the size words to the cuts the brief already uses elsewhere, so a
 * row cannot call a move "slight" that another surface calls notable.
 */
const basis = comparisonBasis({ label: "Aug 31" });
const text = (key: RegimeSignalKey, delta: number | null, value: number | null = 50, saturated = false) =>
  describeSignalMoveMeaning({ key, value, delta, saturated, basis }).text;

describe("what a score's move means", () => {
  it("says funding pressure as how hard money is to raise, and risk appetite as how cautious investors are", () => {
    assert.equal(text("tightness", 8), "Money got harder to raise.");
    assert.equal(text("tightness", -8), "Money got easier to raise.");
    assert.equal(text("riskAppetite", -7), "Investors got more cautious.");
    assert.equal(text("riskAppetite", 7), "Investors got bolder.");
  });

  it("calls a move under the lead's steady cut no real change, and a move from it on a slight one", () => {
    for (const points of [1, 2, 2.9]) {
      assert.equal(describeInputMovement(points, 0), "steady inputs", "the lead's own cut");
      assert.equal(text("tightness", points), "No real change.");
      assert.equal(text("riskAppetite", -points), "No real change.");
    }
    assert.notEqual(describeInputMovement(3, 0), "steady inputs");
    assert.equal(text("tightness", 3), "Money got slightly harder to raise.");
  });

  it("keeps slight to the distance the brief calls close to a line, and much to a move of 12 or more", () => {
    assert.equal(REGIME_CONFIDENCE_NEAR_THRESHOLD, 5);
    assert.equal(text("riskAppetite", -5), "Investors got slightly more cautious.");
    assert.equal(text("riskAppetite", -6), "Investors got more cautious.");
    assert.equal(text("tightness", 11), "Money got harder to raise.");
    assert.equal(text("tightness", 12), "Money got much harder to raise.");
    assert.equal(text("tightness", 27), "Money got much harder to raise.");
  });

  it("says an unmoved score did not change, with no direction to colour", () => {
    assert.deepEqual(describeSignalMoveMeaning({ key: "riskAppetite", value: 53, delta: 0, basis }), {
      text: "No change.",
      direction: "flat",
    });
    assert.equal(describeSignalMoveMeaning({ key: "riskAppetite", value: 51, delta: -2, basis }).direction, "flat");
    assert.equal(describeSignalMoveMeaning({ key: "riskAppetite", value: 46, delta: -7, basis }).direction, "down");
  });

  it("does not call funding pressure at the top of its scale unchanged", () => {
    const capped = describeSignalMoveMeaning({ key: "tightness", value: 90, delta: 0, saturated: true, basis });
    assert.equal(capped.text, "Money is as hard to raise as this score can show.");
    assert.equal(capped.capped, true);
    assert.equal(text("tightness", -10, 80, true), "Money got easier to raise.", "a move it can show is said as one");
  });
});

describe("what a market input's move means", () => {
  it("says the short-term rate as what borrowing costs", () => {
    assert.equal(text("baseRate", -0.04, 3.68), "Borrowing got slightly cheaper.");
    assert.equal(text("baseRate", 0.1, 4.2), "Borrowing got slightly more expensive.");
  });

  it("calls three basis points or fewer no real change, the tolerance a Fed-move count rounds within", () => {
    /* The Fed-move count rounds within three basis points: 0.27 is "about one", 0.29 is not. */
    assert.equal(describeRateMoveInFedSteps(0.27, "Cloudy"), "About one quarter-point Fed hike turns conditions Cloudy.");
    assert.equal(describeRateMoveInFedSteps(0.29, "Cloudy"), "More than one quarter-point Fed hike turns conditions Cloudy.");

    assert.equal(text("baseRate", 0.03, 4.1), "No real change.");
    assert.equal(text("baseRate", -0.04, 4.1), "Borrowing got slightly cheaper.");
    assert.equal(text("baseRate", 4.05 - 4.11, 4.05), "Borrowing got slightly cheaper.", "6 basis points, not float noise");
  });

  it("sizes a move against the one the alert calls unusual, and twice it", () => {
    assert.equal(text("baseRate", -(FLASH_BASE_RATE_MOVE - 0.01), 3.9), "Borrowing got slightly cheaper.");
    assert.equal(text("baseRate", -FLASH_BASE_RATE_MOVE, 3.9), "Borrowing got cheaper.");
    assert.equal(text("baseRate", -FLASH_BASE_RATE_MOVE * 2, 3.9), "Borrowing got much cheaper.");
    assert.equal(text("curveSlope", -(FLASH_CURVE_MOVE - 0.01), 0.29), "Moved slightly closer to a recession warning.");
    assert.equal(text("curveSlope", FLASH_CURVE_MOVE, 0.6), "Moved further from a recession warning.");
    assert.equal(text("curveSlope", -FLASH_CURVE_MOVE * 2, 0.1), "Moved much closer to a recession warning.");
  });

  it("says the gauge's warning by which side of zero each reading sits", () => {
    assert.equal(text("curveSlope", -0.18, 0.29), "Moved slightly closer to a recession warning.");
    assert.equal(text("curveSlope", -0.1, -0.05), "The recession warning switched on.");
    assert.equal(text("curveSlope", 0.1, 0.05), "The recession warning switched off.");
    assert.equal(text("curveSlope", -0.1, -0.3), "The recession warning got slightly stronger.");
    assert.equal(text("curveSlope", 0.25, -0.1), "The recession warning got weaker.");
    assert.equal(text("curveSlope", 0.02, 0.5), "No real change.");
    assert.equal(text("curveSlope", -0.02, -0.01), "The recession warning switched on.", "crossing zero is said at any size");
  });
});

describe("a number with nothing to compare", () => {
  it("says the earlier reading did not record it, by that reading's name", () => {
    assert.equal(text("baseRate", null, 4.05), "Not recorded on Aug 31, so nothing to compare.");
    assert.equal(
      describeSignalMoveMeaning({ key: "curveSlope", value: 0.3, delta: null, basis: comparisonBasis() }).text,
      "Not recorded last week, so nothing to compare.",
    );
  });

  it("says a number missing this week is missing", () => {
    assert.equal(text("curveSlope", null, null), "Not available this week.");
  });
});

describe("the sentences claim no cause", () => {
  it("never says why a number moved", () => {
    const keys: RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];
    const deltas = [-30, -12, -6, -3, -1, -0.5, -0.25, -0.1, -0.04, 0, 0.04, 0.1, 0.25, 0.5, 1, 3, 6, 12, 30];
    const sentences = new Set(
      keys.flatMap((key) => deltas.flatMap((delta) => [text(key, delta, 0.1), text(key, delta, -0.1), text(key, delta, 60)])),
    );
    for (const sentence of sentences) {
      assert.doesNotMatch(sentence, /\b(because|due to|after|driven|the Fed|signal|line)\b/i, sentence);
    }
  });
});
