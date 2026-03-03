import type { RegimeKey } from "../../lib/regimeEngine";

const liveAnswerBySlug: Record<string, { expansion: string; safety: string }> = {
  "should-we-hire-engineers-right-now": {
    expansion: "Yes — but selectively and with ROI gates.",
    safety: "Slow net-new hiring; keep only mission-critical and ROI-proven roles open.",
  },
  "is-it-a-good-time-to-hire-engineers": {
    expansion: "Yes for targeted roles; no for blanket growth hiring.",
    safety: "Not for broad growth hiring — prioritize only critical delivery roles.",
  },
  "should-startups-hire-right-now": {
    expansion: "Selective hiring is supported when demand proof is real.",
    safety: "Only maintain hiring tied to immediate revenue or reliability outcomes.",
  },
  "should-we-expand-our-team-in-2026": {
    expansion: "Expand in controlled increments with explicit rollback triggers.",
    safety: "Delay broad expansion and preserve flexibility until expansion signals return.",
  },
  "is-now-a-good-time-to-raise-venture-capital": {
    expansion: "Conditions are supportive, but raise from leverage — not urgency.",
    safety: "Prioritize runway protection and begin fundraising early with tighter terms expectations.",
  },
  "should-we-raise-funding-right-now": {
    expansion: "Raise if it extends strategic optionality and preserves execution speed.",
    safety: "Raise sooner to secure optionality before financing conditions tighten further.",
  },
  "startup-funding-climate-2026": {
    expansion: "Capital access is open with guardrails; quality signals still matter most.",
    safety: "Capital access is selective; durable traction and capital efficiency are required.",
  },
  "is-the-market-risk-on-or-risk-off-right-now": {
    expansion: "Current posture is expansion with guardrails.",
    safety: "Current posture is safety mode.",
  },
  "capital-tightness-right-now": {
    expansion: "Tightness is currently low, so near-term liquidity pressure is contained.",
    safety: "Tightness is elevated, so preserve liquidity and tighten discretionary spend.",
  },
  "should-we-slow-hiring-in-a-risk-off-market": {
    expansion: "No — maintain selective hiring while keeping trigger-based controls in place.",
    safety: "Yes — shift to critical backfills and ROI-proven roles when risk turns off.",
  },
};

export const isExpansionRegime = (regime: RegimeKey) => regime === "EXPANSION";

export const buildLiveShortAnswer = (slug: string, regime: RegimeKey, fallback: string) => {
  const liveAnswer = liveAnswerBySlug[slug];

  if (!liveAnswer) return fallback;

  return isExpansionRegime(regime) ? liveAnswer.expansion : liveAnswer.safety;
};

