import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { deltaLabelBySignal } from "../lib/report/briefFormatting";
import { regimeSignalLabelByKey } from "../lib/report/reportFormatting";
import { regimeSignalLabel, signalPlainEnglish } from "../lib/report/signalTranslations";
import { BEGINNER_GLOSSARY_ENTRIES } from "../lib/report/reportCopy";
import { buildDriverViews } from "../lib/report/driverDecisionViews";

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

    for (const key of Object.keys(regimeSignalLabel) as Array<keyof typeof regimeSignalLabel>) {
      assert.equal(regimeSignalLabel[key], signalPlainEnglish[key].plainLabel);
    }
  });

  it("names the short rate the same way in the driver card and the glossary", () => {
    const views = buildDriverViews({
      tightness: 77,
      tightnessDelta: 14,
      riskAppetite: 42,
      tightnessRegime: 70,
      riskAppetiteRegime: 50,
      baseRate: 3.93,
      baseRateUsed: "1M",
      history: [],
      rateHistory: [],
    });

    assert.equal(views.financing.label, regimeSignalLabel.baseRate);

    const glossaryEntry = BEGINNER_GLOSSARY_ENTRIES.find((entry) => entry.value === "base-rate");
    assert.ok(glossaryEntry, "no base-rate glossary entry");
    assert.equal(glossaryEntry.term, regimeSignalLabel.baseRate);
  });

  it("does not attribute the short rate to the Fed", () => {
    /* `getBaseRate`'s `FED` rung has never fired — every published reading is
       the 1-month bill — so a name that says the Fed set it is a claim the data
       does not support. `BASE_RATE_SOURCE_LABELS` fixed this inside the engine;
       this keeps it fixed on the surfaces. */
    const copy = [
      regimeSignalLabel.baseRate,
      signalPlainEnglish.baseRate.whatItMeasures,
      BEGINNER_GLOSSARY_ENTRIES.find((entry) => entry.value === "base-rate")?.summary ?? "",
    ].join(" ");

    assert.doesNotMatch(copy, /Fed interest rate|Federal Reserve/);
  });
});
