import type { RegimeKey } from "../regimeEngine";
import { formatThresholdNumber } from "../formatters";
import {
  extractCompactClause as extractCompactClauseFromFormatting,
  formatDecisionAction,
  formatDecisionReversal,
  formatDecisionThreshold,
  formatDecisionTriplet,
} from "./reportFormatting";

export type DecisionArea = "hiring" | "product-tempo" | "capital-raising" | "burn-discipline" | "expansion-bets";

export type RuleConditionMetric = "tightness" | "riskAppetite";
export type RuleConditionOperator = ">" | ">=" | "<" | "<=";

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
export type BoundedRuleClause = {
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
  rationale: string;
};

export const ruleMetricLabel: Record<RuleConditionMetric, string> = {
  tightness: "Funding pressure",
  riskAppetite: "Risk appetite",
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
 */
const describeRuleCondition = (condition: RuleCondition, side: "pause" | "resume"): string => {
  const metric = ruleMetricLabel[condition.metric].toLowerCase();
  const value = formatThresholdNumber(condition.value);
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
export const formatRuleClause = (clause: BoundedRuleClause, side: "pause" | "resume"): string => {
  const parts = [
    ...clause.conditions.map((condition) => describeRuleCondition(condition, side)),
    ...(clause.qualifier ? [clause.qualifier] : []),
  ];
  if (parts.length === 0) return `${clause.verb}.`;
  const connective = side === "pause" ? "if" : "when";
  return `${clause.verb} ${connective} ${parts.join(` ${clause.join} `)}.`;
};

const withDerivedTriggers = (
  rule: Omit<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger" | "flipConditions">,
): BoundedDecisionRule => ({
  ...rule,
  pauseTrigger: formatRuleClause(rule.pause, "pause"),
  resumeTrigger: formatRuleClause(rule.resume, "resume"),
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

const areaOrder: DecisionArea[] = ["hiring", "product-tempo", "capital-raising", "burn-discipline", "expansion-bets"];

const areaLabels: Record<DecisionArea, string> = {
  hiring: "Hiring",
  "product-tempo": "Product tempo",
  "capital-raising": "Capital raising",
  "burn-discipline": "Burn discipline",
  "expansion-bets": "Expansion bets",
};

export const decisionAreaLabel = (area: DecisionArea) => areaLabels[area];
export const extractCompactClause = extractCompactClauseFromFormatting;

export const formatBoundedDecisionAction = (rule: Pick<BoundedDecisionRule, "doNow" | "recommendation">) =>
  formatDecisionAction(rule.doNow[0] ?? rule.recommendation, "Keep current approvals staged");

export const formatBoundedDecisionThreshold = (rule: Pick<BoundedDecisionRule, "pauseTrigger">) =>
  formatDecisionThreshold(rule.pauseTrigger, "Pause if thresholds weaken");

export const formatBoundedDecisionReverse = (rule: Pick<BoundedDecisionRule, "resumeTrigger">) =>
  formatDecisionReversal(rule.resumeTrigger, "Reverse only after threshold recovery");

export const formatBoundedDecisionTriplet = (rule: Pick<BoundedDecisionRule, "doNow" | "recommendation" | "pauseTrigger" | "resumeTrigger">) => {
  const triplet = formatDecisionTriplet({
    action: rule.doNow[0] ?? rule.recommendation,
    threshold: rule.pauseTrigger,
    reversal: rule.resumeTrigger,
    fallbacks: {
      action: "Keep current approvals staged",
      threshold: "Pause if thresholds weaken",
      reversal: "Reverse only after threshold recovery",
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

export const buildCanonicalBoundedDecisionRules = ({ regime, thresholds, scores }: RuleContext): BoundedDecisionRule[] => {
  const isExpansion = regime === "EXPANSION";
  const tightnessPause = thresholds.tightnessRegime + 6;
  const tightnessResume = Math.max(thresholds.tightnessRegime - 4, 0);
  const riskPause = Math.max(thresholds.riskAppetiteRegime - 6, 0);
  const riskResume = Math.min(thresholds.riskAppetiteRegime + 4, 100);

  // Every lever shares one corridor: these four lines, in different pairs.
  const tightnessPauseLine = buildRuleCondition("tightness", ">", tightnessPause);
  const riskPauseLine = buildRuleCondition("riskAppetite", "<", riskPause);
  const tightnessResumeLine = buildRuleCondition("tightness", "<", tightnessResume);
  const riskResumeLine = buildRuleCondition("riskAppetite", ">", riskResume);

  const rulesByArea: Record<DecisionArea, Omit<BoundedDecisionRule, "pauseTrigger" | "resumeTrigger" | "flipConditions">> = {
    hiring: {
      area: "hiring",
      recommendation: isExpansion
        ? "Selective hiring for revenue-linked and reliability roles."
        : "Backfills + mission-critical hiring only.",
      doNow: isExpansion
        ? ["Prioritize revenue-linked and reliability roles with staged approvals."]
        : ["Limit hiring to backfills and mission-critical roles tied to delivery risk."],
      avoidNow: isExpansion
        ? ["Avoid broad hiring classes without clear revenue or reliability linkage."]
        : ["Avoid net-new hiring for speculative capacity or long-payback initiatives."],
      scope: `Applies to all net-new headcount; current funding pressure ${fmt(scores.tightness)} and risk appetite ${fmt(scores.riskAppetite)}.`,
      pause: { verb: "Pause net-new hiring", join: "or", conditions: [tightnessPauseLine, riskPauseLine] },
      resume: { verb: "Resume staged approvals", join: "and", conditions: [tightnessResumeLine, riskResumeLine] },
      rationale: "Protect delivery capacity without locking in irreversible fixed-cost growth.",
    },
    "product-tempo": {
      area: "product-tempo",
      recommendation: isExpansion
        ? "Speed up product work tied to activation and retention goals."
        : "Protect your roadmap. Slow long-payback expansions.",
      doNow: isExpansion
        ? ["Speed up on product bets tied to activation and retention goals."]
        : ["Protect core roadmap tempo and prioritize near-term customer value slices."],
      avoidNow: isExpansion
        ? ["Avoid irreversible scope expansion before milestone evidence confirms traction."]
        : ["Avoid long-payback roadmap expansions with weak near-term proof."],
      scope: "Roadmap sequencing, release scope, and experimentation cadence.",
      pause: {
        verb: "Pause long-payback bets",
        join: "or",
        conditions: [riskPauseLine],
        qualifier: "two consecutive weaker weekly reads print",
      },
      resume: {
        verb: "Resume tempo on deferred bets",
        join: "and",
        conditions: [riskResumeLine],
        qualifier: "weekly direction stabilizes or improves",
      },
      rationale: "Keep cycle-time high where evidence is strong; cap downside from speculative scope.",
    },
    "capital-raising": {
      area: "capital-raising",
      recommendation: isExpansion
        ? "Raise proactively from leverage while window quality is favorable."
        : "Begin raise planning early and optimize for durability over speed.",
      doNow: isExpansion
        ? ["Run an active fundraising process while window quality remains favorable."]
        : ["Prepare raise materials and launch planning early to preserve process control."],
      avoidNow: isExpansion
        ? ["Avoid waiting for urgency before engaging investors while leverage is strong."]
        : ["Avoid speed-first terms that reduce durability under tighter conditions."],
      scope: "Fundraising launch timing, process pacing, and minimum term quality.",
      pause: { verb: "Pause acceleration", join: "or", conditions: [riskPauseLine, tightnessPauseLine] },
      resume: { verb: "Resume full process", join: "and", conditions: [riskResumeLine, tightnessResumeLine] },
      rationale: "Timing the process around signal windows improves optionality and reduces forced terms.",
    },
    "burn-discipline": {
      area: "burn-discipline",
      recommendation: "Keep discretionary spend gated by measurable short-cycle payback.",
      doNow: ["Gate discretionary spend by measurable short-cycle payback proof."],
      avoidNow: ["Avoid multi-quarter spend commitments without clear payback evidence."],
      scope: "Hiring, vendor, and GTM program spend with multi-quarter commitments.",
      pause: { verb: "Pause discretionary burn expansion", join: "or", conditions: [tightnessPauseLine] },
      resume: {
        verb: "Resume controlled burn expansion",
        join: "and",
        conditions: [tightnessResumeLine],
        qualifier: "budget payback proof is intact",
      },
      rationale: "Cash durability preserves strategic options when macro direction changes quickly.",
    },
    "expansion-bets": {
      area: "expansion-bets",
      recommendation: isExpansion
        ? "Run reversible expansion bets with explicit rollback criteria and stage gates."
        : "Hold irreversible expansion bets; keep only reversible experiments active.",
      doNow: isExpansion
        ? ["Run expansion in staged tranches with explicit rollback criteria."]
        : ["Keep only reversible expansion experiments active with clear checkpoints."],
      avoidNow: isExpansion
        ? ["Avoid one-way expansion commitments without stage-gate evidence."]
        : ["Avoid irreversible expansion bets until window strength improves."],
      scope: "New market launches, major platform rewrites, and long-cycle initiatives.",
      pause: { verb: "Pause expansion bets", join: "or", conditions: [riskPauseLine, tightnessPauseLine] },
      resume: { verb: "Resume in tranches", join: "and", conditions: [riskResumeLine, tightnessResumeLine] },
      rationale: "Expansion should scale with validated window strength, not optimism.",
    },
  };

  return areaOrder.map((area) => withDerivedTriggers(rulesByArea[area]));
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

const MIN_BOUNDARY_GAP = 0.1;

const describeBoundaryGap = ({
  dimension,
  gap,
  whenNearBoundary,
  whenAway,
}: {
  dimension: string;
  gap: number;
  whenNearBoundary: (dimension: string) => string;
  whenAway: (formattedGap: string) => string;
}) => {
  if (!Number.isFinite(gap) || gap <= 0.05) {
    return whenNearBoundary(dimension);
  }

  return whenAway(Math.max(MIN_BOUNDARY_GAP, gap).toFixed(1));
};

export const buildScopedVariantDecisionAdjustment = ({
  mode,
  thresholds,
  scores,
}: Pick<RuleContext, "thresholds" | "scores"> & { mode: StartupVariantMode }): ScopedVariantDecisionAdjustment => {
  const riskGap = Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime);
  const tightnessGap = Math.abs(scores.tightness - thresholds.tightnessRegime);

  if (mode === "seed") {
    return {
      mode,
      label: "Seed",
      description: "Protect runway while preserving rapid proof loops.",
      doNowAdjustments: [
        "Prioritize experiments that can prove customer pull inside one sprint.",
        "Keep hiring decisions tied to milestone unlocks or direct revenue coverage.",
      ],
      avoidAdjustments: [
        "Avoid bundling multiple irreversible hires before one milestone clears.",
      ],
      watchAdjustments: [
        describeBoundaryGap({
          dimension: "tightness",
          gap: tightnessGap,
          whenNearBoundary: () => "Runway trigger: tighten immediately because funding pressure is already at the regime boundary.",
          whenAway: (formattedGap) => `Runway trigger: tighten immediately if funding pressure gap compresses below ${formattedGap} points for 2 reads.`,
        }),
      ],
      thresholdEmphasis: "Emphasize runway and evidence cadence over growth breadth.",
      reversalTriggerDiscipline: "Reverse to faster hiring only after two consecutive improving reads and one shipped traction milestone.",
    };
  }

  if (mode === "series-a") {
    return {
      mode,
      label: "Series A",
      description: "Balance growth tempo with repeatability proof.",
      doNowAdjustments: [
        "Scale GTM and product bets only where activation and retention targets are tracking.",
      ],
      avoidAdjustments: [
        "Avoid parallel expansion programs that obscure payback accountability.",
      ],
      watchAdjustments: [
        describeBoundaryGap({
          dimension: "risk appetite",
          gap: riskGap,
          whenNearBoundary: () => "Payback trigger: revisit plan now because risk appetite is already at the regime boundary.",
          whenAway: (formattedGap) => `Payback trigger: revisit plan if risk appetite gap moves inside ${formattedGap} points.`,
        }),
      ],
      thresholdEmphasis: "Emphasize payback windows and repeatable pipeline conversion.",
      reversalTriggerDiscipline: "Reverse to aggressive expansion only after trigger clears and conversion quality remains stable for two weekly reviews.",
    };
  }

  if (mode === "series-b") {
    return {
      mode,
      label: "Series B",
      description: "Protect operating leverage while preserving selective scale lanes.",
      doNowAdjustments: [
        "Concentrate approvals on lanes with measurable margin or efficiency lift this quarter.",
      ],
      avoidAdjustments: [
        "Avoid fixed-cost expansions that assume forward multiple recovery.",
      ],
      watchAdjustments: [
        describeBoundaryGap({
          dimension: "tightness",
          gap: tightnessGap,
          whenNearBoundary: () => "Leverage trigger: hold expansion now because funding pressure is already at the regime boundary.",
          whenAway: (formattedGap) => `Leverage trigger: hold expansion if funding pressure rises within ${formattedGap} points of the boundary.`,
        }),
      ],
      thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
      reversalTriggerDiscipline: "Reverse to broader scaling only when both risk appetite and funding pressure clear their resume bands in the same week.",
    };
  }

  if (mode === "growth") {
    return {
      mode,
      label: "Growth",
      description: "Scale durable GTM and platform leverage without losing unit discipline.",
      doNowAdjustments: [
        "Concentrate scale on channels with proven CAC payback inside the planning window.",
      ],
      avoidAdjustments: [
        "Avoid top-line-first expansions that outrun support and margin readiness.",
      ],
      watchAdjustments: [
        describeBoundaryGap({
          dimension: "risk appetite",
          gap: riskGap,
          whenNearBoundary: () => "Growth trigger: rephase expansion now because risk appetite is already at the regime boundary.",
          whenAway: (formattedGap) => `Growth trigger: rephase expansion if risk appetite moves inside ${formattedGap} points.`,
        }),
      ],
      thresholdEmphasis: "Emphasize CAC payback, retention durability, and support capacity before adding fixed cost.",
      reversalTriggerDiscipline: "Reverse to faster scaling only after risk appetite and conversion efficiency both improve for two weekly reads.",
    };
  }

  if (mode === "public") {
    return {
      mode,
      label: "Public",
      description: "Prioritize earnings resilience and guided execution consistency.",
      doNowAdjustments: [
        "Bias capital allocation toward initiatives with near-term margin and cash-flow reliability.",
      ],
      avoidAdjustments: [
        "Avoid guidance-risk programs that depend on optimistic macro re-rating.",
      ],
      watchAdjustments: [
        describeBoundaryGap({
          dimension: "tightness",
          gap: tightnessGap,
          whenNearBoundary: () => "Guidance trigger: tighten discretionary spend now because funding pressure is already at the regime boundary.",
          whenAway: (formattedGap) => `Guidance trigger: tighten discretionary spend if funding pressure closes inside ${formattedGap} points.`,
        }),
      ],
      thresholdEmphasis: "Emphasize earnings durability, cash conversion, and guidance credibility.",
      reversalTriggerDiscipline: "Reverse to broader spend only when boundary pressure eases and guidance confidence improves in tandem.",
    };
  }

  return {
    mode,
    label: "Bootstrapped",
    description: "Maximize cash durability and compounding customer value.",
    doNowAdjustments: [
      "Prioritize self-funded growth loops with near-term cash payback.",
      "Sequence investments so each tranche can be paused without operational breakage.",
    ],
    avoidAdjustments: [
      "Avoid commitments that require external financing to finish.",
    ],
    watchAdjustments: [
      describeBoundaryGap({
        dimension: "a boundary",
        gap: Math.min(riskGap, tightnessGap),
        whenNearBoundary: () => "Cash trigger: tighten spend now because at least one boundary is already at the regime threshold.",
        whenAway: (formattedGap) => `Cash trigger: tighten spend if either boundary sits within ${formattedGap} points.`,
      }),
    ],
    thresholdEmphasis: "Emphasize cash conversion and reversible commitments over growth optics.",
    reversalTriggerDiscipline: "Reverse to higher spend only after cash payback proof holds for two consecutive weekly reads.",
  };
};
