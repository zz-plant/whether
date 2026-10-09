import { FALLBACK_PAUSE_THRESHOLD } from "./reportCopy";
import type { RegimeKey } from "../regimeEngine";
import { formatScoreValue, formatThresholdNumber } from "../formatters";
import { decisionLatencyByArea, type DecisionLatency } from "./decisionLatency";
import {
  extractCompactClause as extractCompactClauseFromFormatting,
  formatDecisionAction,
  formatDecisionReversal,
  formatDecisionThreshold,
  formatDecisionTriplet,
} from "./reportFormatting";
import { resolveRunwayBand, runwayBandLabel, type RunwayBand } from "./operatorRunway";
import { regimeSignalLabel } from "./signalTranslations";

export type DecisionArea = "hiring" | "product-tempo" | "capital-raising" | "burn-discipline" | "expansion-bets";

export type RuleConditionMetric = "tightness" | "riskAppetite";
type RuleConditionOperator = ">" | ">=" | "<" | "<=";

/** One numeric line on one composite signal. */
export type RuleCondition = {
  metric: RuleConditionMetric;
  operator: RuleConditionOperator;
  value: number;
  /** Compact form for chips and exports, e.g. "Funding pressure < 66". */
  label: string;
};

/**
 * A bounded rule's pause or resume side, as data.
 *
 * The rule used to store these only as sentences, and three separate regex
 * parsers read the numbers back out of them to draw rails, grade lanes and
 * compute distances. The numbers now live here and the sentence is derived —
 * see `formatRuleClause` — so a rail can never state a line the sentence under
 * it does not, and no consumer has to parse prose.
 */
type BoundedRuleClause = {
  /** The imperative the conditions attach to, e.g. "Pause net-new hiring". */
  verb: string;
  /** Numeric lines. Empty when the clause is purely qualitative. */
  conditions: RuleCondition[];
  /** How the lines combine: a pause fires on any, a resume needs all. */
  join: "or" | "and";
  /** A non-numeric condition stated after the lines, e.g. "budget payback proof is intact". */
  qualifier?: string;
};

export type BoundedDecisionRule = {
  area: DecisionArea;
  recommendation: string;
  doNow: string[];
  avoidNow: string[];
  scope: string;
  /** The pause side of the rule, as data. `pauseTrigger` is derived from it. */
  pause: BoundedRuleClause;
  /** The resume side of the rule, as data. `resumeTrigger` and `flipConditions` are derived from it. */
  resume: BoundedRuleClause;
  /** Maps to UI label "Threshold" — the condition that triggers a pause */
  pauseTrigger: string;
  /** Maps to UI label "Reversal" — the condition that clears the pause */
  resumeTrigger: string;
  /** Additional conditions that would flip the regime/decision */
  flipConditions: RuleCondition[];
  /**
   * The clock this lever runs on: when the action is felt and what unwinding
   * costs. Set by the canonical builder; hand-built rules (tests, fixtures)
   * may omit it, and renderers must tolerate that.
   */
  latency?: DecisionLatency;
  rationale: string;
};

/** Read from the one signal-name table, so a rename lands here and in every rule label. */
export const ruleMetricLabel: Record<RuleConditionMetric, string> = {
  tightness: regimeSignalLabel.tightness,
  riskAppetite: regimeSignalLabel.riskAppetite,
};

export const buildRuleCondition = (
  metric: RuleConditionMetric,
  operator: RuleConditionOperator,
  value: number,
): RuleCondition => ({
  metric,
  operator,
  value,
  label: `${ruleMetricLabel[metric]} ${operator} ${formatThresholdNumber(value)}`,
});

/**
 * Points between the reading and the line, in the direction the line trips.
 * Zero once the condition holds.
 */
export const distanceToRuleCondition = (condition: RuleCondition, current: number): number => {
  switch (condition.operator) {
    case ">":
      return current > condition.value ? 0 : condition.value - current;
    case ">=":
      return current >= condition.value ? 0 : condition.value - current;
    case "<":
      return current < condition.value ? 0 : current - condition.value;
    case "<=":
      return current <= condition.value ? 0 : current - condition.value;
  }
};

