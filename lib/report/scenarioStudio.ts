import type { TreasuryData } from "../types";
import { getRegimePublicLabel } from "../regimePresentation";
import type { RegimeAssessment } from "../regimeEngine";
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  BASE_RATE_TIGHTNESS_THRESHOLD,
  CURVE_INVERSION_TIGHTNESS_MULTIPLIER,
  RISK_APPETITE_MAX_SLOPE,
  RISK_APPETITE_MIN_SLOPE,
  TIGHTNESS_INVERSION_POINTS,
  clamp,
} from "../regimeEngineCore";
import type { getPlaybookGuidance } from "../playbook";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { buildCanonicalBoundedDecisionRules, ruleMetricLabel, type RuleConditionMetric } from "./boundedDecisionRules";
import { buildSharedCorridorRails } from "./operatingCalls";

/**
 * The scenario studio's text and numbers, lifted out of
 * `app/operate/components/scenarioStudioSimulator.tsx` so the component holds
 * state and layout and nothing else. Everything here is pure: the presets, the
 * slider bounds the URL parser shares with the inputs, the counterfactual
 * treasury the engine is re-run on, and the brief a reader copies out.
 */

export type ScenarioPreset = {
  id: string;
  rate: number;
  slope: number;
  description: string;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "easing",
    rate: 2.0,
    slope: 1.2,
    description: "Fast rate cuts, and long-term rates well above short-term: funding loosens.",
  },
  {
    id: "stagflation",
    rate: 6.25,
    slope: -0.6,
    description: "High rates, and short-term borrowing costing more than long-term.",
  },
  {
    id: "deep-inversion",
    rate: 5.25,
    slope: -1.25,
    description: "Short-term rates far above long-term: the recession warning at its strongest.",
  },
  {
    id: "soft-landing",
    rate: 3.25,
    slope: 0.85,
    description: "Rates near neutral, with long-term rates a little above short-term.",
  },
];

/* One set of bounds for the slider and for the link that sets it: a value the
   slider cannot reach is not a scenario, so the URL parser refuses it too. */
export const SCENARIO_RATE_RANGE = { min: 0, max: 8, step: 0.05 } as const;
export const SCENARIO_SLOPE_RANGE = { min: -1.5, max: 2.5, step: 0.05 } as const;

export const parseScenarioParam = (
  raw: string | null | undefined,
  range: { min: number; max: number },
): number | null => {
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed) || parsed < range.min || parsed > range.max) return null;
  return parsed;
};

/** The query string that reproduces a scenario, or "" at this week's values. */
export const buildScenarioSearch = (
  current: URLSearchParams,
  values: { rate: number; slope: number; atLiveBaseline: boolean },
): string => {
  const next = new URLSearchParams(current);
  if (values.atLiveBaseline) {
    next.delete("rate");
    next.delete("slope");
  } else {
    next.set("rate", values.rate.toFixed(2));
    next.set("slope", values.slope.toFixed(2));
  }
  return next.toString();
};

type ScenarioLadderLines = { pause?: number; resume?: number; callChange: number };

/**
 * The three lines each score is judged against in a scenario: where the call
 * changes, and the pause and restart lines the scenario's own rules state.
 * Read off the same rule data the rules table prints (`buildSharedCorridorRails`
 * over the canonical rules), never re-derived from the thresholds by hand, so
 * the ladder cannot draw a line the scenario's rules do not state. A rule that
 * states no line for a signal leaves that line out.
 */
export const buildScenarioLadderLines = (
  assessment: RegimeAssessment,
): Record<RuleConditionMetric, ScenarioLadderLines> => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const rails = buildSharedCorridorRails(
    rules.map((rule) => ({ pauseConditions: rule.pause.conditions, resumeConditions: rule.resume.conditions })),
    assessment.scores,
  );
  const linesFor = (metric: RuleConditionMetric, callChange: number): ScenarioLadderLines => {
    const rail = rails.find((entry) => entry.metric === metric);
    return { pause: rail?.guardrail, resume: rail?.clearsAt, callChange };
  };
  return {
    tightness: linesFor("tightness", assessment.thresholds.tightnessRegime),
    riskAppetite: linesFor("riskAppetite", assessment.thresholds.riskAppetiteRegime),
  };
};

export const formatScenarioDelta = (value: number, unit = "") => {
  const rounded = Number(value.toFixed(2));
  if (rounded > 0) return `+${rounded}${unit}`;
  if (rounded < 0) return `${rounded}${unit}`;
  return `0${unit}`;
};

const snapToStep = (value: number, range: { min: number; max: number; step: number }) => {
  const stepped = Math.round(value / range.step) * range.step;
  return Number(clamp(stepped, range.min, range.max).toFixed(2));
};

/**
 * Invert a scrubbed `(tightness, riskAppetite)` coordinate pair on the scenario
 * studio's map or ladders back into the `(rate, slope)` slider values that
 * produce it, snapped to the slider steps.
 */
