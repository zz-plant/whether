import type { DecisionKnob } from "./decisionKnobs";

export type DecisionArea =
  | "hiring"
  | "product-tempo"
  | "capital-raising"
  | "burn-discipline"
  | "expansion-bets";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type AssessmentInput = {
  regime: Regime;
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
  scores: { tightness: number; riskAppetite: number };
};

type RuleBuildInput = {
  assessment: AssessmentInput;
  decisionKnobs: DecisionKnob[];
  directionLabel?: "improving" | "deteriorating" | "mixed" | "stable";
};

export type BoundedDecisionRule = {
  area: DecisionArea;
  title: string;
  recommendation: string;
  scope: string;
  pauseTrigger: string;
  resumeTrigger: string;
  rationale: string;
};

const getKnob = (decisionKnobs: DecisionKnob[], key: DecisionKnob["key"]) =>
  decisionKnobs.find((knob) => knob.key === key);

export const buildBoundedDecisionRules = ({ assessment, decisionKnobs, directionLabel }: RuleBuildInput): BoundedDecisionRule[] => {
  const { tightnessRegime, riskAppetiteRegime } = assessment.thresholds;
  const { tightness, riskAppetite } = assessment.scores;
  const paybackKnob = getKnob(decisionKnobs, "payback");
  const experimentKnob = getKnob(decisionKnobs, "experimentTolerance");

  const paybackMap = [18, 14, 10, 8];
  const paybackMonths = paybackMap[paybackKnob?.value ?? 3];
  const improvementBias = directionLabel === "improving" ? "Momentum is improving, but keep triggers active." : "Signals remain mixed enough to require explicit stop/resume conditions.";

  const tighterHiringThreshold = Math.min(95, Math.round(tightnessRegime + 6));
  const saferHiringThreshold = Math.max(0, Math.round(tightnessRegime - 4));
  const riskOffThreshold = Math.max(0, Math.round(riskAppetiteRegime - 5));
  const riskOnThreshold = Math.min(100, Math.round(riskAppetiteRegime + 4));

  return [
    {
      area: "hiring",
      title: "Selective hiring for revenue-linked and reliability roles",
      recommendation:
        assessment.regime === "EXPANSION"
          ? "Add net-new roles only in revenue, reliability, and customer retention paths."
          : "Limit hiring to backfills and roles with direct revenue or reliability impact.",
      scope: `Applies to all teams while tightness is ${tightness.toFixed(0)} and risk appetite is ${riskAppetite.toFixed(0)}.`,
      pauseTrigger: `Pause expansion hiring if capital tightness > ${tighterHiringThreshold}.`,
      resumeTrigger: `Resume selective hiring when tightness < ${saferHiringThreshold} for two consecutive weekly reads.`,
      rationale: `${improvementBias} Hiring should follow proof of return, not sentiment.`,
    },
    {
      area: "product-tempo",
      title: "Tempo by payback horizon",
      recommendation: `Keep fast-feedback work moving; gate roadmap bets with expected payback > ${paybackMonths} months.`,
      scope: `Use for product planning and engineering commitments in the current ${assessment.regime.toLowerCase()} regime.`,
      pauseTrigger: `Slow long-payback product bets if risk appetite < ${riskOffThreshold}.`,
      resumeTrigger: `Resume staged long-horizon work when risk appetite > ${riskOnThreshold} and milestone evidence is met.`,
      rationale: `Decision knob for experiment tolerance is set to ${experimentKnob?.value ?? 0}/3, so tempo should protect reversibility.`,
    },
    {
      area: "capital-raising",
      title: "Raise proactively only while the window is open",
      recommendation:
        assessment.regime === "SCARCITY"
          ? "Start fundraising prep immediately and prioritize runway extension over valuation optimization."
          : "Raise from leverage if strategic uses are clear and execution is stable.",
      scope: "Applies to board planning, financing calendar, and major strategic commitments.",
      pauseTrigger: `Pause optional fundraising process launches if risk appetite < ${riskOffThreshold} and tightness > ${tighterHiringThreshold}.`,
      resumeTrigger: `Resume proactive process when risk appetite > ${riskAppetiteRegime.toFixed(0)} or tightness < ${tightnessRegime.toFixed(0)}.`,
      rationale: "Financing optionality is highest before macro constraints stack, not after.",
    },
    {
      area: "burn-discipline",
      title: "Protect burn durability",
      recommendation: "Keep discretionary spend tied to measurable 1–2 quarter outcomes and enforce approval gates.",
      scope: "Applies to vendor spend, net-new opex, and non-essential operating expansion.",
      pauseTrigger: `Cut burn immediately if tightness rises above ${tighterHiringThreshold} and risk appetite falls below ${riskOffThreshold}.`,
      resumeTrigger: `Loosen burn controls when tightness drops below ${tightnessRegime.toFixed(0)} and risk appetite exceeds ${riskAppetiteRegime.toFixed(0)}.`,
      rationale: "Burn discipline is the fastest lever to preserve strategic options through regime shifts.",
    },
    {
      area: "expansion-bets",
      title: "Reversible expansion bets only",
      recommendation: "Run expansion as staged experiments with explicit stop-loss checkpoints.",
      scope: "Use for new geos, channel expansions, and product-line adjacencies.",
      pauseTrigger: `Pause expansion bets if risk appetite < ${riskOffThreshold} or if any pilot misses checkpoint targets for 2 weeks.`,
      resumeTrigger: `Resume one expansion tranche at a time when risk appetite > ${riskOnThreshold} and checkpoints clear.`,
      rationale: "Expansion should compound conviction, not fixed cost.",
    },
  ];
};