/**
 * Evaluated from the operator, not from the distance: a strict line sits zero
 * points from a reading that equals it and is still not met.
 */
export const isRuleConditionMet = (condition: RuleCondition, current: number): boolean => {
  if (!Number.isFinite(current)) return false;
  switch (condition.operator) {
    case ">":
      return current > condition.value;
    case ">=":
      return current >= condition.value;
    case "<":
      return current < condition.value;
    case "<=":
      return current <= condition.value;
  }
};

/**
 * The one sentence form of a condition. A rising line reads "rises above", a
 * falling one "falls below"; a resume line on risk appetite reads "is above"
 * because that side of the rule is a state to hold, not a move to watch.
 *
 * A line the reading already meets says so, the way the change line does
 * ("is above 76 (already true at 90)"). Until 2026-10-07 every line read as a
 * move still to come, so a week at 90 was told to pause "if funding pressure
 * rises above 76" on every surface that prints the rule, beside a table
 * marking the same line crossed.
 */
const describeRuleCondition = (
  condition: RuleCondition,
  side: "pause" | "resume",
  scores?: { tightness: number; riskAppetite: number },
): string => {
  const metric = ruleMetricLabel[condition.metric].toLowerCase();
  const value = formatThresholdNumber(condition.value);
  const current = scores?.[condition.metric];
  if (current !== undefined && isRuleConditionMet(condition, current)) {
    const state =
      condition.operator === ">" ? "is above" : condition.operator === ">=" ? "is at or above" : condition.operator === "<" ? "is below" : "is at or below";
    return `${metric} ${state} ${value} (already true at ${formatScoreValue(current)})`;
  }
  switch (condition.operator) {
    case ">":
      return side === "resume" && condition.metric === "riskAppetite"
        ? `${metric} is above ${value}`
        : `${metric} rises above ${value}`;
    case ">=":
      return `${metric} is at or above ${value}`;
    case "<":
      return `${metric} falls below ${value}`;
    case "<=":
      return `${metric} is at or below ${value}`;
  }
};

/** The sentence every surface prints for a clause, derived from its data. */
const formatRuleClause = (
  clause: BoundedRuleClause,
  side: "pause" | "resume",
  scores?: { tightness: number; riskAppetite: number },
): string => {
  const parts = [
    ...clause.conditions.map((condition) => describeRuleCondition(condition, side, scores)),
    ...(clause.qualifier ? [clause.qualifier] : []),
  ];
  if (parts.length === 0) return `${clause.verb}.`;
  const connective = side === "pause" ? "if" : "when";
  return `${clause.verb} ${connective} ${parts.join(` ${clause.join} `)}.`;
};

const withDerivedTriggers = (
  rule: Omit<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger" | "flipConditions" | "latency">,
  scores: { tightness: number; riskAppetite: number },
): BoundedDecisionRule => ({
  ...rule,
  latency: decisionLatencyByArea[rule.area],
  pauseTrigger: formatRuleClause(rule.pause, "pause", scores),
  resumeTrigger: formatRuleClause(rule.resume, "resume", scores),
  flipConditions: rule.resume.conditions,
});

export type StartupVariantMode = "seed" | "series-a" | "series-b" | "growth" | "public" | "bootstrapped";

const VALID_STARTUP_VARIANT_MODES = new Set<string>([
  "seed",
  "series-a",
  "series-b",
  "growth",
  "public",
  "bootstrapped",
]);

export const isStartupVariantMode = (value: unknown): value is StartupVariantMode =>
  typeof value === "string" && VALID_STARTUP_VARIANT_MODES.has(value);

export const resolveStartupVariantMode = (
  value: string | null | undefined,
  fallback: StartupVariantMode = "series-a",
): StartupVariantMode => (isStartupVariantMode(value) ? value : fallback);