export const invertScoresToScenario = (
  targetTightness: number,
  targetRiskAppetite: number,
  baseRateThreshold: number = BASE_RATE_TIGHTNESS_THRESHOLD,
): { rate: number; slope: number } => {
  const rawSlope =
    RISK_APPETITE_MIN_SLOPE +
    (clamp(targetRiskAppetite, 0, 100) / 100) * (RISK_APPETITE_MAX_SLOPE - RISK_APPETITE_MIN_SLOPE);
  const slope = snapToStep(rawSlope, SCENARIO_SLOPE_RANGE);
  const inversionPoints =
    slope < 0
      ? clamp(Math.round(Math.abs(slope) * CURVE_INVERSION_TIGHTNESS_MULTIPLIER), 0, TIGHTNESS_INVERSION_POINTS)
      : 0;
  const remainingTightness = Math.max(0, clamp(targetTightness, 0, 100) - inversionPoints);
  const rawRate = baseRateThreshold + remainingTightness / BASE_RATE_TIGHTNESS_MULTIPLIER;
  const rate = snapToStep(rawRate, SCENARIO_RATE_RANGE);
  return { rate, slope };
};

// Pure deterministic counterfactual simulation
export const buildSimulatedTreasury = (
  liveTreasury: TreasuryData,
  simulatedBaseRate: number,
  simulatedCurveSlope: number,
): TreasuryData => ({
  ...liveTreasury,
  isLive: false,
  source: "Simulated Counterfactual (Scenario Studio)",
  yields: {
    ...liveTreasury.yields,
    fedFunds: simulatedBaseRate,
    oneMonth: simulatedBaseRate,
    threeMonth: simulatedBaseRate,
    twoYear: simulatedBaseRate,
    tenYear: Number((simulatedBaseRate + simulatedCurveSlope).toFixed(3)),
  },
});

type ScenarioBriefInput = {
  simulatedBaseRate: number;
  simulatedCurveSlope: number;
  baseRateDelta: number;
  curveSlopeDelta: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  liveAssessment: RegimeAssessment;
  simulatedAssessment: RegimeAssessment;
  simulatedPlaybook: ReturnType<typeof getPlaybookGuidance>;
  livePlaybook?: ReturnType<typeof getPlaybookGuidance>;
  shareUrl: string;
};

export const buildScenarioBriefText = ({
  simulatedBaseRate,
  simulatedCurveSlope,
  baseRateDelta,
  curveSlopeDelta,
  tightnessDelta,
  riskAppetiteDelta,
  liveAssessment,
  simulatedAssessment,
  simulatedPlaybook,
  livePlaybook,
  shareUrl,
}: ScenarioBriefInput): string =>
  [
    "==================================================",
    "SCENARIO — NOT THIS WEEK'S READING",
    "Numbers set by hand in the Whether scenario studio, not this week's data.",
    "==================================================",
    `Short-term borrowing rate ${simulatedBaseRate.toFixed(2)}% (${formatScenarioDelta(baseRateDelta, "%")}) | Recession warning gauge (10-year minus 2-year rate) ${simulatedCurveSlope.toFixed(2)}% (${formatScenarioDelta(curveSlopeDelta, "%")})`,
    `Conditions: ${getRegimePublicLabel(simulatedAssessment.regime)} (this week: ${getRegimePublicLabel(liveAssessment.regime)})`,
    `${ruleMetricLabel.tightness}: ${simulatedAssessment.scores.tightness}/100 (${formatScenarioDelta(tightnessDelta, " pts")})`,
    `${ruleMetricLabel.riskAppetite}: ${simulatedAssessment.scores.riskAppetite}/100 (${formatScenarioDelta(riskAppetiteDelta, " pts")})`,
    "",
    `Mandate: "${simulatedPlaybook.playbook?.mandate ?? ""}"`,
    `Tone: ${simulatedPlaybook.playbook?.tone ?? ""}`,
    "",
    "--- WHAT CHANGES ---",
    "What to STOP in this scenario:",
    ...simulatedPlaybook.stopItems.map((item) => ` • STOP: ${item}`),
    "",
    "What to START in this scenario:",
    ...simulatedPlaybook.startItems.map((item) => ` • START: ${item}`),
    "",
    "--- RULES BY AREA ---",
    ...simulatedPlaybook.operatingLevers.map((lever) => {
      const liveLever = livePlaybook?.operatingLevers.find((l) => l.lever === lever.lever);
      const isFlipped = Boolean(liveLever && liveLever.actionNow !== lever.actionNow);
      const flipTag = isFlipped ? " [ACTION FLIPPED]" : "";
      return ` • ${lever.label}${flipTag}: ${lever.actionNow} (${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${lever.triggerThreshold})${isFlipped ? ` [This week: ${liveLever?.actionNow}]` : ""}`;
    }),
    "",
    `Link to this scenario: ${shareUrl}`,
  ].join("\n");
