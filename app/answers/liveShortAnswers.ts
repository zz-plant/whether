import type { RegimeKey } from "../../lib/regimeEngine";
import { answerPages, type DecisionPageDefinition } from "./decisionPages";

const safetyOverrides: Partial<Record<string, string>> = {
  "should-startups-hire-engineers-right-now": "In safety mode, limit hiring to mission-critical roles with immediate payoff.",
  "is-it-risk-on-or-risk-off-for-startups": "Current posture is safety mode; tighten approval velocity.",
  "when-should-startups-cut-burn": "Cut burn now if your liquidity runway depends on discretionary spend expansion.",
};

export const isExpansionRegime = (regime: RegimeKey) => regime === "EXPANSION";

const buildSafetyModeAnswer = (page: DecisionPageDefinition): string => {
  if (page.category === "climate") {
    return "Current posture is safety mode; tighten approval velocity until thresholds recover.";
  }

  if (page.category === "explanation") {
    return "In safety mode, tighten thresholds and favor reversible commitments over long-cycle bets.";
  }

  return "In safety mode, keep decisions reversible and enforce stricter spend and hiring gates.";
};

export const buildLiveShortAnswer = (slug: string, regime: RegimeKey, fallback: string) => {
  const page = answerPages.find((item) => item.slug === slug);
  if (!page) return fallback;
  if (!isExpansionRegime(regime)) {
    return (safetyOverrides[slug] as string | undefined) ?? buildSafetyModeAnswer(page);
  }

  return page.shortAnswer;
};
