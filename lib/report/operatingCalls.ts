import {
  distanceToRuleCondition,
  isRuleConditionMet,
  formatActionStripReversalText,
  formatActionStripThresholdText,
  formatBoundedDecisionAction,
  ruleMetricLabel,
  type BoundedDecisionRule,
  type DecisionArea,
  type RuleCondition,
  type RuleConditionMetric,
} from "./boundedDecisionRules";
import { formatDecisionLatencyLine } from "./decisionLatency";
import { businessAreaLabel, businessAreaOrder, businessAreaOwner, type BusinessAreaKey } from "./decisionKnobs";
import { joinSentences } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";

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
  /** The role that owns this lever's line (see `businessAreaOwner`). Absent on hand-built rows. */
  ownerLabel?: string;
  /** Per-area action imperative. Distinct from the top-level actionNowShort which is the overall weekly call. */
  areaActionNow: string;
  triggerThreshold: string;
  reversalCondition: string;
  /** The pause lines as data, so a surface can draw or tabulate them instead of reprinting the sentence. */
  pauseConditions?: RuleCondition[];
  /** The resume lines as data. */
  resumeConditions?: RuleCondition[];
  /** The lever's clock: when the action is felt and what unwinding costs. Absent for fallback rows. */
  latencyLine?: string;
  /** A non-numeric pause condition stated alongside the lines, e.g. "two consecutive weaker weekly reads print". */
  pauseQualifier?: string;
  /** A non-numeric resume condition stated alongside the lines. */
  resumeQualifier?: string;
  currentStateLabel?: "Closed" | "Guarded" | "Staged" | "Open";
  currentStateStep?: 0 | 1 | 2 | 3;
  corridorProgressPercent?: number;
  tightenDistanceLabel?: string;
  reopenDistanceLabel?: string;
  /** Nearest pause line and the points to it; zero once tripped. */
  nearestPause?: RuleThresholdDistance;
  /** Nearest resume line and the points to it; zero once it holds. */
  nearestResume?: RuleThresholdDistance;
  priorityDistancePoints?: number;
  priorityOrderIndex?: number;
};

export type ThresholdBusinessConsequence = {
  pointsToThreshold: number;
  consequenceLabel: string;
  status: "approaching" | "crossed";
};

const thresholdConsequenceByLever: Record<BusinessAreaKey, string> = {
  "hiring-stance": "the hiring pause line",
  "investment-pace": "the expansion pause line",
  "sales-posture": "the fundraising pause line",
  "product-priorities": "the roadmap pause line",
  "risk-tolerance": "the spending pause line",
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
  areaActionNow: "Keep last week's plan for this area.",
  triggerThreshold: "Pause if funding pressure exceeds 60 or risk appetite falls below 40.",
  reversalCondition: "Resume expansion when funding pressure drops below 50 and risk appetite is above 50.",
} satisfies Omit<ActionStripItem, "lever" | "label">;

/* Said as what is missing. The reader cannot "review thresholds manually"; the
   rule table did not supply a line this week, and that is the fact to carry. */
const MANUAL_REVIEW_THRESHOLD_PLACEHOLDER = "No pause line this week — check the call before acting.";
const MANUAL_REVIEW_REVERSAL_PLACEHOLDER = "No resume line this week — check the call before acting.";

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

export type RuleThresholdDistance = RuleCondition & {
  currentValue: number;
  pointsToLine: number;
  satisfied: boolean;
};

