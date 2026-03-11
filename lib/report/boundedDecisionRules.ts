import type { RegimeKey } from "../regimeEngine";

export type DecisionArea = "hiring" | "product-tempo" | "capital-raising" | "burn-discipline" | "expansion-bets";

export type BoundedDecisionRule = {
  area: DecisionArea;
  recommendation: string;
  doNow: string[];
  avoidNow: string[];
  scope: string;
  pauseTrigger: string;
  resumeTrigger: string;
  rationale: string;
};

export type StartupVariantMode = "seed" | "series-a" | "series-b" | "bootstrapped";

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
      scope: `Applies to all net-new headcount; current tightness ${fmt(scores.tightness)} and risk appetite ${fmt(scores.riskAppetite)}.`,
      pauseTrigger: `Pause net-new hiring if tightness > ${fmt(tightnessPause)} or risk appetite < ${fmt(riskPause)}.`,
      resumeTrigger: `Resume staged approvals when tightness < ${fmt(tightnessResume)} and risk appetite > ${fmt(riskResume)}.`,
      rationale: "Protect delivery capacity without locking in irreversible fixed-cost growth.",
    },
    "product-tempo": {
      area: "product-tempo",
      recommendation: isExpansion
        ? "Increase product tempo for reversible bets tied to activation/retention milestones."
        : "Protect core roadmap; slow long-payback roadmap expansions.",
      doNow: isExpansion
        ? ["Increase tempo on reversible bets tied to activation and retention milestones."]
        : ["Protect core roadmap tempo and prioritize near-term customer value slices."],
      avoidNow: isExpansion
        ? ["Avoid irreversible scope expansion before milestone evidence confirms traction."]
        : ["Avoid long-payback roadmap expansions with weak near-term proof."],
      scope: "Roadmap sequencing, release scope, and experimentation cadence.",
      pauseTrigger: `Pause long-payback bets if risk appetite < ${fmt(riskPause)} or two consecutive weaker weekly reads print.`,
      resumeTrigger: `Resume tempo on deferred bets when risk appetite > ${fmt(riskResume)} and weekly direction stabilizes/improves.`,
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
      pauseTrigger: `Pause acceleration if risk appetite falls below ${fmt(riskPause)} or tightness rises above ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume full process when risk appetite > ${fmt(riskResume)} and tightness < ${fmt(tightnessResume)}.`,
      rationale: "Timing the process around signal windows improves optionality and reduces forced terms.",
    },
    "burn-discipline": {
      area: "burn-discipline",
      recommendation: "Keep discretionary spend gated by measurable short-cycle payback.",
      doNow: ["Gate discretionary spend by measurable short-cycle payback proof."],
      avoidNow: ["Avoid multi-quarter spend commitments without clear payback evidence."],
      scope: "Hiring, vendor, and GTM program spend with multi-quarter commitments.",
      pauseTrigger: `Pause discretionary burn expansion if tightness > ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume controlled burn expansion when tightness < ${fmt(tightnessResume)} and budget payback proof is intact.`,
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
      pauseTrigger: `Pause expansion bets if risk appetite < ${fmt(riskPause)} or tightness > ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume in tranches when risk appetite > ${fmt(riskResume)} and tightness < ${fmt(tightnessResume)}.`,
      rationale: "Expansion should scale with validated window strength, not optimism.",
    },
  };

  return areaOrder.map((area) => rulesByArea[area]);
};

export const formatActionStripThresholdText = (rule: Pick<BoundedDecisionRule, "pauseTrigger">) => rule.pauseTrigger;

export const formatActionStripReversalText = (rule: Pick<BoundedDecisionRule, "resumeTrigger">) => rule.resumeTrigger;

export const startupVariantModes: Array<{ mode: StartupVariantMode; label: string }> = [
  { mode: "seed", label: "Seed" },
  { mode: "series-a", label: "Series A" },
  { mode: "series-b", label: "Series B" },
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
          whenNearBoundary: () => "Runway trigger: tighten immediately because tightness is already at the regime boundary.",
          whenAway: (formattedGap) => `Runway trigger: tighten immediately if tightness gap compresses below ${formattedGap} points for 2 reads.`,
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
          whenNearBoundary: () => "Leverage trigger: hold expansion now because tightness is already at the regime boundary.",
          whenAway: (formattedGap) => `Leverage trigger: hold expansion if tightness rises within ${formattedGap} points of the boundary.`,
        }),
      ],
      thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
      reversalTriggerDiscipline: "Reverse to broader scaling only when both risk appetite and tightness clear their resume bands in the same week.",
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