export type ScopedVariantDecisionAdjustment = {
  mode: StartupVariantMode;
  label: string;
  description: string;
  /**
   * Present only when a runway band other than the default reshaped the stage
   * rule. The balanced band is the corridor the stage rules already assume, so
   * it leaves the adjustment untouched and these unset.
   */
  runwayBand?: RunwayBand;
  runwayLabel?: string;
  doNowAdjustments: string[];
  avoidAdjustments: string[];
  watchAdjustments: string[];
  thresholdEmphasis: string;
  reversalTriggerDiscipline: string;
};

type RuleContext = {
  regime: RegimeKey;
  thresholds: {
    tightnessRegime: number;
    riskAppetiteRegime: number;
  };
  scores: {
    tightness: number;
    riskAppetite: number;
  };
};

/* The one order. Every surface that lists the five areas — the homepage table, the plan page's
   playbook, the guardrail tags on /share, the scenario routes — reads it, so a reader who checks
   Fundraising every Monday finds it in the same row on every page and in every paste. */
export const decisionAreaOrder: readonly DecisionArea[] = ["hiring", "product-tempo", "capital-raising", "burn-discipline", "expansion-bets"];
const areaOrder: DecisionArea[] = [...decisionAreaOrder];

const areaLabels: Record<DecisionArea, string> = {
  hiring: "Hiring",
  "product-tempo": "Roadmap",
  "capital-raising": "Fundraising",
  "burn-discipline": "Spending",
  "expansion-bets": "New bets",
};

export const decisionAreaLabel = (area: DecisionArea) => areaLabels[area];
export const isDecisionArea = (value: string): value is DecisionArea =>
  Object.prototype.hasOwnProperty.call(areaLabels, value);
export const extractCompactClause = extractCompactClauseFromFormatting;

export const formatBoundedDecisionAction = (rule: Pick<BoundedDecisionRule, "doNow" | "recommendation">) =>
  formatDecisionAction(rule.doNow[0] ?? rule.recommendation, "Keep last week's plan");

export const formatBoundedDecisionThreshold = (rule: Pick<BoundedDecisionRule, "pauseTrigger">) =>
  formatDecisionThreshold(rule.pauseTrigger, FALLBACK_PAUSE_THRESHOLD);

export const formatBoundedDecisionReverse = (rule: Pick<BoundedDecisionRule, "resumeTrigger">) =>
  formatDecisionReversal(rule.resumeTrigger, "Resume only after the reading recovers");

export const formatBoundedDecisionTriplet = (rule: Pick<BoundedDecisionRule, "doNow" | "recommendation" | "pauseTrigger" | "resumeTrigger">) => {
  const triplet = formatDecisionTriplet({
    action: rule.doNow[0] ?? rule.recommendation,
    threshold: rule.pauseTrigger,
    reversal: rule.resumeTrigger,
    fallbacks: {
      action: "Keep last week's plan",
      threshold: FALLBACK_PAUSE_THRESHOLD,
      reversal: "Resume only after the reading recovers",
    },
  });

  return {
    action: triplet.action,
    threshold: triplet.threshold,
    reverse: triplet.reversal,
  };
};

/**
 * Whether a printed guardrail sentence is this rule's pause clause.
 *
 * The homepage may print a stage-scoped or policy-override guardrail in the
 * rule's slot. Rails drawn from the rule's lines would then describe a rule the
 * reader is not being shown, so a surface asks this before drawing them.
 * A bare numeric threshold matches when it is the rule's funding-pressure line.
 */
export const guardrailMatchesRule = (
  guardrail: string | undefined,
  rule: Pick<BoundedDecisionRule, "pause" | "pauseTrigger">,
  numericThreshold?: number,
): boolean => {
  if (!guardrail) return false;
  if (guardrail === rule.pauseTrigger || guardrail === formatDecisionThreshold(rule.pauseTrigger)) return true;
  return (
    typeof numericThreshold === "number"
    && Number.isFinite(numericThreshold)
    && rule.pause.conditions.some(
      (condition) => condition.metric === "tightness" && condition.value === numericThreshold,
    )
  );
};

