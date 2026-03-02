import type { RegimeAssessment } from "./regimeEngine";

export type TeamContextProfile = {
  stage: "seed" | "series-a" | "growth" | "public";
  sector: "b2b-saas" | "consumer" | "infrastructure";
  teamSize: "small" | "mid" | "large";
};

const stageNudge = {
  seed: "Protect runway while preserving discovery velocity.",
  "series-a": "Prioritize repeatable GTM learning over broad expansion.",
  growth: "Scale proven loops while tightening operational discipline.",
  public: "Bias toward predictability and cross-functional execution reliability.",
} as const;

const sectorNudge = {
  "b2b-saas": "Anchor roadmap on retention and measurable payback.",
  consumer: "Favor habit-forming loops with low-cost experimentation.",
  infrastructure: "Emphasize reliability, migration safety, and platform trust.",
} as const;

const sizeNudge = {
  small: "Keep scope narrow and decision cycles weekly.",
  mid: "Codify guardrails and reduce cross-team dependency risk.",
  large: "Use explicit ownership boundaries and staged rollout gates.",
} as const;

export const buildPersonalizedMandate = (assessment: RegimeAssessment, profile: TeamContextProfile) => {
  const base = `Current regime: ${assessment.regime}. Tightness ${assessment.scores.tightness}/100 and risk appetite ${assessment.scores.riskAppetite}/100.`;

  return {
    headline: `${assessment.regime} mandate for ${profile.stage} ${profile.sector} teams`,
    recommendation: base,
    tailoredActions: [stageNudge[profile.stage], sectorNudge[profile.sector], sizeNudge[profile.teamSize]],
  };
};
