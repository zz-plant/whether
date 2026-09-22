import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { DecisionHero } from "../app/components/DecisionHero";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { describeWeeklyMovement } from "../lib/report/home/homeSectionModel";
import { CadenceCallCard } from "../app/components/CadenceCallCard";
import { buildCadenceCallModel } from "../lib/report/cadenceCallModel";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { NO_LIVE_READING_CALL, POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { buildWeeklyCallContract } from "../lib/report/weeklyCallContract";
import { evaluateRegime, type RegimeKey } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * The page is least legible exactly when the model is least sure.
 *
 * Every edge state used to be described in the engine's own words: "Hold
 * bounded operating discipline." when no live reading produced a call, "Pause
 * irreversible approvals while the policy override remains active." when the
 * two scores disagreed, "a clipped score cannot show a weekly move" when
 * funding pressure sat at the top of its scale. None of those names the thing
 * that is missing or the one thing to hold, which is the only content a
 * degraded sentence has.
 *
 * Same shape as tests/noComparisonHonesty.test.ts: build or render each state
 * the suite can reach offline, and hold the sentence to a rule rather than to
 * its exact wording. It has to say what is absent (no live reading, a score
 * that can't move, a call that is not changing, inputs that are missing) and it
 * may not fall back on the abstractions the audit found standing in for it.
 */

const SAYS_WHAT_IS_MISSING = /no live|late|not changing|can't|missing/i;
const ABSTRACTS_INSTEAD = /bounded|discipline|policy|threshold is available/i;

/* React renders the JSX apostrophe entity as the typographic character. */
const plain = (text: string) => text.replaceAll("’", "'").replaceAll("&#x27;", "'");

const assertDegradedSentence = (sentence: string, label: string) => {
  assert.match(plain(sentence), SAYS_WHAT_IS_MISSING, `${label} does not say what is missing: "${sentence}"`);
  assert.doesNotMatch(plain(sentence), ABSTRACTS_INSTEAD, `${label} abstracts instead of naming it: "${sentence}"`);
};

const treasury: TreasuryData = {
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: { oneMonth: 5.2, threeMonth: 5.2, twoYear: 4.8, tenYear: 4.2 },
};

const rawAssessment = evaluateRegime(treasury);

/* The refusal is set explicitly either way, so neither case depends on what
   this fixture's inverted curve happens to make the policy engine decide. */
const withRefusal = (refused: boolean, reasons: string[]) => ({
  ...rawAssessment,
  policyAssessment: {
    ...rawAssessment.policyAssessment,
    refusal: { ...rawAssessment.policyAssessment.refusal, refused, reasons },
  },
});

/** A live week whose two scores agree. */
const liveAssessment = withRefusal(false, []);

/** The engine's refusal: the policy scores disagree, so no direction is supported. */
const refusedAssessment = withRefusal(true, ["Too many inputs are missing."]);

const homeBriefModelFor = (assessment: typeof liveAssessment) =>
  buildHomeBriefModel({
    assessment,
    treasury,
    sensors: [],
    macroSeries: [],
    reportDynamics: { directionLabel: "unavailable", changedSignals: [] },
    startItems: [],
    stopItems: [],
    regimeAlert: null,
  });

const regimeHistory: Array<{ record_date: string; regime: RegimeKey }> = [
  { record_date: "2026-06-30", regime: "DEFENSIVE" },
  { record_date: "2026-07-31", regime: "DEFENSIVE" },
  { record_date: "2026-08-31", regime: liveAssessment.regime },
];

describe("a degraded state says what is missing", () => {
  it("names the absent reading when no live call was produced", () => {
    // The weekly contract, the home brief builder and the hero all read this
    // one table, so the fallback cannot drift between the page and the pasted
    // artifact the way "Hold bounded operating discipline" did.
    for (const [slot, sentence] of Object.entries(NO_LIVE_READING_CALL)) {
      assertDegradedSentence(sentence, `NO_LIVE_READING_CALL.${slot}`);
    }
    assert.equal(NO_LIVE_READING_CALL.currentCall, "No live reading this week. Keep last week's plan.");
  });

  it("renders the absent-reading call as the h1 when the hero is handed no call", () => {
    const html = renderToStaticMarkup(
      createElement(DecisionHero, { regime: "DEFENSIVE" }),
    );

    const h1 = html.match(/<h1[^>]*id="weekly-call-title"[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
    assertDegradedSentence(h1, "hero h1 without a call");
    assert.doesNotMatch(plain(html), /\bposture\b/i, "the fallback h1 no longer reads '<weather> posture'");
  });

  it("holds the call in the reader's terms when the two scores disagree", () => {
    for (const [slot, sentence] of Object.entries(POLICY_OVERRIDE_CALL)) {
      assertDegradedSentence(sentence, `POLICY_OVERRIDE_CALL.${slot}`);
    }

    const contract = buildWeeklyCallContract({
      assessment: refusedAssessment,
      homeBriefModel: homeBriefModelFor(refusedAssessment),
    });

    assert.equal(contract.policyOverrideActive, true);
    assert.equal(contract.currentCall, POLICY_OVERRIDE_CALL.currentCall);
    for (const [slot, sentence] of [
      ["currentCall", contract.currentCall],
      ["actionNow", contract.actionNow],
      ["pauseIf", contract.pauseIf],
      ["changeCourseIf", contract.changeCourseIf],
      ["whyCouldBeWrong", contract.whyCouldBeWrong],
      ...contract.flipConditionLabels.map((line, index) => [`flipConditionLabels[${index}]`, line] as const),
      ...contract.doNowBullets.map((line, index) => [`doNowBullets[${index}]`, line] as const),
    ] as const) {
      /* Bullets the engine's governance parameters add ("Route approvals
         through slower structured review") are held to the ban only: they
         name an instruction, not the missing thing, and the lead bullet does. */
      assert.doesNotMatch(plain(sentence), ABSTRACTS_INSTEAD, `${slot}: "${sentence}"`);
    }
    assertDegradedSentence(contract.whyCouldBeWrong, "whyCouldBeWrong");
    assertDegradedSentence(contract.flipConditionLabels[0] ?? "", "the first held-call condition");
  });

  it("carries the held call, not the regime's guidance, on the monthly and quarterly cards", () => {
    for (const horizon of ["monthly", "quarterly"] as const) {
      const model = buildCadenceCallModel({
        horizon,
        assessment: refusedAssessment,
        recordDate: "2026-08-31",
        recordDateLabel: "Aug 31, 2026",
        regimeHistory,
      });

      assertDegradedSentence(model.headline, `${horizon} headline`);
      assertDegradedSentence(model.boundedRule.threshold, `${horizon} pause line`);
      assertDegradedSentence(model.boundedRule.reversal, `${horizon} resume line`);
      assert.equal(model.overrideReason, "Too many inputs are missing.");

      const html = plain(renderToStaticMarkup(createElement(CadenceCallCard, { model })));
      assert.match(html, /Call held:/);
      assert.doesNotMatch(html, /Posture change held|policy/i);
    }
  });

  it("explains a score at the top of its scale as a score that can't move", () => {
    // The signals left the hero for their own section on 2026-09-22; the
    // sentence and the rule it answers to are unchanged.
    const html = plain(
      renderToStaticMarkup(
        createElement(WhatChangedSection, {
          rows: [
            {
              key: "tightness",
              label: "Funding pressure",
              value: 100,
              valueLabel: "100",
              previous: null,
              previousLabel: null,
              delta: 0,
              increaseIsPositive: false,
              lines: [{ kind: "callChange", value: 70 }],
              saturatedPressure: 148,
            },
          ],
          lead: "The scores moved toward tighter money this week.",
          comparisonUnavailable: false,
        }),
      ),
    );

    const sentence = html.match(/Off the top of the scale\.[^<]*/)?.[0] ?? "";
    assertDegradedSentence(sentence, "saturated score line");
    assert.doesNotMatch(html, /\bclipped\b|\bceiling\b|100-point/i, "the scoring code's words stay in the code");
  });

  it("does not call a week steady when no previous week was compared", () => {
    // A degraded read hands the page zero deltas. The sentence over the table
    // reads them, so without this flag it reported "Neither score moved much
    // this week" for a comparison that never happened — the manufactured-stable
    // claim tests/noComparisonHonesty.test.ts keeps off every other surface.
    const degraded = describeWeeklyMovement({ tightnessDelta: 0, riskAppetiteDelta: 0, comparisonUnavailable: true });
    assert.match(degraded, /No previous week to compare/);
    assert.doesNotMatch(degraded, /moved much|steady/i);

    const live = describeWeeklyMovement({ tightnessDelta: 0, riskAppetiteDelta: 0, comparisonUnavailable: false });
    assert.match(live, /Neither score moved much this week\./);
  });

  it("still says nothing is missing when nothing is", () => {
    // The other half of the rule: a live, agreeing week carries none of the
    // degraded vocabulary, so the words above mean something when they appear.
    const contract = buildWeeklyCallContract({
      assessment: liveAssessment,
      homeBriefModel: homeBriefModelFor(liveAssessment),
    });

    assert.equal(contract.policyOverrideActive, false);
    assert.doesNotMatch(plain(contract.currentCall), /no live reading|not changing/i);
    assert.doesNotMatch(plain(contract.pauseIf), /no pause line/i);
  });
});
