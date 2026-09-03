import {
  formatActionStripReversalText,
  formatActionStripThresholdText,
  formatBoundedDecisionAction,
  type BoundedDecisionRule,
  type DecisionArea,
} from "./boundedDecisionRules";
import { businessAreaLabel, businessAreaOrder, type BusinessAreaKey } from "./decisionKnobs";
import { joinSentences } from "./reportFormatting";

/**
 * `avoidNow` renders under an "Avoid now" heading, so its entries stay bare
 * clauses rather than sentences. Semicolons keep two clauses from running
 * together into one unreadable line.
 */
const joinClauses = (...parts: Array<string | undefined | null | false>) => {
  const clauses = parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim().replace(/\.$/, ""));

  return clauses.length > 0 ? `${clauses.join("; ")}.` : "";
};
import { operatingLeverToDecisionArea } from "./businessAreaMap";
import type { DecisionTransmissionBoundedRule } from "./reportData";

/**
 * Loop stage owner: decision.
 *
 * Builds reusable bounded decision artifacts (action strip + role templates)
 * from canonical decision rules. Keep this logic detached from component-level
 * rendering concerns.
 */

export type ActionStripItem = {
  lever: BusinessAreaKey;
  label: string;
  /** Per-area action imperative. Distinct from the top-level actionNowShort which is the overall weekly call. */
  areaActionNow: string;
  triggerThreshold: string;
  reversalCondition: string;
  currentStateLabel?: "Closed" | "Guarded" | "Staged" | "Open";
  currentStateStep?: 0 | 1 | 2 | 3;
  corridorProgressPercent?: number;
  tightenDistanceLabel?: string;
  reopenDistanceLabel?: string;
  priorityDistancePoints?: number;
  priorityOrderIndex?: number;
};

export type ThresholdBusinessConsequence = {
  pointsToThreshold: number;
  consequenceLabel: string;
  status: "approaching" | "crossed";
};

const thresholdConsequenceByLever: Record<BusinessAreaKey, string> = {
  "hiring-stance": "hiring review",
  "investment-pace": "expansion pauses",
  "sales-posture": "raise review",
  "product-priorities": "roadmap review",
  "risk-tolerance": "plan review",
};

const decisionAreaByLever: Record<BusinessAreaKey, DecisionArea> = {
  "hiring-stance": "hiring",
  "investment-pace": "expansion-bets",
  "sales-posture": "capital-raising",
  "product-priorities": "product-tempo",
  "risk-tolerance": "burn-discipline",
};

/**
 * Names the business consequence attached to the nearest bounded pause line.
 * Revisit order wins ties so the hero repeats the decision already surfaced to
 * operators instead of inferring meaning from a score or component label.
 */
export const buildThresholdBusinessConsequence = ({
  actionStripItems,
  revisitAreaPriority = [],
}: {
  actionStripItems: ActionStripItem[];
  revisitAreaPriority?: DecisionArea[];
}): ThresholdBusinessConsequence | null => {
  const candidates = actionStripItems.filter(
    (item): item is ActionStripItem & { priorityDistancePoints: number } =>
      typeof item.priorityDistancePoints === "number" && Number.isFinite(item.priorityDistancePoints),
  );
  if (candidates.length === 0) return null;

  const nearestDistance = Math.min(...candidates.map((item) => item.priorityDistancePoints));
  const nearest = candidates
    .filter((item) => item.priorityDistancePoints === nearestDistance)
    .sort((left, right) => {
      const leftRevisitIndex = revisitAreaPriority.indexOf(decisionAreaByLever[left.lever]);
      const rightRevisitIndex = revisitAreaPriority.indexOf(decisionAreaByLever[right.lever]);
      const leftPriority = leftRevisitIndex === -1 ? Number.MAX_SAFE_INTEGER : leftRevisitIndex;
      const rightPriority = rightRevisitIndex === -1 ? Number.MAX_SAFE_INTEGER : rightRevisitIndex;
      return leftPriority - rightPriority
        || (left.priorityOrderIndex ?? Number.MAX_SAFE_INTEGER) - (right.priorityOrderIndex ?? Number.MAX_SAFE_INTEGER);
    })[0];

  if (!nearest) return null;
  const pointsToThreshold = Math.max(0, Math.round(nearest.priorityDistancePoints));
  return {
    pointsToThreshold,
    consequenceLabel: thresholdConsequenceByLever[nearest.lever],
    status: pointsToThreshold === 0 ? "crossed" : "approaching",
  };
};

export type RoleAwareOperatingTemplate = {
  role: "startup-leadership" | "vc-partner";
  roleLabel: string;
  doNow: string;
  avoidNow: string;
  flipTrigger: string;
};

const findRule = (rules: BoundedDecisionRule[], area: DecisionArea) =>
  rules.find((rule) => rule.area === area);