const fmt = formatThresholdNumber;

/**
 * The Spending rule's payback bar, in months, in every condition. One number so
 * the evidence line for the recession warning gauge states the same bar as the
 * rule printed above it (`reportEvidence.ts`).
 */
export const SPENDING_PAYBACK_BAR_MONTHS = 6;

/**
 * The payback bar a tight runway (6–12 months of cash) puts in front of every
 * stage rule, hires and growth campaigns included. Derived from the Spending
 * bar so it can never be looser: it said "a nine-month payback" and "six to
 * nine months" on hires until 2026-10-07, which "tightened" a Spending rule
 * printed on the same page at six. A tight runway extends the Spending bar to
 * everything; it does not relax it anywhere.
 */
const TIGHT_RUNWAY_PAYBACK_BAR_MONTHS = SPENDING_PAYBACK_BAR_MONTHS;

/**
 * The four lines every area's pause and resume conditions are drawn from, set
 * apart from the change lines so a score must travel past a line, not touch it,
 * before a rule moves. One source for the rules below and for the track record's
 * count of months a line was crossed.
 */
export const sharedDecisionLines = (thresholds: RuleContext["thresholds"]) => ({
  tightnessPause: thresholds.tightnessRegime + 6,
  tightnessResume: Math.max(thresholds.tightnessRegime - 4, 0),
  riskPause: Math.max(thresholds.riskAppetiteRegime - 6, 0),
  riskResume: Math.min(thresholds.riskAppetiteRegime + 4, 100),
});

