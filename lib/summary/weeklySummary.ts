/**
 * Weekly summary builder for copy-ready guidance and API payloads.
 * Keeps weekly action copy consistent across UI and shared endpoints.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../regimePresentation";
import { joinSentences } from "../report/reportFormatting";
import { renderWeeklySummaryCopy } from "./summaryCopyRenderer";
import type { ConfidenceRecord } from "../report/confidence";
import {
  formatConditionsChangeLine,
  formatConfidenceSentence,
  resolveSummaryConfidence,
  SHOCK_CROSSING_CUE,
  type SummaryConfidence,
} from "./summaryFormatting";

import type { SummaryProvenance, WeeklyStructured } from "./summaryTypes";

type WeeklySummaryProvenance = SummaryProvenance;
export type { WeeklyStructured } from "./summaryTypes";

export type WeeklySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  stageLabel?: string;
  guidance: string;
  /** The published confidence (`resolveSummaryConfidence`), not the engine's confirmation gate. */
  confidence: SummaryConfidence;
  transitionWatch: boolean;
  /** The engine's band for how far the nearer score sits from its line, in raw points. Not a speed of movement. */
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
  VOLATILE: "balance experiments with safeguards, and keep spend approvals flexible",
  EXPANSION: "scale the highest-ROI bets, hire deliberately, and keep payback discipline",
};

/**
 * The expansion call when the financing read has saturated its own scale — the
 * base-rate component alone has hit its ceiling, meaning conditions are as tight
 * as the model can express while the quadrant still reads expansion. Publishing
 * "scale the highest-ROI bets" into that state is how the 2026 brief ended up
 * telling operators to move quickly while the posture layer said to freeze new
 * commitments. One bounded rule: saturation flips the tempo word, nothing else.
 */
const weeklyActionGuidanceSaturatedFinancing: Record<RegimeAssessment["regime"], string> = {
  ...weeklyActionGuidance,
  EXPANSION:
    "scale selectively inside proven demand lanes, and keep rollback criteria explicit",
};

/*
 * The paste's MARKET CLIMATE line, in the weather word and its one fact about
 * money (`REGIME_WEATHER_RATIONALES`). It printed the policy engine's codes —
 * "⚠️ RISK-OFF / CAPITAL-TIGHT" under a summary that opened "Freezing:" —
 * a second vocabulary for the same four states, in capitals the reader
 * vocabulary test could not see. The warning sign and the tick that led the
 * line went on 2026-10-09: the weather word already says which week it is.
 */
const climateLabelFor = (regime: RegimeAssessment["regime"]) =>
  `${getRegimePublicLabel(regime)}: ${getRegimeWeatherRationale(regime)}`;

const weeklyOutputTemplates: Record<RegimeAssessment["regime"], WeeklyOutputTemplate> = {
  SCARCITY: {
    climateLabel: climateLabelFor("SCARCITY"),
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
      "“Prioritize short-payback, reversible work and stop new bets that raise burn or depend on a rebound in risk appetite.”",
  },
  DEFENSIVE: {
    climateLabel: climateLabelFor("DEFENSIVE"),
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
    climateLabel: climateLabelFor("VOLATILE"),
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
    climateLabel: climateLabelFor("EXPANSION"),
    climateSummary: [
      "Capital is accessible and financing conditions are supportive.",
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

/**
 * The saturated-financing variant of the expansion template: same regime, same
 * constraints, one honest change of tempo. The financing read is at its ceiling
 * while the quadrant still says expansion, so the copy stops promising faster
 * approvals the conditions cannot support.
 */
const weeklyOutputTemplatesSaturatedFinancing: Record<RegimeAssessment["regime"], WeeklyOutputTemplate> = {
  ...weeklyOutputTemplates,
  EXPANSION: {
    ...weeklyOutputTemplates.EXPANSION,
    climateSummary: [
      weeklyOutputTemplates.EXPANSION.climateSummary[0],
      "Conditions are late-cycle, so approvals stay fast only inside proven demand lanes.",
    ],
    productMeaning: [
      "Scale selectively inside proven demand lanes before widening coverage",
      weeklyOutputTemplates.EXPANSION.productMeaning[1],
      weeklyOutputTemplates.EXPANSION.productMeaning[2],
    ],
  },
};

const getWeeklyActionGuidance = (
  regime: RegimeAssessment["regime"],
  options: { financingSaturated?: boolean } = {},
) =>
  options.financingSaturated
    ? weeklyActionGuidanceSaturatedFinancing[regime]
    : weeklyActionGuidance[regime];


export const buildWeeklyStructured = ({
  regime,
  constraints,
  governanceParameters,
  financingSaturated = false,
}: {
  regime: RegimeAssessment["regime"];
  constraints: string[];
  governanceParameters: RegimeAssessment["policyAssessment"]["governanceParameters"];
  /** Set when the financing read has saturated while the quadrant still reads
   *  expansion; swaps the expansion template to its selective-tempo variant. */
  financingSaturated?: boolean;
}): WeeklyStructured => {
  const template =
    financingSaturated
      ? weeklyOutputTemplatesSaturatedFinancing[regime]
      : weeklyOutputTemplates[regime];

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
  stageLabel,
  record,
}: {
  assessment: RegimeAssessment;
  provenance: WeeklySummaryProvenance;
  recordDateLabel?: string;
  stageLabel?: string;
  /** The record the reading came from, so a stale fallback lowers the published confidence. */
  record?: ConfidenceRecord | null;
}): WeeklySummary => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const confidence = resolveSummaryConfidence(assessment, record);
  const financingSaturated = assessment.scores.tightnessSaturated === true;
  const guidance = getWeeklyActionGuidance(assessment.regime, { financingSaturated });
  const transitionCue = assessment.diagnostics.transitionWatch
    ? "A score is sitting near the line where conditions change, so check again before expanding any commitment."
    : "";
  const shockCue = assessment.diagnostics.shockCrossing ? SHOCK_CROSSING_CUE : "";
  /* This led with "A policy override is holding the posture in place" and closed
     "until they reconcile": two retired engine names, and a "they" that had no
     antecedent when the reason was missing inputs rather than disagreeing scores.
     It now says what the hold does, in the guidance's own word, and when it ends. */
  const refusalCue = assessment.policyAssessment.refusal.refused
    ? joinSentences(
        "The guidance is not changing this week",
        assessment.policyAssessment.refusal.reasons[0]
          ?? "The signals disagree, or too many inputs are missing",
        "Keep new commitments reversible until the hold lifts",
      )
    : "";
  const stagedRegimeLabel = stageLabel ? `${regimeLabel} — ${stageLabel}` : regimeLabel;
  const summary = joinSentences(
    `${stagedRegimeLabel}: ${assessment.description}`,
    `The priority this week is to ${guidance}`,
    formatConfidenceSentence(confidence),
    formatConditionsChangeLine(assessment),
    transitionCue,
    shockCue,
    refusalCue,
  );
  const title = recordDateLabel
    ? `Weekly action summary — ${recordDateLabel}`
    : "Weekly action summary";
  const structured = buildWeeklyStructured({
    regime: assessment.regime,
    constraints: assessment.constraints,
    governanceParameters: assessment.policyAssessment.governanceParameters,
    financingSaturated: assessment.regime === "EXPANSION" && financingSaturated,
  });
  const copy = renderWeeklySummaryCopy({
    title,
    summary,
    recordDateLabel,
    confidence,
    provenance,
    structured,
  });

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    stageLabel,
    guidance,
    confidence,
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
