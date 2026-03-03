/**
 * Weekly summary builder for copy-ready guidance and API payloads.
 * Keeps weekly action copy consistent across UI and shared endpoints.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeOperatorLabel } from "../regimeLabels";
import { renderWeeklySummaryCopy } from "./summaryCopyRenderer";

import type { SummaryProvenance, WeeklyStructured } from "./summaryTypes";

export type WeeklySummaryProvenance = SummaryProvenance;
export type { WeeklyStructured } from "./summaryTypes";

export type WeeklySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  confidence: RegimeAssessment["diagnostics"]["confidence"];
  transitionWatch: boolean;
  intensity: RegimeAssessment["diagnostics"]["intensity"];
  constraints: string[];
  recordDateLabel: string | null;
  provenance: WeeklySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  structured: WeeklyStructured;
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

export const getWeeklyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  weeklyActionGuidance[regime];


export const buildWeeklyStructured = ({
  regime,
  constraints,
  governanceParameters,
}: {
  regime: RegimeAssessment["regime"];
  constraints: string[];
  governanceParameters: RegimeAssessment["policyAssessment"]["governanceParameters"];
}): WeeklyStructured => {
  const template = weeklyOutputTemplates[regime];

  return {
    climate: {
      label: template.climateLabel,
      summary: template.climateSummary,
    },
    recommendedMoves: template.productMeaning,
    executionPriorities: template.safeBets,
    watchouts: template.failureModes,
    planningLanguage: template.planningQuote,
    executionConstraints: constraints,
    governanceParameters: {
      hiringThreshold: governanceParameters.hiringThreshold,
      paybackWindowTolerance: governanceParameters.paybackWindowTolerance,
      rollbackRequirement: governanceParameters.rollbackRequirement,
      approvalVelocity: governanceParameters.approvalVelocity,
      expansionScope: governanceParameters.expansionScope,
      experimentationTolerance: governanceParameters.experimentationTolerance,
    },
  };
};

export const buildWeeklySummary = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: WeeklySummaryProvenance;
  recordDateLabel?: string;
}): WeeklySummary => {
  const regimeLabel = getRegimeOperatorLabel(assessment.regime);
  const guidance = getWeeklyActionGuidance(assessment.regime);
  const transitionCue = assessment.diagnostics.transitionWatch
    ? " Signals are near a regime boundary; tighten review cadence before expanding commitments."
    : "";
  const summary = `${regimeLabel} posture: ${assessment.description} Priority: ${guidance}. Confidence: ${assessment.diagnostics.confidence.toLowerCase()} (${assessment.diagnostics.intensity.toLowerCase()} signal).${transitionCue}`;
  const title = recordDateLabel
    ? `Weekly action summary — ${recordDateLabel}`
    : "Weekly action summary";
  const structured = buildWeeklyStructured({
    regime: assessment.regime,
    constraints: assessment.constraints,
    governanceParameters: assessment.policyAssessment.governanceParameters,
  });
  const copy = renderWeeklySummaryCopy({
    title,
    summary,
    recordDateLabel,
    provenance,
    structured,
  });

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    confidence: assessment.diagnostics.confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
    intensity: assessment.diagnostics.intensity,
    constraints: assessment.constraints,
    recordDateLabel: recordDateLabel ?? null,
    provenance,
    inputs: assessment.inputs,
    structured,
    copy,
  };
};
