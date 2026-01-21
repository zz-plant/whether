/**
 * Weekly summary builder for copy-ready guidance and API payloads.
 * Keeps weekly action copy consistent across UI and shared endpoints.
 */
import type { RegimeAssessment } from "./regimeEngine";

export type WeeklySummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type WeeklySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: WeeklySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  copy: string;
};

type WeeklyOutputTemplate = {
  climateLabel: string;
  climateSummary: string[];
  productMeaning: string[];
  safeBets: string[];
  failureModes: string[];
  planningQuote: string;
};

const weeklyActionGuidance: Record<RegimeAssessment["regime"], string> = {
  SCARCITY: "freeze discretionary scope, protect runway, and require proof before new bets",
  DEFENSIVE: "prioritize retention, tighten costs, and ship only revenue or reliability work",
  VOLATILE: "balance experiments with safeguards, and keep spend approvals reversible",
  EXPANSION: "scale the highest-ROI bets, hire deliberately, and keep payback discipline",
};

const weeklyOutputTemplates: Record<RegimeAssessment["regime"], WeeklyOutputTemplate> = {
  SCARCITY: {
    climateLabel: "⚠️ RISK-OFF / CAPITAL-TIGHT",
    climateSummary: [
      "Capital is expensive and risk tolerance is down.",
      "Assume slower approvals, tighter scrutiny, and low patience for long-horizon bets.",
    ],
    productMeaning: [
      "Optimize for runway and near-term ROI, not velocity",
      "Reduce exposure to bets that require external optimism",
      "Prefer reversible decisions and staged commitments",
    ],
    safeBets: [
      "Retention, expansion, and monetization of existing users",
      "Reliability, trust, and cost-to-serve improvements",
      "Features with payback < 6 months",
    ],
    failureModes: [
      "Headcount growth without committed revenue",
      "Long-horizon platform rewrites",
      "Experiments that reduce short-term cash flow",
    ],
    planningQuote:
      "“Given current market conditions, we should bias toward short-payback, reversible work and avoid expansion bets that increase burn or rely on improved risk appetite.”",
  },
  DEFENSIVE: {
    climateLabel: "⚠️ RISK-SELECTIVE / CAPITAL-TIGHT",
    climateSummary: [
      "Capital is expensive, but risk appetite is selective rather than frozen.",
      "Expect tighter ROI gates and a focus on efficiency over growth-at-any-price.",
    ],
    productMeaning: [
      "Run a tighter portfolio: fewer bets, clearer payback",
      "Prioritize retention and margin over net-new expansion",
      "Ship in staged commitments with checkpoints every quarter",
    ],
    safeBets: [
      "Retention, expansion, and pricing optimization",
      "Operational efficiency and cost-to-serve reductions",
      "Revenue protection features with fast payback",
    ],
    failureModes: [
      "Low-leverage experiments with unclear monetization",
      "Headcount growth without unit economics proof",
      "Aggressive expansions that dilute focus",
    ],
    planningQuote:
      "“Given current market conditions, we should focus on efficiency-first bets that improve retention and margins, with explicit payback gates.”",
  },
  VOLATILE: {
    climateLabel: "⚠️ RISK-OFF / CAPITAL-LOOSE",
    climateSummary: [
      "Capital is available, but risk tolerance is muted.",
      "Expect buyers to favor reliability and proof over novelty.",
    ],
    productMeaning: [
      "De-risk the roadmap with reliability and trust bets",
      "Avoid disruptive changes that spook cautious buyers",
      "Prioritize reversible launches and staged rollouts",
    ],
    safeBets: [
      "Reliability, security, and trust improvements",
      "Retention programs and conversion cleanup",
      "Payback-positive enhancements to core workflows",
    ],
    failureModes: [
      "Flashy launches without proof of value",
      "Broad rebrands or UX overhauls",
      "Experiments that reduce short-term revenue confidence",
    ],
    planningQuote:
      "“Given current market conditions, we should lead with reliability and evidence, keeping launches reversible until buyer confidence returns.”",
  },
  EXPANSION: {
    climateLabel: "✅ RISK-ON / CAPITAL-LOOSE",
    climateSummary: [
      "Capital is accessible and risk appetite is healthy.",
      "Expect faster approvals and higher tolerance for bold bets.",
    ],
    productMeaning: [
      "Prioritize speed and distribution over perfection",
      "Scale proven growth channels and expand market coverage",
      "Keep guardrails on payback, but move decisively",
    ],
    safeBets: [
      "Growth experiments with clear scaling paths",
      "New market expansion backed by demand signals",
      "Product investments that amplify acquisition",
    ],
    failureModes: [
      "Over-optimizing cost at the expense of momentum",
      "Delayed launches waiting for perfect data",
      "Under-investing in capacity while demand is strong",
    ],
    planningQuote:
      "“Given current market conditions, we should move quickly on growth bets while maintaining payback discipline and clear exit criteria.”",
  },
};

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Efficiency Mode";
    case "VOLATILE":
      return "Safety Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

export const getWeeklyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  weeklyActionGuidance[regime];

export const buildWeeklySummary = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: WeeklySummaryProvenance;
  recordDateLabel?: string;
}): WeeklySummary => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const guidance = getWeeklyActionGuidance(assessment.regime);
  const summary = `This week, operate in ${regimeLabel} mode: ${guidance}. ${assessment.description}`;
  const title = recordDateLabel
    ? `Weekly action summary — ${recordDateLabel}`
    : "Weekly action summary";
  const template = weeklyOutputTemplates[assessment.regime];
  const updatedLabel = recordDateLabel ? `Updated ${recordDateLabel}` : "Updated —";
  const copy = [
    "---",
    "WHETHER · Market Climate Station",
    "",
    updatedLabel,
    "",
    "",
    "---",
    "",
    "MARKET CLIMATE",
    "",
    template.climateLabel,
    "",
    ...template.climateSummary,
    "",
    "",
    "Contextual, not moral: this is what the environment is rewarding right now.",
    "",
    "",
    "---",
    "",
    "WHAT THIS MEANS FOR PRODUCT TEAMS (NOW)",
    "",
    ...template.productMeaning,
    "",
    "",
    "",
    "---",
    "",
    "SAFE BETS IN THIS CLIMATE",
    "",
    ...template.safeBets,
    "",
    "",
    "",
    "---",
    "",
    "LIKELY FAILURE MODES RIGHT NOW",
    "",
    ...template.failureModes,
    "",
    "",
    "",
    "---",
    "",
    "RECOMMENDED LANGUAGE FOR PLANNING",
    "",
    `> ${template.planningQuote}`,
    "",
    "",
    "",
    "---",
    "",
    "Actions:",
    "Copy for roadmap review Check a decision Why this verdict",
  ].join("\n");

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    constraints: assessment.constraints,
    recordDateLabel: recordDateLabel ?? null,
    provenance,
    inputs: assessment.inputs,
    copy,
  };
};