type DecisionLaneState = {
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

const metricLabel = (metric: RuleConditionMetric) => ruleMetricLabel[metric];

/**
 * Satisfaction comes from the operator, not from the distance: a strict ">"
 * line sits zero points from a reading that equals it and has still not been
 * crossed, and scores and lines are both integers, so equality is a real case.
 */
export const toThresholdDistance = (condition: RuleCondition, scores: CurrentScores): RuleThresholdDistance => {
  const currentValue = scores[condition.metric];
  return {
    ...condition,
    currentValue,
    pointsToLine: distanceToRuleCondition(condition, currentValue),
    satisfied: isRuleConditionMet(condition, currentValue),
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
type BoundedConditionRail = {
  metric: RuleConditionMetric;
  /** What the surface calls the signal, e.g. "Funding pressure". */
  label: string;
  current: number;
  /** Crossing this trips the rule. */
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
  /** Points from the reading to the guardrail; zero at the line or past it. */
  pointsToGuardrail: number;
  /** Whether the guardrail condition holds. Distinct from a zero distance on a strict line. */
  guardrailTripped: boolean;
  /** Points from the reading to the clearing line; zero at the line or past it. */
  pointsToClear?: number;
  /** Whether the clearing condition holds. */
  clearHolds?: boolean;
};

/**
 * Rail coordinates for a rule's pause and resume lines.
 *
 * Both sides come from the same clause data the sentences are derived from, so
 * a rail cannot state a threshold the sentence beside it does not. A clause
 * with no numeric line contributes no rail: a missing graphic costs a reader
 * nothing.
 */
export const buildBoundedConditionRails = ({
  pause,
  resume = [],
  scores,
}: {
  pause?: readonly RuleCondition[];
  resume?: readonly RuleCondition[];
  scores?: CurrentScores;
}): BoundedConditionRail[] => {
  if (!pause || !scores) {
    return [];
  }

  const clearLines = new Map<RuleConditionMetric, RuleCondition>();
  for (const condition of resume) {
    if (!clearLines.has(condition.metric)) {
      clearLines.set(condition.metric, condition);
    }
  }

  const seen = new Set<RuleConditionMetric>();
  const rails: BoundedConditionRail[] = [];

  for (const condition of pause) {
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
    const clear = clearLines.get(condition.metric);

    rails.push({
      metric: condition.metric,
      label: metricLabel(condition.metric),
      current,
      guardrail: condition.value,
      clearsAt: clear?.value,
      invert: !tripsHigh,
      pointsToGuardrail: distanceToRuleCondition(condition, current),
      guardrailTripped: isRuleConditionMet(condition, current),
      pointsToClear: clear ? distanceToRuleCondition(clear, current) : undefined,
      clearHolds: clear ? isRuleConditionMet(clear, current) : undefined,
    });
  }

  return rails;
};

/**
 * The one corridor every lever shares, drawn once.
 *
 * All five rules are built from the same four lines in different pairs, so a
 * per-area rail set repeats the same two rails five times. This collects the
 * first pause and resume line stated per signal across the items and draws
 * that pair; per-area rows then only need to say which lines apply and how far
 * off they are.
 */
export const buildSharedCorridorRails = (
  items: readonly Pick<ActionStripItem, "pauseConditions" | "resumeConditions">[],
  scores?: CurrentScores,
): BoundedConditionRail[] => {
  const pause: RuleCondition[] = [];
  const resume: RuleCondition[] = [];
  const seenPause = new Set<RuleConditionMetric>();
  const seenResume = new Set<RuleConditionMetric>();
  for (const item of items) {
    for (const condition of item.pauseConditions ?? []) {
      if (seenPause.has(condition.metric)) continue;
      seenPause.add(condition.metric);
      pause.push(condition);
    }
    for (const condition of item.resumeConditions ?? []) {
      if (seenResume.has(condition.metric)) continue;
      seenResume.add(condition.metric);
      resume.push(condition);
    }
  }
  // Rails read in signal order, whichever lever happened to state a line first.
  const order: RuleConditionMetric[] = ["tightness", "riskAppetite"];
  const byMetric = (left: RuleCondition, right: RuleCondition) =>
    order.indexOf(left.metric) - order.indexOf(right.metric);
  return buildBoundedConditionRails({ pause: pause.sort(byMetric), resume: resume.sort(byMetric), scores });
};

/**
 * "44 pts away", "at the line", "crossed" or "already met" — a distance, not a
 * sentence. `met` is the operator's verdict; a strict line at zero distance is
 * "at the line", which is not the same claim as tripped.
 *
 * Every caller prints this immediately after the line's own value, so the two
 * numbers end up adjacent: `66` followed by `11 pts away` reads as "66 11" on
 * first glance, and the reader has to work out where one figure stops. The
 * export formats had already solved it by parenthesising the distance;
 * `parenthesizePointsToLine` is that, shared, so the screen and the paste agree.
 */
export const formatPointsToLine = (
  points: number | undefined,
  kind: "pause" | "resume",
  met: boolean | undefined,
): string => {
  if (points === undefined || !Number.isFinite(points)) return "—";
  if (met) return kind === "pause" ? "crossed" : "already met";
  if (points === 0) return "at the line";
  return `${points.toFixed(points % 1 === 0 ? 0 : 1)} pts away`;
};

/**
 * The same distance, wrapped so it cannot be misread as part of the number it
 * follows. Kept separate from `formatPointsToLine` because a few surfaces print
 * the distance on its own, where brackets would be noise.
 */
export const parenthesizePointsToLine = (
  points: number | undefined,
  kind: "pause" | "resume",
  met: boolean | undefined,
): string => `(${formatPointsToLine(points, kind, met)})`;

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
  rule?: Pick<BoundedDecisionRule, "pause" | "resume">;
  scores?: CurrentScores;
}): DecisionLaneState | null => {
  if (!rule || !scores) {
    return null;
  }

  const pauseConditions = rule.pause.conditions.map((condition) => toThresholdDistance(condition, scores));
  const resumeConditions = rule.resume.conditions.map((condition) => toThresholdDistance(condition, scores));
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
      ownerLabel: businessAreaOwner[lever],
      areaActionNow: rule ? formatBoundedDecisionAction(rule) : OPERATING_LEVER_FALLBACK.areaActionNow,
      triggerThreshold: rule ? formatActionStripThresholdText(rule) : OPERATING_LEVER_FALLBACK.triggerThreshold,
      reversalCondition: rule ? formatActionStripReversalText(rule) : OPERATING_LEVER_FALLBACK.reversalCondition,
      pauseConditions: rule?.pause.conditions ?? [],
      resumeConditions: rule?.resume.conditions ?? [],
      latencyLine: rule?.latency ? formatDecisionLatencyLine(rule.latency) : undefined,
      pauseQualifier: rule?.pause.qualifier,
      resumeQualifier: rule?.resume.qualifier,
      nearestPause: laneState?.nearestPause,
      nearestResume: laneState?.nearestResume,
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

/**
 * Kanban pull-policy blocks, derived from the same pause/resume conditions the
 * weekly call prints.
 *
 * Kanban teams pull continuously — there is no sprint boundary to attach a
 * ceremony to — so the value is the regime stated as a pull policy: when to
 * stop pulling a class of work and when to resume. The conditions are the
 * bounded rules' own `pauseConditions` / `resumeConditions` (plus any
 * qualitative pause/resume qualifier), re-verbed for a pull system. A card
 * pasted from here cannot state a threshold the weekly call does not, because
 * it is the same data.
 *
 * The verb stays the area's action so the block reads as "pull {action} until
 * X, resume when Y" rather than a generic "be cautious".
 */
export type PullPolicyBlock = {
  area: BusinessAreaKey;
  label: string;
  /** What the team keeps pulling, in the area's own action terms. */
  pull: string;
  /** Stop pulling when: the pause conditions, as the hero prints them. */
  stopPullingWhen: string;
  /** Resume when: the resume conditions, or the reversal if none are stated. */
  resumeWhen: string;
  /** Copy-ready markdown for a board header or wiki. */
  markdown: string;
};

const conditionLabel = (condition: RuleCondition): string => condition.label;

const listConditions = (conditions: readonly RuleCondition[]): string =>
  conditions.length === 0 ? "" : conditions.map(conditionLabel).join(" or ");

export const buildPullPolicyBlocks = (
  items: readonly ActionStripItem[],
): PullPolicyBlock[] =>
  items.map((item) => {
    const pauseLines = listConditions(item.pauseConditions ?? []);
    const pauseClause = [pauseLines, item.pauseQualifier].filter(Boolean).join(" or ");
    const resumeLines = listConditions(item.resumeConditions ?? []);
    const resumeClause = [resumeLines, item.resumeQualifier].filter(Boolean).join(" and ");
    const stopPullingWhen = pauseClause || item.triggerThreshold;
    const resumeWhen = resumeClause || item.reversalCondition;

    return {
      area: item.lever,
      label: item.label,
      pull: item.areaActionNow,
      stopPullingWhen,
      resumeWhen,
      markdown: [
        `**Pull policy — ${item.label}**`,
        `Pull: ${item.areaActionNow}`,
        `Stop pulling when: ${stopPullingWhen}`,
        `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${resumeWhen}`,
      ].join("\n"),
    };
  });
