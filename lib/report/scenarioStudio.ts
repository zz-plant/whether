import type { TreasuryData } from "../types";
import { getRegimePublicLabel } from "../regimePresentation";
import type { RegimeAssessment } from "../regimeEngine";
import type { getPlaybookGuidance } from "../playbook";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { ruleMetricLabel } from "./boundedDecisionRules";

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
    description: "Fast cuts and a steep curve: funding loosens.",
  },
  {
    id: "stagflation",
    rate: 6.25,
    slope: -0.6,
    description: "High rates with an inverted curve.",
  },
  {
    id: "deep-inversion",
    rate: 5.25,
    slope: -1.25,
    description: "A deep inversion: the recession warning at its strongest.",
  },
  {
    id: "soft-landing",
    rate: 3.25,
    slope: 0.85,
    description: "Rates near neutral with a normal curve.",
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

export const formatScenarioDelta = (value: number, unit = "") => {
  const rounded = Number(value.toFixed(2));
  if (rounded > 0) return `+${rounded}${unit}`;
  if (rounded < 0) return `${rounded}${unit}`;
  return `0${unit}`;
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
    ...simulatedPlaybook.operatingLevers.map(
      (lever) => ` • ${lever.label}: ${lever.actionNow} (${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${lever.triggerThreshold})`,
    ),
    "",
    `Link to this scenario: ${shareUrl}`,
  ].join("\n");