export const buildCanonicalBoundedDecisionRules = ({ regime, thresholds, scores }: RuleContext): BoundedDecisionRule[] => {
  const isExpansion = regime === "EXPANSION";
  const { tightnessPause, tightnessResume, riskPause, riskResume } = sharedDecisionLines(thresholds);

  // Every lever shares one corridor: these four lines, in different pairs.
  const tightnessPauseLine = buildRuleCondition("tightness", ">", tightnessPause);
  const riskPauseLine = buildRuleCondition("riskAppetite", "<", riskPause);
  const tightnessResumeLine = buildRuleCondition("tightness", "<", tightnessResume);
  const riskResumeLine = buildRuleCondition("riskAppetite", ">", riskResume);

  const rulesByArea: Record<DecisionArea, Omit<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger" | "flipConditions" | "latency">> = {
    hiring: {
      area: "hiring",
      recommendation: isExpansion
        ? "Selective hiring for revenue-linked and reliability roles."
        : "Backfills + mission-critical hiring only.",
      doNow: isExpansion
        ? ["Approve revenue-linked and reliability roles one at a time; hold everything else."]
        : ["Limit hiring to backfills and mission-critical roles tied to delivery risk."],
      avoidNow: isExpansion
        ? ["Don't open a hiring plan that no revenue or reliability need explains."]
        : ["Don't add roles for capacity you might need, or for work that pays back in more than a year."],
      scope: `Applies to all net-new headcount; current funding pressure ${fmt(scores.tightness)} and risk appetite ${fmt(scores.riskAppetite)}.`,
      pause: { verb: "Pause net-new hiring", join: "or", conditions: [tightnessPauseLine, riskPauseLine] },
      resume: { verb: "Resume the held roles", join: "and", conditions: [tightnessResumeLine, riskResumeLine] },
      rationale: "Keep the people who ship, without adding fixed cost you cannot cut later.",
    },
    "product-tempo": {
      area: "product-tempo",
      recommendation: isExpansion
        ? "Speed up product work tied to activation and retention goals."
        : "Keep the current roadmap moving. Slow anything that pays back in more than a year.",
      doNow: isExpansion
        ? ["Ship the product bets that move activation or retention first."]
        : ["Keep the core roadmap on schedule; ship the pieces customers can use this quarter first."],
      avoidNow: isExpansion
        ? ["Don't commit to scope you can't cut until a shipped milestone shows traction."]
        : ["Don't add roadmap work that pays back in more than a year on weak evidence."],
      scope: "What ships in what order, how big each release is, and how many experiments run at once.",
      pause: {
        verb: "Pause long-payback bets",
        join: "or",
        conditions: [riskPauseLine],
        qualifier: "two weekly readings in a row come in weaker",
      },
      resume: {
        verb: "Resume the paused bets",
        join: "and",
        conditions: [riskResumeLine],
        qualifier: "the weekly reading holds or improves",
      },
      rationale: "Move fast where the evidence is strong; keep unproven scope small enough to drop.",
    },
    "capital-raising": {
      area: "capital-raising",
      recommendation: isExpansion
        ? "If you plan to raise in the next 12 months, start now while terms are good."
        : "If you plan to raise, start early and take the terms that last over the ones that close fastest.",
      doNow: isExpansion
        ? ["If a raise is in your plan, run the process now rather than waiting."]
        : ["If you plan to raise, prepare the materials now so the timing stays yours."],
      avoidNow: isExpansion
        ? ["Don't wait until you need the money to talk to investors."]
        : ["Don't trade term quality for a faster close."],
      scope: "When to start a raise, how fast to run it, and the worst terms you would accept.",
      pause: { verb: "Pause the raise", join: "or", conditions: [riskPauseLine, tightnessPauseLine] },
      resume: { verb: "Resume the full process", join: "and", conditions: [riskResumeLine, tightnessResumeLine] },
      rationale: "Start while conditions are good and you choose the terms; start late and the market does.",
    },
    "burn-discipline": {
      area: "burn-discipline",
      recommendation: `Approve spending only if it pays back inside ${SPENDING_PAYBACK_BAR_MONTHS} months.`,
      doNow: [`Put a payback figure on every discretionary line before approving it; ${SPENDING_PAYBACK_BAR_MONTHS} months is the bar.`],
      avoidNow: ["Don't sign a multi-quarter commitment without a payback figure."],
      scope: "Hiring, vendor and marketing spend that commits you for more than one quarter.",
      pause: { verb: "Pause new discretionary spend", join: "or", conditions: [tightnessPauseLine] },
      resume: {
        verb: "Resume new spend",
        join: "and",
        conditions: [tightnessResumeLine],
        qualifier: "the payback figures still hold",
      },
      rationale: "Cash you did not spend is the option you keep when conditions turn.",
    },
    "expansion-bets": {
      area: "expansion-bets",
      recommendation: isExpansion
        ? "Start new bets in stages, each with a written stop condition."
        : "Hold any new bet you can't unwind; keep only the experiments you can stop within a week.",
      doNow: isExpansion
        ? ["Fund each new bet one stage at a time, and write down what would stop it."]
        : ["Keep only the experiments you can stop within a week, each with a review date."],
      avoidNow: isExpansion
        ? ["Don't sign a commitment you can't unwind until the previous stage has paid off."]
        : ["Don't start a bet you can't unwind until the reading improves."],
      scope: "New market launches, major platform rewrites, and long-cycle initiatives.",
      pause: { verb: "Pause new bets", join: "or", conditions: [riskPauseLine, tightnessPauseLine] },
      resume: { verb: "Resume one stage at a time", join: "and", conditions: [riskResumeLine, tightnessResumeLine] },
      rationale: "Grow new bets as the evidence grows, not ahead of it.",
    },
  };

  return areaOrder.map((area) => withDerivedTriggers(rulesByArea[area], scores));
};

/**
 * Every lever's flip conditions are built from the same `tightnessResume` /
 * `riskResume` pair, so a reader scanning three rows sees the same two numbers
 * three times and reads them as per-lever coincidence rather than one shared
 * corridor. Surface the corridor once, but only when the rules genuinely share
 * it: if the distinct conditions ever stop being fewer than the rules that use
 * them, this returns null rather than overstating the relationship.
 */
