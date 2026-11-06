import { buildPostureState } from "../../lib/report/postureStateSource";
import { buildReportDataFixture } from "./reportFixtures";

/*
 * Over a whole report: the guidance is the week's call, which reads the full reading
 * (`resolveWeekGuidance`), so a hand-built partial one cannot produce it. Typed loosely on
 * purpose, since the contracts are pinned against a reading whose scores and diagnostics are
 * only the fields they print.
 */
export const buildCliReportDataFixture = (): any => {
  const fixture = buildReportDataFixture();
  return {
    ...fixture,
    treasury: {
      ...fixture.treasury,
      fetched_at: "2026-03-12T12:00:00.000Z",
      fed_funds: 5.25,
      yield_curve_spread: -0.4,
    },
    assessment: {
      ...fixture.assessment,
      regime: "EXPANSION",
      scores: { tightness: 62, riskAppetite: 45, baseRate: 5.25, curveSlope: -0.4 },
      diagnostics: { confidence: "HIGH", nearestThresholdDelta: 9 },
      policyAssessment: { refusal: { refused: false, reasons: [] } },
    },
    reportDynamics: {
      ...fixture.reportDynamics,
      directionLabel: "deteriorating",
      changedSignals: [
        { key: "tightness", delta: -6 },
        { key: "baseRate", delta: 0.25 },
        { key: "curveSlope", delta: -0.15 },
      ],
    },
    playbook: { insight: "Proceed selectively while protecting downside." },
    actionNowShort: "Stage decisions. Avoid irreversible spend.",
    startItems: ["Selective hiring for revenue-linked roles"],
    stopItems: ["Broad headcount expansion"],
  };
};

/** The posture the report produces, with the labels and lines these contracts print. */
export const buildCliPostureStateFixture = async (reportData: any, whatFlipsNext: { flipTrigger?: string } = {}): Promise<any> => {
  const realPosture = await buildPostureState({
    record: reportData.treasury,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });
  return {
    ...realPosture,
    currentState: {
      ...realPosture.currentState,
      postureLabel: "Guarded Expansion",
      confidenceLabel: "HIGH",
      confidencePercent: 92,
      transitionWatch: "ON",
    },
    whatFlipsNext: {
      ...realPosture.whatFlipsNext,
      ...whatFlipsNext,
      thresholds: ["tightness < 60 for 2 consecutive refreshes"],
    },
  };
};
