/**
 * Weekly summary builder for copy-ready guidance and API payloads.
 * Keeps weekly action copy consistent across UI and shared endpoints.
 */
import type { RegimeAssessment } from "../regimeEngine";

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
      "“This cycle, prioritize short-payback, reversible work and pause expansion bets that increase burn or depend on improved risk appetite.”",
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
      "“This cycle, run an efficiency-first portfolio: prioritize retention and margin gains, and require explicit payback gates before scaling scope.”",
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
      "“This cycle, lead with reliability and proof: ship reversible launches and scale only when buyer confidence and conversion data hold.”",
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
      "“This cycle, accelerate proven growth bets while holding payback discipline and explicit exit criteria for underperforming lanes.”",
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
  const summary = `${regimeLabel} posture: ${assessment.description} Priority: ${guidance}.`;
  const title = recordDateLabel
    ? `Weekly action summary — ${recordDateLabel}`
    : "Weekly action summary";
  const template = weeklyOutputTemplates[assessment.regime];
  const updatedLabel = recordDateLabel ? `Updated ${recordDateLabel}` : "Updated —";
  const sourceLine = provenance.sourceUrl
    ? `${provenance.sourceLabel} (${provenance.sourceUrl})`
    : provenance.sourceLabel;
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
    "PRIMARY MOVES THIS CYCLE",
    "",
    ...template.safeBets,
    "",
    "",
    "",
    "---",
    "",
    "COMMITMENTS TO AVOID THIS CYCLE",
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
    "EXECUTION CONSTRAINTS",
    "",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    "",
    "",
    "---",
    "",
    "PROVENANCE",
    "",
    `Source: ${sourceLine}`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    `Confidence: ${provenance.statusLabel}`,
    "",
    "",
    "",
    "---",
    "",
    "EXECUTION OWNERSHIP",
    "",
    "Owner: Product + Engineering lead",
    "Cadence: weekly review, monthly recommit",
    "Deadline: confirm this cycle's moves by Friday EOD",
    "",
    "",
    "",
    "---",
    "",
    "Actions:",
    "Copy for roadmap review Check a decision Export for board sync",
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
