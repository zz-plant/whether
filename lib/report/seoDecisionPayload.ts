import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeProfile } from "../regimeEngine";
import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";
import type { ReportEvidenceItem } from "./reportData";
import { buildCompactTrustSummary, buildFailureModeWarnings, buildWeeklyCitationMetaLine } from "./trustStatus";
import { isSeoPageIndexEligible } from "./seoIndexEligibility";

export type SeoDecisionEvidence = {
  title: string;
  summary: string;
  confidenceLabel: string;
};

export type SeoDecisionPayload = {
  currentCall: string;
  immediateAction: string;
  triggerThreshold: string;
  reversalCondition: string;
  evidence: SeoDecisionEvidence[];
  freshness: string;
  degraded: boolean;
  noindex: boolean;
  noindexReasons?: string[];
  trustSummary: string;
  citationMeta: string;
};

export const buildSeoDecisionPayload = ({
  assessment,
  mappedRules,
  mappedDecisionAreas,
  fallbackCurrentCall,
  fallbackImmediateAction,
  reportEvidenceItems,
  freshnessLabel,
  recordDateLabel,
  confidenceLabel,
  transitionWatch,
  isFallbackSnapshot,
  provenanceStatusLabel,
  fetchedAtIso,
}: {
  assessment: Pick<RegimeAssessment, "regime" | "thresholds" | "scores">;
  mappedRules: BoundedDecisionRule[];
  mappedDecisionAreas: DecisionArea[];
  fallbackCurrentCall: string;
  fallbackImmediateAction: string;
  reportEvidenceItems: ReportEvidenceItem[];
  freshnessLabel: string;
  recordDateLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  transitionWatch: "ON" | "OFF";
  isFallbackSnapshot: boolean;
  provenanceStatusLabel?: string;
  fetchedAtIso?: string;
}): SeoDecisionPayload => {
  const primaryRule = mappedDecisionAreas
    .map((area) => mappedRules.find((rule) => rule.area === area))
    .find((rule): rule is BoundedDecisionRule => Boolean(rule));

  const evidence = reportEvidenceItems.slice(0, 3).map((item) => ({
    title: item.title,
    summary: item.immediateImplication,
    confidenceLabel: item.confidenceLabel,
  }));

  const failureWarnings = buildFailureModeWarnings({
    confidenceLabel,
    transitionWatch,
    freshnessLabel,
    isFallbackSnapshot,
    provenanceStatusLabel,
    changedSignals: [],
    anomalySignals: [],
  });

  const degraded = failureWarnings.some((warning) => warning.id === "stale-cached");
  const profile = getRegimeProfile(assessment.regime);

  const currentCall = primaryRule?.recommendation ?? `${fallbackCurrentCall} (${profile.description})`;
  const immediateAction = primaryRule?.doNow[0] ?? fallbackImmediateAction;
  const triggerThreshold =
    primaryRule?.pauseTrigger ??
    `Trigger tighter mode if risk appetite < ${assessment.thresholds.riskAppetiteRegime.toFixed(0)} or tightness > ${assessment.thresholds.tightnessRegime.toFixed(0)}.`;
  const reversalCondition =
    primaryRule?.resumeTrigger ??
    "Reverse only after two consecutive supportive reads and improved threshold distance.";

  const eligibility = isSeoPageIndexEligible({
    currentCall,
    immediateAction,
    triggerThreshold,
    reversalCondition,
    evidenceCount: evidence.length,
    fetchedAtIso,
    isFallbackSnapshot,
    provenanceStatusLabel,
  });

  return {
    currentCall,
    immediateAction,
    triggerThreshold,
    reversalCondition,
    evidence,
    freshness: freshnessLabel,
    degraded: degraded || !eligibility.eligible,
    noindex: !eligibility.eligible,
    noindexReasons: eligibility.reasons,
    trustSummary: buildCompactTrustSummary({
      confidenceLabel,
      freshnessLabel,
      isFallbackSnapshot,
    }),
    citationMeta: buildWeeklyCitationMetaLine({
      statusLabel: assessment.regime,
      confidenceLabel,
      recordDateLabel,
      freshnessLabel,
    }),
  };
};
