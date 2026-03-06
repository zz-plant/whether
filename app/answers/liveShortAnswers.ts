import type { RegimeKey } from "../../lib/regimeEngine";
import { answerPages } from "./decisionPages";

const safetyOverrides: Partial<Record<string, string>> = {
  "should-startups-hire-engineers-right-now": "In safety mode, limit hiring to mission-critical roles with immediate payoff.",
  "is-it-risk-on-or-risk-off-for-startups": "Current posture is safety mode; tighten approval velocity.",
  "when-should-startups-cut-burn": "Cut burn now if your liquidity runway depends on discretionary spend expansion.",
};

export const isExpansionRegime = (regime: RegimeKey) => regime === "EXPANSION";

export const buildLiveShortAnswer = (slug: string, regime: RegimeKey, fallback: string) => {
  const page = answerPages.find((item) => item.slug === slug);
  if (!page) return fallback;
  if (!isExpansionRegime(regime) && safetyOverrides[slug]) return safetyOverrides[slug] as string;
  return page.shortAnswer;
};
