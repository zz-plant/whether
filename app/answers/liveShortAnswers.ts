import type { RegimeAssessment, RegimeThresholds } from "../../lib/regimeEngine";
import { answerPages, type DecisionPageDefinition } from "./decisionPages";

const safetyOverrides: Partial<Record<string, string>> = {
  "should-startups-hire-engineers-right-now": "In safety mode, hire only mission-critical roles; pause expansion hiring until role payback is proven within one quarter.",
  "is-it-risk-on-or-risk-off-for-startups": "Current posture is safety mode; tighten approval velocity and keep irreversible commitments paused until thresholds recover.",
  "when-should-startups-cut-burn": "Cut burn now if runway depends on discretionary spend; restore only after two consecutive reads show tighter-risk thresholds have recovered.",
  "product-strategy-during-expansion": "In safety mode, protect core retention and pause expansion roadmap work until both risk appetite and tightness recover.",
  "when-to-expand-startup-hiring": "In safety mode, hold hiring expansion and fill only reliability or near-term revenue roles until thresholds hold for two consecutive reads.",
  "should-startups-slow-product-development": "In safety mode, keep core delivery moving while pausing speculative scope; re-open only after threshold recovery persists.",
  "should-startups-raise-capital-now": "In safety mode, raise only to protect runway certainty; revisit timing after two consecutive supportive threshold reads.",
};

export const isExpansionRegime = (regime: RegimeAssessment["regime"]) => regime === "EXPANSION";

const buildSafetyModeAnswer = (
  page: DecisionPageDefinition,
  thresholds?: Pick<RegimeThresholds, "riskAppetiteRegime" | "tightnessRegime">,
): string => {
  const thresholdGate = thresholds
    ? `Tighten if risk appetite < ${thresholds.riskAppetiteRegime.toFixed(0)} or tightness > ${thresholds.tightnessRegime.toFixed(0)}.`
    : "Tighten on weaker risk appetite or rising tightness.";

  if (page.category === "climate") {
    return `Current posture is safety mode. ${thresholdGate} Resume faster approvals only after two consecutive supportive reads.`;
  }

  if (page.category === "explanation") {
    return `In safety mode, favor reversible commitments and explicit stop rules. ${thresholdGate} Reverse only after two consecutive supportive reads.`;
  }

  return `In safety mode, keep decisions reversible with named pause and resume triggers. ${thresholdGate} Re-open expansion only after two consecutive supportive reads.`;
};

export const buildLiveShortAnswer = (
  slug: string,
  assessment: {
    regime: RegimeAssessment["regime"];
    thresholds: Pick<RegimeThresholds, "riskAppetiteRegime" | "tightnessRegime">;
  },
  fallback: string,
) => {
  const page = answerPages.find((item) => item.slug === slug);
  if (!page) return fallback;
  if (!isExpansionRegime(assessment.regime)) {
    return (safetyOverrides[slug] as string | undefined) ?? buildSafetyModeAnswer(page, assessment.thresholds);
  }

  return page.shortAnswer;
};
