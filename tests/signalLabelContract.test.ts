import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { deltaLabelBySignal } from "../lib/report/briefFormatting";
import { regimeSignalLabelByKey } from "../lib/report/reportFormatting";
import { regimeSignalLabel, signalPlainEnglish } from "../lib/report/signalTranslations";
import { TERM_DEFINITIONS } from "../lib/report/reportCopy";

/**
 * One signal, one reader-facing name.
 *
 * Four modules carried their own copy of this map and three of them carried a
 * comment asking the next reader not to add a fourth. When `baseRate` had to be
 * renamed, the rename needed six edits and the comments could not make them —
 * the What-changed row said "Fed interest rate" and the Key-drivers row beside
 * it said "Financing conditions", for the same number, on the same screen.
 */
describe("signal label contract", () => {
  it("derives every signal-name map from one table", () => {
    assert.deepEqual(regimeSignalLabelByKey, regimeSignalLabel);
    assert.deepEqual(deltaLabelBySignal, regimeSignalLabel);

    /* The four keys named, rather than `Object.keys(...)` cast back to them.
       The cast was the reason this loop type-checked; naming them also makes a
       key added to one table and not the other fail here. */
    const keys = ["tightness", "riskAppetite", "baseRate", "curveSlope"] as const;
    assert.deepEqual(Object.keys(regimeSignalLabel).sort(), [...keys].sort());
    for (const key of keys) {
      assert.equal(regimeSignalLabel[key], signalPlainEnglish[key].plainLabel);
    }
  });

  it("names the short rate the same way wherever it is printed", () => {
    /* The driver card this used to render left the homepage on 2026-09-22 — the
       changed-signals table took its place and reads its labels from the same
       `regimeSignalLabel` map. What the case is for is unchanged: the name a
       reader meets beside the number is the name the term definitions give it. */
    const definition = TERM_DEFINITIONS.find((entry) => entry.value === "base-rate");
    assert.ok(definition, "no base-rate definition");
    assert.equal(definition.term, regimeSignalLabel.baseRate);
  });

  it("does not attribute the short rate to the Fed", () => {
    /* `getBaseRate`'s `FED` rung has never fired — every published reading is
       the 1-month bill — so a name that says the Fed set it is a claim the data
       does not support. `BASE_RATE_SOURCE_LABELS` fixed this inside the engine;
       this keeps it fixed on the surfaces. */
    const copy = [
      regimeSignalLabel.baseRate,
      signalPlainEnglish.baseRate.whatItMeasures,
      TERM_DEFINITIONS.find((entry) => entry.value === "base-rate")?.summary ?? "",
    ].join(" ");

    assert.doesNotMatch(copy, /Fed interest rate|Federal Reserve/);
  });
});