export const formatSharedFlipCorridor = (rules: BoundedDecisionRule[]): string | null => {
  const rulesWithConditions = rules.filter((rule) => rule.flipConditions.length > 0);
  if (rulesWithConditions.length < 2) return null;

  const distinct = new Map<string, string>();
  for (const rule of rulesWithConditions) {
    for (const condition of rule.flipConditions) {
      distinct.set(`${condition.metric}${condition.operator}${condition.value}`, condition.label);
    }
  }

  if (distinct.size >= rulesWithConditions.length) return null;

  return [...distinct.values()].join(" · ");
};

export const formatActionStripThresholdText = (rule: Pick<BoundedDecisionRule, "pauseTrigger">) =>
  formatBoundedDecisionThreshold(rule);

export const formatActionStripReversalText = (rule: Pick<BoundedDecisionRule, "resumeTrigger">) =>
  formatBoundedDecisionReverse(rule);

export const startupVariantModes: Array<{ mode: StartupVariantMode; label: string }> = [
  { mode: "seed", label: "Seed" },
  { mode: "series-a", label: "Series A" },
  { mode: "series-b", label: "Series B" },
  { mode: "growth", label: "Growth" },
  { mode: "public", label: "Public" },
  { mode: "bootstrapped", label: "Bootstrapped" },
];

