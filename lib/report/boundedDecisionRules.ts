import type { RegimeKey } from "../regimeEngine";
import {
  extractCompactClause as extractCompactClauseFromFormatting,
  formatDecisionAction,
  formatDecisionReversal,
  formatDecisionThreshold,
  formatDecisionTriplet,
} from "./reportFormatting";

export type DecisionArea = "hiring" | "product-tempo" | "capital-raising" | "burn-discipline" | "expansion-bets";

export type BoundedDecisionRule = {
  area: DecisionArea;
  recommendation: string;
  doNow: string[];
  avoidNow: string[];
  scope: string;
  /** Maps to UI label "Threshold" — the condition that triggers a pause */
  pauseTrigger: string;
  /** Maps to UI label "Reversal" — the condition that clears the pause */
  resumeTrigger: string;
  /** Additional conditions that would flip the regime/decision */
  flipConditions: Array<{
    metric: "tightness" | "riskAppetite";
    operator: ">" | ">=" | "<" | "<=";
    value: number;
    label: string;
  }>;
  rationale: string;
};

export type StartupVariantMode = "seed" | "series-a" | "series-b" | "growth" | "public" | "bootstrapped";

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

const fmt = (value: number) => {
  if (Math.abs(value) < 10 || !Number.isInteger(value)) {
    return value.toFixed(1);
  }

  return value.toFixed(0);
};

export const buildCanonicalBoundedDecisionRules = ({ regime, thresholds, scores }: RuleContext): BoundedDecisionRule[] => {
  const isExpansion = regime === "EXPANSION";
  const tightnessPause = thresholds.tightnessRegime + 6;
  const tightnessResume = Math.max(thresholds.tightnessRegime - 4, 0);
  const riskPause = Math.max(thresholds.riskAppetiteRegime - 6, 0);
  const riskResume = Math.min(thresholds.riskAppetiteRegime + 4, 100);

  const rulesByArea: Record<DecisionArea, BoundedDecisionRule> = {
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
      scope: `Applies to all net-new headcount; current cash availability ${fmt(scores.tightness)} and risk appetite ${fmt(scores.riskAppetite)}.`,
      pauseTrigger: `Pause net-new hiring if cash availability tightens above ${fmt(tightnessPause)} or risk appetite falls below ${fmt(riskPause)}.`,
      resumeTrigger: `Resume staged approvals when cash availability eases below ${fmt(tightnessResume)} and risk appetite is above ${fmt(riskResume)}.`,
      flipConditions: [
        { metric: "tightness", operator: "<", value: tightnessResume, label: `Cash availability < ${fmt(tightnessResume)}` },
        { metric: "riskAppetite", operator: ">", value: riskResume, label: `Risk appetite > ${fmt(riskResume)}` },
      ],
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
      pauseTrigger: `Pause long-payback bets if risk appetite falls below ${fmt(riskPause)} or two consecutive weaker weekly reads print.`,
      resumeTrigger: `Resume tempo on deferred bets when risk appetite is above ${fmt(riskResume)} and weekly direction stabilizes or improves.`,
      flipConditions: [
        { metric: "riskAppetite", operator: ">", value: riskResume, label: `Risk appetite > ${fmt(riskResume)}` },
      ],
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
      pauseTrigger: `Pause acceleration if risk appetite falls below ${fmt(riskPause)} or cash availability tightens above ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume full process when risk appetite is above ${fmt(riskResume)} and cash availability eases below ${fmt(tightnessResume)}.`,
      flipConditions: [
        { metric: "riskAppetite", operator: ">", value: riskResume, label: `Risk appetite > ${fmt(riskResume)}` },
        { metric: "tightness", operator: "<", value: tightnessResume, label: `Cash availability < ${fmt(tightnessResume)}` },
      ],
      rationale: "Timing the process around signal windows improves optionality and reduces forced terms.",
    },
    "burn-discipline": {
      area: "burn-discipline",
      recommendation: "Keep discretionary spend gated by measurable short-cycle payback.",
      doNow: ["Gate discretionary spend by measurable short-cycle payback proof."],
      avoidNow: ["Avoid multi-quarter spend commitments without clear payback evidence."],
      scope: "Hiring, vendor, and GTM program spend with multi-quarter commitments.",
      pauseTrigger: `Pause discretionary burn expansion if cash availability tightens above ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume controlled burn expansion when cash availability eases below ${fmt(tightnessResume)} and budget payback proof is intact.`,
      flipConditions: [
        { metric: "tightness", operator: "<", value: tightnessResume, label: `Cash availability < ${fmt(tightnessResume)}` },
      ],
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
      pauseTrigger: `Pause expansion bets if risk appetite falls below ${fmt(riskPause)} or cash availability tightens above ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume in tranches when risk appetite is above ${fmt(riskResume)} and cash availability eases below ${fmt(tightnessResume)}.`,
      flipConditions: [
        { metric: "riskAppetite", operator: ">", value: riskResume, label: `Risk appetite > ${fmt(riskResume)}` },
        { metric: "tightness", operator: "<", value: tightnessResume, label: `Cash availability < ${fmt(tightnessResume)}` },
      ],
      rationale: "Expansion should scale with validated window strength, not optimism.",
    },
  };

  return areaOrder.map((area) => rulesByArea[area]);
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
          whenNearBoundary: () => "Runway trigger: tighten immediately because cash availability is already at the regime boundary.",
          whenAway: (formattedGap) => `Runway trigger: tighten immediately if cash availability gap compresses below ${formattedGap} points for 2 reads.`,
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
          whenNearBoundary: () => "Leverage trigger: hold expansion now because cash availability is already at the regime boundary.",
          whenAway: (formattedGap) => `Leverage trigger: hold expansion if cash availability rises within ${formattedGap} points of the boundary.`,
        }),
      ],
      thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
      reversalTriggerDiscipline: "Reverse to broader scaling only when both risk appetite and cash availability clear their resume bands in the same week.",
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
          whenNearBoundary: () => "Guidance trigger: tighten discretionary spend now because cash availability is already at the regime boundary.",
          whenAway: (formattedGap) => `Guidance trigger: tighten discretionary spend if cash availability closes inside ${formattedGap} points.`,
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
