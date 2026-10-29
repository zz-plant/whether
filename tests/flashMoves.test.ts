import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  FLASH_BASE_RATE_MOVE,
  FLASH_CURVE_MOVE,
  FLASH_EXPEDITE_LINE,
  evaluateFlashMoves,
  flashInputsFrom,
  type FlashInputs,
} from "../lib/alert/flashMoves";
import { alertDeliveryKey, evaluateAlert, type AlertConditions } from "../lib/alert/alertEvaluator";
import { flashMoveEmail } from "../lib/alert/alertTemplates";

const read = (over: Partial<FlashInputs> = {}): FlashInputs => ({
  recordDate: "2026-09-16",
  baseRate: 4.3,
  curveSlope: 0.4,
  ...over,
});

describe("flash moves", () => {
  it("fires on a policy-sized move of the short rate between consecutive reads", () => {
    const previous = read({ recordDate: "2026-09-15", baseRate: 4.55 });
    const [move, ...rest] = evaluateFlashMoves(read(), previous);
    assert.equal(rest.length, 0);
    assert.equal(move?.metric, "baseRate");
    assert.equal(move?.delta.toFixed(2), "-0.25");
    // A move in a rate is a difference of rates: percentage points, never a percent.
    assert.match(move?.headline ?? "", /^The short-term borrowing rate fell 0\.25 percentage points between 2026-09-15 and 2026-09-16 \(4\.55% to 4\.30%\)\.$/);
  });

  it("fires on a twenty-point move of the curve, and names the direction", () => {
    const previous = read({ recordDate: "2026-09-15", curveSlope: 0.15 });
    const [move] = evaluateFlashMoves(read(), previous);
    assert.equal(move?.metric, "curveSlope");
    assert.match(move?.headline ?? "", /^The recession warning gauge \(10-year minus 2-year rate\) rose 0\.25 percentage points/);
    assert.doesNotMatch(move?.headline ?? "", /10Y|steepen|flatten/);
    const [flatter] = evaluateFlashMoves(read({ curveSlope: -0.1 }), read({ recordDate: "2026-09-15", curveSlope: 0.15 }));
    assert.match(flatter?.headline ?? "", /fell 0\.25 percentage points/);
  });

  it("holds exactly at the threshold and ignores float noise beneath it", () => {
    const previous = read({ recordDate: "2026-09-15", baseRate: 4.3 + FLASH_BASE_RATE_MOVE, curveSlope: 0.4 + FLASH_CURVE_MOVE });
    assert.equal(evaluateFlashMoves(read(), previous).length, 2);
    const shy = read({ recordDate: "2026-09-15", baseRate: 4.3 + FLASH_BASE_RATE_MOVE - 0.01, curveSlope: 0.4 + FLASH_CURVE_MOVE - 0.01 });
    assert.equal(evaluateFlashMoves(read(), shy).length, 0);
    // 4.30 - 4.05 is 0.2500000000000002 in floating point; the threshold still holds.
    assert.equal(evaluateFlashMoves(read({ baseRate: 4.3 }), read({ recordDate: "2026-09-15", baseRate: 4.05 })).length, 1);
  });

  it("judges consecutive reads only: none, the same day, or more than a week apart is silent", () => {
    assert.deepEqual(evaluateFlashMoves(read(), null), []);
    assert.deepEqual(evaluateFlashMoves(read(), read({ baseRate: 3.0 })), [], "the same record date re-ingested");
    assert.deepEqual(evaluateFlashMoves(read(), read({ recordDate: "2026-09-01", baseRate: 3.0 })), [], "fifteen days apart is a trend");
    assert.equal(evaluateFlashMoves(read(), read({ recordDate: "2026-09-09", baseRate: 3.0 })).length, 1, "seven days apart still counts");
  });

  it("skips an input that is missing on either side, and treats an imputed base rate as missing", () => {
    assert.deepEqual(evaluateFlashMoves(read({ curveSlope: null }), read({ recordDate: "2026-09-15", curveSlope: 0.0 })), []);
    const imputed = flashInputsFrom({
      recordDate: "2026-09-16",
      assessment: { scores: { baseRate: 3.5, baseRateUsed: "MISSING", curveSlope: 0.4 } },
    });
    assert.equal(imputed.baseRate, null);
    assert.equal(imputed.curveSlope, 0.4);
  });
});

describe("flash alerts in the evaluator and the mail", () => {
  const conditions = (over: Partial<AlertConditions> = {}): AlertConditions => ({
    regime: "DEFENSIVE",
    tightness: 78,
    riskAppetite: 42,
    actionNow: "Stage approvals",
    callChangesIf: "Funding pressure falls 8 pts from 78 to 70 or below.",
    recordDate: "2026-09-16",
    ...over,
  });
  const [move] = evaluateFlashMoves(read(), read({ recordDate: "2026-09-15", baseRate: 4.6 }));

  it("becomes a critical CFO alert that the weekly cooldown does not hold back", () => {
    const decisions = evaluateAlert(conditions({ flashMoves: [move!] }), {
      regime: "DEFENSIVE",
      tightness: 78,
      riskAppetite: 42,
      lastSentAt: new Date().toISOString(),
    });
    assert.deepEqual(decisions.map((d) => d.type), ["flash"]);
    assert.equal(decisions[0]?.severity, "critical");
    assert.equal(decisions[0]?.rolePreset, "CFO");
    assert.equal(decisions[0]?.flash?.metric, "baseRate");
  });

  it("is deduplicated per input, not per alert type", () => {
    const [rate] = evaluateFlashMoves(read(), read({ recordDate: "2026-09-15", baseRate: 4.6 }));
    const [curve] = evaluateFlashMoves(read(), read({ recordDate: "2026-09-15", curveSlope: 0.0 }));
    const [a, b] = evaluateAlert(conditions({ flashMoves: [rate!, curve!] }), null).filter((d) => d.type === "flash");
    assert.equal(alertDeliveryKey(a!), "flash:baseRate");
    assert.equal(alertDeliveryKey(b!), "flash:curveSlope");
    assert.equal(alertDeliveryKey({ type: "regime_change", severity: "critical", headline: "x" }), "regime_change");
  });

  it("mails the move in the input's units and says the guidance stands until the next read", () => {
    const mail = flashMoveEmail(move!, "token-1");
    assert.match(mail.subject, /^Whether Flash — the short-term borrowing rate fell 0\.30 percentage points since the last reading$/);
    assert.match(mail.text, /4\.60% to 4\.30%/);
    assert.match(mail.text, /This week's guidance stands until the next reading/);
    assert.match(mail.html, /4\.60% → 4\.30%/);
    assert.match(mail.text, /unsubscribe/i);
    assert.doesNotMatch(mail.text, /tightness|riskAppetite/);
  });

  it("frames the flash as an expedite signal in text and HTML alike", () => {
    const mail = flashMoveEmail(move!, "token-1");
    assert.ok(mail.text.includes(FLASH_EXPEDITE_LINE));
    assert.ok(mail.html.includes(FLASH_EXPEDITE_LINE));
    assert.match(FLASH_EXPEDITE_LINE, /^Expedite:/);
  });
});