export const buildScopedVariantDecisionAdjustment = ({
  mode,
  thresholds,
  scores,
  runwayMonths,
  runwayBand,
}: Pick<RuleContext, "thresholds" | "scores"> & {
  mode: StartupVariantMode;
  runwayMonths?: number;
  runwayBand?: RunwayBand;
}): ScopedVariantDecisionAdjustment => {
  const resolvedBand = resolveRunwayBand(runwayBand, runwayMonths);
  /*
   * The resume lines a stage's hold lifts on: the same two lines, with the same
   * numbers and wording, the area rules print (`sharedDecisionLines`,
   * `describeRuleCondition`). Series A read "Reverse the hold only after the
   * trigger clears", naming no line and no number, and Series B and Public named
   * "their resume lines" and "the line" without saying where either sat.
   */
  const { tightnessResume, riskResume, tightnessPause, riskPause } = sharedDecisionLines(thresholds);
  /*
   * The pause lines a stage watches, likewise the area rules' own. The stage
   * lines read "tighten if funding pressure moves within 20.0 points of the
   * line", where the 20.0 was today's distance from the change line, so the
   * condition held the moment it was printed, and on a crossed week "moving
   * within" it meant conditions easing. The first of these is the stage's
   * "Pause if" (`applyStageToWeeklyCall`).
   */
  const tightnessPauseLine = describeRuleCondition(buildRuleCondition("tightness", ">", tightnessPause), "pause", scores);
  const riskPauseLine = describeRuleCondition(buildRuleCondition("riskAppetite", "<", riskPause), "pause", scores);
  const tightnessResumeLine = describeRuleCondition(buildRuleCondition("tightness", "<", tightnessResume), "resume", scores);
  const riskResumeLine = describeRuleCondition(buildRuleCondition("riskAppetite", ">", riskResume), "resume", scores);

  const getBaseAdjustment = (): ScopedVariantDecisionAdjustment => {
    if (mode === "seed") {
      return {
        mode,
        label: "Seed",
        description: "Protect runway; keep proving demand in short cycles.",
        doNowAdjustments: [
          "Prioritize experiments that can prove customer pull inside one sprint.",
          "Hire only when a milestone lands or revenue already covers the role.",
        ],
        avoidAdjustments: [
          "Don't make several permanent hires before one milestone lands.",
        ],
        watchAdjustments: [
          `Runway trigger: tighten if ${tightnessPauseLine} for 2 readings in a row.`,
        ],
        thresholdEmphasis: "Protect runway first; fund one proof of demand at a time rather than breadth.",
        reversalTriggerDiscipline: `Reverse the hold only after ${tightnessResumeLine} for two readings in a row and one shipped milestone shows traction.`,
      };
    }

    if (mode === "series-a") {
      return {
        mode,
        label: "Series A",
        description: "Grow only as fast as repeatable sales proof allows.",
        doNowAdjustments: [
          "Add sales or product spend only where the numbers you already track are improving.",
        ],
        avoidAdjustments: [
          "Don't run two expansion programs at once; you won't know which one paid back.",
        ],
        watchAdjustments: [
          `Payback trigger: revisit the plan if ${riskPauseLine}.`,
        ],
        /*
         * The Spending bar, not a stage bar of its own: this said "pay back inside
         * 12 months" until 2026-10-07, beside a Spending rule that approves new
         * spend only inside six. A stage adds emphasis; it never relaxes that bar.
         */
        thresholdEmphasis: `Payback first: fund the channels that convert repeatably and pay back inside ${SPENDING_PAYBACK_BAR_MONTHS} months.`,
        reversalTriggerDiscipline: `Reverse the hold only after ${riskResumeLine} and conversion holds for two weekly reviews.`,
      };
    }

    if (mode === "series-b") {
      return {
        mode,
        label: "Series B",
        description: "Protect margin while scaling the few areas that are already efficient.",
        doNowAdjustments: [
          "Approve spend only in areas with a measurable margin or efficiency gain this quarter.",
        ],
        avoidAdjustments: [
          "Don't add fixed cost on the assumption that valuations recover.",
        ],
        watchAdjustments: [
          `Leverage trigger: hold expansion if ${tightnessPauseLine}.`,
        ],
        thresholdEmphasis: "Efficiency first: show the margin gain before adding headcount.",
        reversalTriggerDiscipline: `Reverse the hold only when, in the same week, ${tightnessResumeLine} and ${riskResumeLine}.`,
      };
    }

    if (mode === "growth") {
      return {
        mode,
        label: "Growth",
        description: "Scale the channels and platform work that hold their unit economics.",
        doNowAdjustments: [
          "Put growth spend only into channels whose customer acquisition cost pays back inside the planning window.",
        ],
        avoidAdjustments: [
          "Don't grow revenue faster than support and margin can carry it.",
        ],
        watchAdjustments: [
          `Growth trigger: re-sequence expansion if ${riskPauseLine}.`,
        ],
        thresholdEmphasis: "Prove customer acquisition cost payback, retention and support capacity before adding fixed cost.",
        reversalTriggerDiscipline: `Reverse the hold only after ${riskResumeLine} and conversion improves, both for two weekly readings.`,
      };
    }

    if (mode === "public") {
      return {
        mode,
        label: "Public",
        description: "Protect earnings and deliver the guidance you gave.",
        doNowAdjustments: [
          "Put capital into the initiatives with margin and cash flow inside the year first.",
        ],
        avoidAdjustments: [
          "Don't fund programs that only meet guidance if the market re-rates.",
        ],
        watchAdjustments: [
          `Guidance trigger: tighten discretionary spend if ${tightnessPauseLine}.`,
        ],
        thresholdEmphasis: "Earnings durability first: cash conversion and hitting guidance before growth.",
        reversalTriggerDiscipline: `Reverse the hold only when ${tightnessResumeLine} and confidence in your earnings guidance improves with it.`,
      };
    }

    return {
      mode,
      label: "Bootstrapped",
      description: "Keep cash in the bank and let customer value compound.",
      doNowAdjustments: [
        // The Spending bar again; "inside the year" read as a 12-month bar until 2026-10-07.
        `Fund growth from revenue, and only where the cash comes back inside ${SPENDING_PAYBACK_BAR_MONTHS} months.`,
        "Make investments in stages you can pause without breaking operations.",
      ],
      avoidAdjustments: [
        "Don't start anything that needs outside money to finish.",
      ],
      watchAdjustments: [
        `Cash trigger: tighten spend if ${tightnessPauseLine} or ${riskPauseLine}.`,
      ],
      thresholdEmphasis: "Cash first: commitments you can reverse, over growth that looks good.",
      reversalTriggerDiscipline: `Reverse the hold only after ${tightnessResumeLine}, ${riskResumeLine}, and cash payback holds for two weekly readings in a row.`,
    };
  };

  const base = getBaseAdjustment();
  return scaleAdjustmentToRunway(base, resolvedBand);
};