const OPERATING_LEVER_FALLBACK = {
  areaActionNow: "Maintain current operating posture.",
  triggerThreshold: "Pause if funding pressure exceeds 60 or risk appetite falls below 40.",
  reversalCondition: "Resume expansion when funding pressure drops below 50 and risk appetite is above 50.",
} satisfies Omit<ActionStripItem, "lever" | "label">;

const MANUAL_REVIEW_THRESHOLD_PLACEHOLDER = "Unavailable — review thresholds manually.";
const MANUAL_REVIEW_REVERSAL_PLACEHOLDER = "Unavailable — review reversal conditions manually.";

const hasText = (value: string | undefined | null): value is string => typeof value === "string" && value.trim().length > 0;

const toDecisionTransmissionRule = ({
  action,
  triggerThreshold,
  reversalCondition,
}: {
  action?: string;
  triggerThreshold?: string;
  reversalCondition?: string;
}): DecisionTransmissionBoundedRule => {
  const missingThreshold = !hasText(triggerThreshold);
  const missingReversal = !hasText(reversalCondition);

  return {
    action: hasText(action) ? action.trim() : OPERATING_LEVER_FALLBACK.areaActionNow,
    triggerThreshold: missingThreshold ? MANUAL_REVIEW_THRESHOLD_PLACEHOLDER : triggerThreshold.trim(),
    reversalCondition: missingReversal ? MANUAL_REVIEW_REVERSAL_PLACEHOLDER : reversalCondition.trim(),
    manualReviewRequired: missingThreshold || missingReversal,
  };
};

export const buildDecisionTransmissionBoundedRules = ({
  rules,
  actionStripItems,
}: {
  rules?: BoundedDecisionRule[];
  actionStripItems?: ActionStripItem[];
}): DecisionTransmissionBoundedRule[] => {
  if (Array.isArray(actionStripItems) && actionStripItems.length > 0) {
    return actionStripItems.map((item) =>
      toDecisionTransmissionRule({
        action: item.areaActionNow,
        triggerThreshold: item.triggerThreshold,
        reversalCondition: item.reversalCondition,
      }),
    );
  }

  if (Array.isArray(rules) && rules.length > 0) {
    return rules.map((rule) =>
      toDecisionTransmissionRule({
        action: formatBoundedDecisionAction(rule),
        triggerThreshold: formatActionStripThresholdText(rule),
        reversalCondition: formatActionStripReversalText(rule),
      }),
    );
  }

  return [
    toDecisionTransmissionRule({
      action: OPERATING_LEVER_FALLBACK.areaActionNow,
      triggerThreshold: undefined,
      reversalCondition: undefined,
    }),
  ];
};

type CurrentScores = {
  tightness: number;
  riskAppetite: number;
};

export type RuleThresholdCondition = {
  metric: keyof CurrentScores;
  operator: ">" | ">=" | "<" | "<=";
  value: number;
  label: string;
};

export type RuleThresholdDistance = RuleThresholdCondition & {
  currentValue: number;
  pointsToLine: number;
  satisfied: boolean;
};

export type DecisionLaneState = {
  currentStateLabel: "Closed" | "Guarded" | "Staged" | "Open";
  currentStateStep: 0 | 1 | 2 | 3;
  currentLane: "blocked" | "caution" | "allowed";
  corridorProgressPercent: number;
  nearestPause?: RuleThresholdDistance;
  nearestResume?: RuleThresholdDistance;
  tightenDistanceLabel: string;
  reopenDistanceLabel: string;
};

const stateLabelByStep = ["Closed", "Guarded", "Staged", "Open"] as const;
const progressByStep = [12, 38, 70, 92] as const;

const metricLabel = (metric: keyof CurrentScores) => (metric === "riskAppetite" ? "Risk appetite" : "Funding pressure");

export const parseRuleThresholdConditions = (text: string): RuleThresholdCondition[] => {
  const matches = text.matchAll(
    /(funding pressure|risk appetite|tightness|risk appetite)\s*(is\s+)?(>=|<=|>|<|eases\s+below|tightens\s+above|falls\s+below|rises\s+above|crosses\s+below|crosses\s+above|below|above)\s*(-?\d+(?:\.\d+)?)/gi,
  );

  return Array.from(matches, (match) => ({
    metric: match[1].toLowerCase().includes("risk appetite") || match[1].toLowerCase().includes("risk") ? "riskAppetite" : "tightness",
    operator: (["falls below", "crosses below", "below"].includes(match[3].toLowerCase())
      ? "<"
      : ["rises above", "crosses above", "above"].includes(match[3].toLowerCase())
        ? ">"
        : match[3]) as RuleThresholdCondition["operator"],
    value: Number(match[4]),
    label: `${match[1]} ${match[3]} ${match[4]}`,
  }));
};

