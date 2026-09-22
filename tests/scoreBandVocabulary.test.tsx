import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as nextNavigation from "next/navigation";
import {
  SCORE_BAND_LABELS,
  classifyScoreBand,
  scoreBandReference,
  scoreBandScaleLabel,
} from "../lib/report/signalTranslations";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";

const mockAny: any = mock;

/* Spread the real module and override only what is needed: a stub listing three
   exports installs a `next/navigation` with only those for every file in the
   run, which is the shuffled-order link failure CLAUDE.md records. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/**
 * Two vocabularies, two questions.
 *
 * The bands answer "is this number unusual" and split at 30 and 70. The
 * decision lines answer "has anything tripped" and sit wherever the rule and
 * the regime put them — for risk appetite, 44 and 50. A reading of 42 is
 * therefore mid-band *and* below both lines, and the hero rendered
 * "Risk appetite 42 moderate" immediately above a rail marking the pause line
 * crossed. Nothing was wrong; the word just answered a question the reader
 * was not asking.
 */
describe("score band vocabulary", () => {
  it("says where on the scale, not how things stand", () => {
    assert.equal(scoreBandScaleLabel("low"), "low range");
    assert.equal(scoreBandScaleLabel("mid"), "mid range");
    assert.equal(scoreBandScaleLabel("high"), "high range");
  });

  it("never renders a reassurance word beside a reading that has tripped a line", () => {
    /* 42 is the case that motivated this: mid-band, under the 50 posture line
       and under the 44 pause line. */
    assert.equal(classifyScoreBand(42), "mid");
    assert.doesNotMatch(scoreBandScaleLabel(classifyScoreBand(42)), /moderate/i);
  });

  it("renders the scale wording, not the band word, beside the readings", () => {
    // The readings left the hero for their own section on 2026-09-22.
    const html = renderToStaticMarkup(
      createElement(WhatChangedSection, {
        rows: [
          { key: "tightness", label: "Funding pressure", value: 77, valueLabel: "77", previous: 63, previousLabel: "63", delta: 14, increaseIsPositive: false, scaleLabel: scoreBandScaleLabel(classifyScoreBand(77)), lines: [{ kind: "callChange", value: 70 }] },
          { key: "riskAppetite", label: "Risk appetite", value: 42, valueLabel: "42", previous: 56, previousLabel: "56", delta: -14, increaseIsPositive: true, scaleLabel: scoreBandScaleLabel(classifyScoreBand(42)), lines: [{ kind: "callChange", value: 50 }] },
        ],
        lead: "The scores moved toward tighter money this week.",
        comparisonUnavailable: false,
      }),
    );

    assert.ok(html.includes("high range"), "funding pressure lost its scale wording");
    assert.ok(html.includes("mid range"), "risk appetite lost its scale wording");
  });

  it("keeps the bare band words for the list that is only about the bands", () => {
    /* `scoreBandReference` lists the three bands with their ranges and
       meanings. Nothing else is claimed there, so "Moderate" is the right
       word — the scale-position wording exists for the places a line is in
       view, not everywhere. */
    assert.deepEqual(scoreBandReference("riskAppetite").map((row) => row.rangeLabel), ["0-30", "31-69", "70-100"]);
    assert.equal(SCORE_BAND_LABELS.mid, "Moderate");
  });
});