/*
 * Runway is the second axis. Stage says what kind of company is reading the
 * rule; runway says how long it can be wrong. The bands below 12 months put a
 * cash gate in front of every stage rule, because a company with four months
 * of cash does not get to act on an expansion call however clear the macro
 * read is. Above 24 months the corridor still binds, but the cushion buys a
 * counter-cyclical move the stage rule alone would not offer.
 *
 * Each slot keeps its sentence type: a do-now is an action, a watch line is
 * the condition that pauses it, and the reversal names the milestone that
 * lifts it — a cash figure, not a macro read, because cash is what put the
 * gate there.
 */
const scaleAdjustmentToRunway = (
  base: ScopedVariantDecisionAdjustment,
  band: RunwayBand | null,
): ScopedVariantDecisionAdjustment => {
  if (!band || band === "balanced") {
    return base;
  }
  const runwayLabel = `${runwayBandLabel(band)} runway`;

  if (band === "critical") {
    return {
      ...base,
      runwayBand: band,
      runwayLabel,
      description: `${base.description} Under six months of cash, keeping cash overrides this week's guidance.`,
      doNowAdjustments: [
        "Freeze non-revenue hires and put a second signoff on every discretionary commitment.",
        "Bring cash forward where you can: annual-upfront terms, earlier invoicing.",
        ...base.doNowAdjustments,
      ],
      avoidAdjustments: [
        "Don't make a commitment or hire that needs follow-on financing to finish.",
        ...base.avoidAdjustments,
      ],
      watchAdjustments: [
        "Cash gate: under six months of runway, hold every new commitment whatever this week's guidance says.",
        ...base.watchAdjustments,
      ],
      thresholdEmphasis: "Runway is what limits you this week, not the guidance. The pause and resume lines apply again once cash clears nine months.",
      reversalTriggerDiscipline: "Reverse the freeze only after runway extends past nine months or bridge financing is banked.",
    };
  }

  if (band === "tight") {
    return {
      ...base,
      runwayBand: band,
      runwayLabel,
      doNowAdjustments: [
        `Require a cash payback case inside ${TIGHT_RUNWAY_PAYBACK_BAR_MONTHS} months on every new hire and growth campaign.`,
        "If you plan to raise, start planning now; a year of cash leaves room for one process, not two.",
        ...base.doNowAdjustments,
      ],
      watchAdjustments: [
        "Cash gate: pause unbudgeted initiatives if net burn grows faster than gross margin.",
        ...base.watchAdjustments,
      ],
      thresholdEmphasis: `Tight runway: every stage rule below now needs a payback inside ${TIGHT_RUNWAY_PAYBACK_BAR_MONTHS} months first. ${base.thresholdEmphasis}`,
      reversalTriggerDiscipline: "Lift the payback gate once runway clears twelve months or the round is signed; until then the stage rule's own resume condition still applies.",
    };
  }

  return {
    ...base,
    runwayBand: band,
    runwayLabel,
    doNowAdjustments: [
      "Use the cushion: recruit senior talent and renegotiate vendor terms now.",
      ...base.doNowAdjustments,
    ],
    avoidAdjustments: [
      "Don't let the cushion lower the payback bar; a bet made against the cycle is still priced like any other.",
      ...base.avoidAdjustments,
    ],
    thresholdEmphasis: `Abundant runway: you can move against the cycle, at the same payback bar. ${base.thresholdEmphasis}`,
  };
};