const isConditionSatisfied = (currentValue: number, operator: RuleThresholdCondition["operator"], targetValue: number) => {
  switch (operator) {
    case ">":
      return currentValue > targetValue;
    case ">=":
      return currentValue >= targetValue;
    case "<":
      return currentValue < targetValue;
    case "<=":
      return currentValue <= targetValue;
    default:
      return false;
  }
};

const toThresholdDistance = (condition: RuleThresholdCondition, scores: CurrentScores): RuleThresholdDistance => {
  const currentValue = scores[condition.metric];
  const satisfied = isConditionSatisfied(currentValue, condition.operator, condition.value);
  const rawGap = condition.operator === ">" || condition.operator === ">="
    ? condition.value - currentValue
    : currentValue - condition.value;

  return {
    ...condition,
    currentValue,
    pointsToLine: satisfied ? 0 : Math.max(0, rawGap),
    satisfied,
  };
};

/**
 * One composite signal, ready to draw as a threshold rail.
 *
 * A bounded rule is three numbers on one scale — where the signal is, where it
 * trips, and where the trip clears — and prose can only state them and leave the
 * reader to subtract. `ThresholdLadder` draws that directly, so this turns the
 * rule into rail coordinates.
 */
export type BoundedConditionRail = {
  metric: keyof CurrentScores;
  /** What the surface calls the signal, e.g. "Funding pressure". */
  label: string;
  current: number;
  /** Crossing this trips the rule; parsed from the guardrail sentence. */
  guardrail: number;
  /** Where the trip clears. Absent when the rule states no resume line. */
  clearsAt?: number;
  /**
   * Run the rail from `max` to `min`. Funding pressure trips high and risk
   * appetite trips low, so drawn honestly the two rails put trouble on opposite
   * ends and a reader has to re-orient between them. Inverting the falling one
   * puts trouble on the right for both, which is what makes the pair readable as
   * small multiples rather than as a pair of unrelated charts.
   */
  invert: boolean;
};

/**
 * Rail coordinates for the bounded conditions a surface is *already printing*.
 *
 * Both lines are parsed out of the same sentences the surface renders rather
 * than re-derived from the thresholds behind them, because the guardrail copy
 * reaching the homepage is assembled from several sources and a second
 * derivation would eventually disagree with the sentence beside it. A condition
 * that will not parse contributes no rail: a missing graphic costs a reader
 * nothing, and a graphic that contradicts the sentence under it costs the trust
 * the whole surface runs on.
 */
export const buildBoundedConditionRails = ({
  guardrail,
  clearsWhen = [],
  scores,
}: {
  guardrail?: string;
  clearsWhen?: readonly string[];
  scores?: CurrentScores;
}): BoundedConditionRail[] => {
  if (!guardrail || !scores) {
    return [];
  }

  const clearLines = new Map<keyof CurrentScores, number>();
  for (const condition of parseRuleThresholdConditions(clearsWhen.join(" · "))) {
    if (!clearLines.has(condition.metric)) {
      clearLines.set(condition.metric, condition.value);
    }
  }

  const seen = new Set<keyof CurrentScores>();
  const rails: BoundedConditionRail[] = [];

  for (const condition of parseRuleThresholdConditions(guardrail)) {
    // One rail per signal. A rule naming the same metric twice states the
    // binding line first, and a second rail for it would double-count the signal
    // in a row read as one-per-signal.
    if (seen.has(condition.metric)) continue;
    seen.add(condition.metric);

    const current = scores[condition.metric];
    if (!Number.isFinite(current) || !Number.isFinite(condition.value)) continue;

    // Which way the rule trips is what the operator encodes: ">" trips high, so
    // trouble already sits on the right and the rail runs as drawn.
    const tripsHigh = condition.operator === ">" || condition.operator === ">=";

    rails.push({
      metric: condition.metric,
      label: metricLabel(condition.metric),
      current,
      guardrail: condition.value,
      clearsAt: clearLines.get(condition.metric),
      invert: !tripsHigh,
    });
  }

  return rails;
};

const formatDistanceLabel = (distance: RuleThresholdDistance | undefined, kind: "caution" | "reopen") => {
  if (!distance) {
    return kind === "caution" ? "Caution line unavailable." : "Reopen line unavailable.";
  }

  if (distance.satisfied) {
    return kind === "caution"
      ? `${metricLabel(distance.metric)} already crossed the caution line.`
      : `${metricLabel(distance.metric)} already clears the reopen line.`;
  }

  return `${metricLabel(distance.metric)} ${distance.pointsToLine.toFixed(1)} pts to ${kind === "caution" ? "caution" : "reopen"}.`;
};

const sortThresholdDistance = (left: RuleThresholdDistance, right: RuleThresholdDistance) =>
  left.pointsToLine - right.pointsToLine;

