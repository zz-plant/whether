/**
 * Weekly summary builder for copy-ready guidance and API payloads.
 * Keeps weekly action copy consistent across UI and shared endpoints.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { buildComplianceStamp } from "../exportNotices";

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
      "Anchor the roadmap to runway protection and near-term ROI",
      "Cut bets that depend on external sentiment improving",
      "Use reversible releases and staged commitments by default",
    ],
    safeBets: [
      "Retention, expansion, and monetization for existing users",
      "Reliability, trust, and cost-to-serve improvements",
      "Features with payback in under 6 months",
    ],
    failureModes: [
      "Adding headcount before revenue is committed",
      "Starting long-horizon platform rewrites",
      "Running experiments that weaken short-term cash flow",
    ],
    planningQuote:
      "“Prioritize short-payback, reversible work and stop expansion bets that raise burn or depend on a rebound in risk appetite.”",
  },
  DEFENSIVE: {
    climateLabel: "⚠️ RISK-SELECTIVE / CAPITAL-TIGHT",
    climateSummary: [
      "Capital is expensive, but risk appetite is selective rather than frozen.",
      "Expect tighter ROI gates and a focus on efficiency over growth-at-any-price.",
    ],
    productMeaning: [
      "Run a tighter portfolio with fewer bets and explicit payback",
      "Put retention and margin ahead of net-new expansion",
      "Release in stages with quarterly continuation checkpoints",
    ],
    safeBets: [
      "Retention, expansion, and pricing optimization",
      "Operational efficiency and cost-to-serve reductions",
      "Revenue protection features with fast payback",
    ],
    failureModes: [
      "Running low-leverage experiments without clear monetization",
      "Growing headcount before unit economics are proven",
      "Pushing aggressive expansions that dilute focus",
    ],
    planningQuote:
      "“Commit to efficiency-first bets that improve retention and margins, and enforce explicit payback gates on every expansion proposal.”",
  },
  VOLATILE: {
    climateLabel: "⚠️ RISK-OFF / CAPITAL-LOOSE",
    climateSummary: [
      "Capital is available, but risk tolerance is muted.",
      "Expect buyers to favor reliability and proof over novelty.",
    ],
    productMeaning: [
      "De-risk the roadmap with reliability and trust investments",
      "Avoid disruptive changes that unsettle cautious buyers",
      "Launch in reversible stages with clear rollback paths",
    ],
    safeBets: [
      "Reliability, security, and trust improvements",
      "Retention programs and conversion cleanup",
      "Payback-positive enhancements to core workflows",
    ],
    failureModes: [
      "Shipping flashy launches before value is proven",
      "Attempting broad rebrands or UX overhauls",
      "Running experiments that erode short-term revenue confidence",
    ],
    planningQuote:
      "“Lead with reliability and evidence, and keep launches reversible until buyer confidence strengthens.”",
  },
  EXPANSION: {
    climateLabel: "✅ RISK-ON / CAPITAL-LOOSE",
    climateSummary: [
      "Capital is accessible and risk appetite is healthy.",
      "Expect faster approvals and higher tolerance for bold bets.",
    ],
    productMeaning: [
      "Prioritize speed and distribution over perfection",
      "Scale proven growth channels and widen market coverage",
      "Move decisively while enforcing payback guardrails",
    ],
    safeBets: [
      "Growth experiments with clear scaling paths",
      "New market expansion backed by demand signals",
      "Product investments that amplify acquisition",
    ],
    failureModes: [
      "Over-optimizing cost at the expense of momentum",
      "Delaying launches while waiting for perfect data",
      "Under-investing in capacity while demand is strong",
    ],
    planningQuote:
      "“Move quickly on growth bets, maintain payback discipline, and set clear exit criteria before scaling spend.”",
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
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: provenance.statusLabel,
  });
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
    "RECOMMENDED MOVES FOR PRODUCT TEAMS (NOW)",
    "",
    ...template.productMeaning,
    "",
    "",
    "",
    "---",
    "",
    "EXECUTION PRIORITIES THAT TRAVEL WELL",
    "",
    ...template.safeBets,
    "",
    "",
    "",
    "---",
    "",
    "WATCHOUTS THAT BREAK EXECUTION",
    "",
    ...template.failureModes,
    "",
    "",
    "",
    "---",
    "",
    "PLANNING LANGUAGE TO USE",
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
    "RECOMMENDATION CONFIDENCE",
    "",
    `Confidence: ${provenance.statusLabel}`,
    "Uncertainty: Interpretive and probabilistic guidance; verify assumptions before acting.",
    "",
    "",
    "---",
    "",
    "DATA PROVENANCE & QUALITY",
    "",
    `Source: ${sourceLine}`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    "",
    ...complianceStamp,
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
