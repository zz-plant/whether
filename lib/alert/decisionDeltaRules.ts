import type { RegimeAssessment } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import {
  buildCanonicalBoundedDecisionRules,
  decisionAreaLabel,
  isRuleConditionMet,
  type RuleCondition,
  type RuleConditionMetric,
} from "../report/boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { buildFlipThreshold } from "../report/reportEvidence";

type DecisionArea = "posture" | "hiring" | "spend" | "risk";
type ConfidenceLevel = RegimeAssessment["diagnostics"]["confidence"];

type DecisionDeltaRule = {
  code: string;
  decisionArea: DecisionArea;
  action: string;
  /** The score that crossed the line. Absent on a change of conditions, which is not one line. */
  metric?: RuleConditionMetric;
  thresholdLabel: string;
  thresholdValue: number;
  reversal: string;
  metricValue: number;
  crossed: boolean;
  direction: "up" | "down";
  severe: boolean;
};

const confidenceRank: Record<ConfidenceLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const MIN_ALERT_CONFIDENCE: ConfidenceLevel = "MEDIUM";

const isConfidenceBelowMinimum = (confidence: ConfidenceLevel) =>
  confidenceRank[confidence] < confidenceRank[MIN_ALERT_CONFIDENCE];

/*
 * Which published area each score's crossings speak for. Funding pressure files
 * under Spending and risk appetite under Hiring, as the verdict headlines always
 * have; the lines and the sentences are now those areas' own.
 */
const SCORE_AREAS: ReadonlyArray<{
  metric: RuleConditionMetric;
  /** The published area, by the key its rules carry. */
  area: Parameters<typeof decisionAreaLabel>[0];
  decisionArea: DecisionArea;
  codePrefix: string;
}> = [
  { metric: "tightness", area: "burn-discipline", decisionArea: "spend", codePrefix: "tightness" },
  { metric: "riskAppetite", area: "hiring", decisionArea: "hiring", codePrefix: "risk-appetite" },
];

const becameMet = (condition: RuleCondition, previous: number, current: number) =>
  !isRuleConditionMet(condition, previous) && isRuleConditionMet(condition, current);

const shiftOf = (condition: RuleCondition): "up" | "down" =>
  condition.operator === ">" || condition.operator === ">=" ? "up" : "down";

/**
 * What a move between two readings did to the published decisions.
 *
 * The area rules fired on the change lines (70 and 50) and wrote those lines
 * into their sentences: "Re-open spend only if funding pressure falls back to
 * 70", while the published Spending rule resumes below 66, and "Pause net-new
 * hiring" the week risk appetite crossed 50, while the published Hiring rule
 * pauses below 44. They fire on the area's own pause and resume lines now and
 * say the area's own published sentences, so /api/regime-alerts and the weekly
 * digest state the lines every page prints. The codes keep their meaning
 * (`tightness-upshift` is funding pressure crossing up into a pause).
 *
 * The regime change said "Go back only if the previous conditions hold across
 * two readings in a row", and the next change is rarely a way back: on Oct 5
 * risk appetite clearing 50 alone moved Freezing to Cloudy. It names where
 * conditions change with the brief's own sentence instead.
 */
export const buildDecisionDeltaRules = (
  previous: RegimeAssessment,
  current: RegimeAssessment,
): DecisionDeltaRule[] => {
  const rules: DecisionDeltaRule[] = [];
  const areaRules = buildCanonicalBoundedDecisionRules({
    regime: current.regime,
    thresholds: current.thresholds,
    scores: current.scores,
  });

  for (const { metric, area, decisionArea, codePrefix } of SCORE_AREAS) {
    const rule = areaRules.find((candidate) => candidate.area === area);
    if (!rule) continue;
    const previousScore = previous.scores[metric];
    const currentScore = current.scores[metric];
    const sides = [
      {
        kind: "pause",
        line: rule.pause.conditions.find((condition) => condition.metric === metric),
        action: rule.pauseTrigger,
        reversal: rule.resumeTrigger,
      },
      {
        kind: "resume",
        line: rule.resume.conditions.find((condition) => condition.metric === metric),
        action: rule.resumeTrigger,
        reversal: rule.pauseTrigger,
      },
    ];
    for (const { kind, line, action, reversal } of sides) {
      if (!line || !becameMet(line, previousScore, currentScore)) continue;
      const direction = shiftOf(line);
      rules.push({
        code: `${codePrefix}-${direction === "up" ? "upshift" : "downshift"}`,
        decisionArea,
        action,
        metric,
        thresholdLabel: `${decisionAreaLabel(area)} ${kind} line`,
        thresholdValue: line.value,
        reversal,
        metricValue: currentScore,
        crossed: true,
        direction,
        severe: Math.abs(currentScore - line.value) >= 10,
      });
    }
  }

  if (previous.regime !== current.regime) {
    rules.push({
      code: "regime-change",
      decisionArea: "posture",
      action: `Conditions changed from ${getRegimePublicLabel(previous.regime)} to ${getRegimePublicLabel(current.regime)}; reread last week's plan.`,
      /* Not one line, so no number: 0 here is a placeholder, and the alert's
         reason printed it as "Trigger 0.00 vs The line where conditions change
         0.00". `reversal` names both lines with their numbers. */
      thresholdLabel: "The change line",
      thresholdValue: 0,
      reversal: `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${buildFlipThreshold(current)}`,
      metricValue: 0,
      crossed: true,
      direction: "up",
      severe: true,
    });
  }

  return rules;
};

export const applyConfidenceGate = (
  deltas: DecisionDeltaRule[],
  confidence: ConfidenceLevel,
) => {
  const belowMin = isConfidenceBelowMinimum(confidence);
  if (!belowMin) {
    return deltas.map((delta) => ({ ...delta, gate: "pass" as const }));
  }

  return deltas
    .map((delta) => ({
      ...delta,
      gate: delta.severe ? ("downgrade" as const) : ("suppressed" as const),
    }))
    .filter((delta) => delta.gate !== "suppressed");
};

const AREA_LABEL: Record<DecisionArea, string> = {
  posture: "the guidance",
  hiring: "hiring",
  spend: "spending",
  risk: "risk appetite",
};

/**
 * Decision-alert headline. The analysis's good surface names the decision the
 * alert affects ("RECONSIDER Q4 HIRING"), not the raw signal move ("10Y yield
 * crossed 4.2%"). This maps a decision-delta rule to that verdict headline.
 */
export const buildDecisionVerdictHeadline = (
  delta: Pick<DecisionDeltaRule, "decisionArea" | "severe">,
): string => {
  const area = AREA_LABEL[delta.decisionArea] ?? AREA_LABEL.posture;
  return delta.severe
    ? `RECONSIDER ${area.toUpperCase()}`
    : `WATCH ${area.toUpperCase()}`;
};
