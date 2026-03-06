import type { RegimeKey } from "../regimeEngine";

export type DecisionArea = "hiring" | "product-tempo" | "capital-raising" | "burn-discipline" | "expansion-bets";

export type BoundedDecisionRule = {
  area: DecisionArea;
  recommendation: string;
  scope: string;
  pauseTrigger: string;
  resumeTrigger: string;
  rationale: string;
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

const fmt = (value: number) => value.toFixed(0);

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
      scope: "Fundraising launch timing, process pacing, and minimum term quality.",
      pauseTrigger: `Pause acceleration if risk appetite falls below ${fmt(riskPause)} or tightness rises above ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume full process when risk appetite > ${fmt(riskResume)} and tightness < ${fmt(tightnessResume)}.`,
      rationale: "Timing the process around signal windows improves optionality and reduces forced terms.",
    },
    "burn-discipline": {
      area: "burn-discipline",
      recommendation: "Keep discretionary spend gated by measurable short-cycle payback.",
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
      scope: "New market launches, major platform rewrites, and long-cycle initiatives.",
      pauseTrigger: `Pause expansion bets if risk appetite < ${fmt(riskPause)} or tightness > ${fmt(tightnessPause)}.`,
      resumeTrigger: `Resume in tranches when risk appetite > ${fmt(riskResume)} and tightness < ${fmt(tightnessResume)}.`,
      rationale: "Expansion should scale with validated window strength, not optimism.",
    },
  };

  return areaOrder.map((area) => rulesByArea[area]);
};