export const resolveDecisionLaneState = ({
  rule,
  scores,
}: {
  rule?: Pick<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger">;
  scores?: CurrentScores;
}): DecisionLaneState | null => {
  if (!rule || !scores) {
    return null;
  }

  const pauseConditions = parseRuleThresholdConditions(rule.pauseTrigger).map((condition) => toThresholdDistance(condition, scores));
  const resumeConditions = parseRuleThresholdConditions(rule.resumeTrigger).map((condition) => toThresholdDistance(condition, scores));
  const nearestPause = [...pauseConditions].sort(sortThresholdDistance)[0];
  const nearestResume = [...resumeConditions].sort(sortThresholdDistance)[0];
  const pauseSatisfied = pauseConditions.some((condition) => condition.satisfied);
  const resumeSatisfiedCount = resumeConditions.filter((condition) => condition.satisfied).length;

  let currentStateStep: 0 | 1 | 2 | 3 = pauseSatisfied
    ? 0
    : resumeConditions.length === 0 || resumeSatisfiedCount === 0
      ? 1
      : resumeSatisfiedCount < resumeConditions.length
        ? 2
        : 3;

  if (!pauseSatisfied && nearestPause && nearestPause.pointsToLine <= 4 && currentStateStep > 1) {
    currentStateStep = (currentStateStep - 1) as 0 | 1 | 2 | 3;
  }

  return {
    currentStateLabel: stateLabelByStep[currentStateStep],
    currentStateStep,
    currentLane: currentStateStep === 0 ? "blocked" : currentStateStep === 1 ? "caution" : "allowed",
    corridorProgressPercent: progressByStep[currentStateStep],
    nearestPause,
    nearestResume,
    tightenDistanceLabel: formatDistanceLabel(nearestPause, "caution"),
    reopenDistanceLabel: formatDistanceLabel(nearestResume, "reopen"),
  };
};

export const buildActionStripItems = (rules: BoundedDecisionRule[], scores?: CurrentScores): ActionStripItem[] =>
  businessAreaOrder.map((lever, index) => {
    const area = operatingLeverToDecisionArea[lever];
    const rule = findRule(rules, area);
    const laneState = resolveDecisionLaneState({ rule, scores });

    return {
      lever,
      label: businessAreaLabel[lever],
      areaActionNow: rule ? formatBoundedDecisionAction(rule) : OPERATING_LEVER_FALLBACK.areaActionNow,
      triggerThreshold: rule ? formatActionStripThresholdText(rule) : OPERATING_LEVER_FALLBACK.triggerThreshold,
      reversalCondition: rule ? formatActionStripReversalText(rule) : OPERATING_LEVER_FALLBACK.reversalCondition,
      currentStateLabel: laneState?.currentStateLabel,
      currentStateStep: laneState?.currentStateStep,
      corridorProgressPercent: laneState?.corridorProgressPercent,
      tightenDistanceLabel: laneState?.tightenDistanceLabel,
      reopenDistanceLabel: laneState?.reopenDistanceLabel,
      priorityDistancePoints: laneState?.nearestPause?.pointsToLine ?? laneState?.nearestResume?.pointsToLine,
      priorityOrderIndex: index,
    };
  });

export const buildRoleAwareOperatingTemplates = (rules: BoundedDecisionRule[]): RoleAwareOperatingTemplate[] => {
  const hiringRule = findRule(rules, "hiring");
  const productRule = findRule(rules, "product-tempo");
  const capitalRule = findRule(rules, "capital-raising");
  const burnRule = findRule(rules, "burn-discipline");
  const expansionRule = findRule(rules, "expansion-bets");

  return [
    {
      role: "startup-leadership",
      roleLabel: "Startup leadership",
      doNow: joinSentences(
        hiringRule?.recommendation,
        productRule?.recommendation,
        burnRule?.recommendation,
      ),
      avoidNow: joinClauses(
        hiringRule && formatActionStripThresholdText(hiringRule),
        productRule && formatActionStripThresholdText(productRule),
      ),
      flipTrigger: expansionRule
        ? formatActionStripReversalText(expansionRule)
        : hiringRule
          ? formatActionStripReversalText(hiringRule)
          : "",
    },
    {
      role: "vc-partner",
      roleLabel: "VC partner",
      doNow: joinSentences(capitalRule?.recommendation, burnRule?.recommendation),
      avoidNow: joinClauses(
        capitalRule && formatActionStripThresholdText(capitalRule),
        expansionRule && formatActionStripThresholdText(expansionRule),
      ),
      flipTrigger: capitalRule
        ? formatActionStripReversalText(capitalRule)
        : expansionRule
          ? formatActionStripReversalText(expansionRule)
          : "",
    },
  ];
};
