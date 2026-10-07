import type { RegimeAssessment } from "../regimeEngine";
import { formatThresholdNumber } from "../formatters";
import { getRegimeProfile } from "./regimeDescription";
import { getRegimePublicLabel } from "../regimePresentation";
import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";
import type { ReportEvidenceItem } from "./reportData";
import { buildCompactTrustSummary, buildTrustWarnings, buildWeeklyCitationMetaLine } from "./trustStatus";
import { evaluateSeoQualityGates, type SeoQualitySiblingInput } from "./seoQualityGates";

type SeoDecisionEvidence = {
  title: string;
  summary: string;
  confidenceLabel: string;
};

export type SeoDecisionPayload = {
  pageKey?: string;
  /** What this page says, for sibling-uniqueness comparison. Optional because
   *  the programmatic payloads are persisted JSON written before this field
   *  existed; rebuild them through `buildAnswerInterpretationLabel` rather than
   *  reconstructing the string. */
  interpretationLabel?: string;
  currentCall: string;
  immediateAction: string;
  triggerThreshold: string;
  reversalCondition: string;
  evidence: SeoDecisionEvidence[];
  freshness: string;
  degraded: boolean;
  noindex: boolean;
  noindexReasons?: string[];
  qualityGates?: ReturnType<typeof evaluateSeoQualityGates>;
  trustSummary: string;
  citationMeta: string;
};

/**
 * The one definition of "what does this page say", used by the payload builder
 * and by the launch-readiness scorer.
 *
 * It was written out twice — here and in `lib/seo/answerLaunchReadiness.ts` —
 * so a page could be scored against one rule and published against another.
 */
export const buildAnswerInterpretationLabel = ({
  editorialAngle,
  currentCall,
  immediateAction,
}: {
  /** The page's own stated answer, independent of the engine's rule. */
  editorialAngle?: string;
  currentCall: string;
  immediateAction: string;
}): string => [editorialAngle, currentCall, immediateAction].filter(Boolean).join("|");

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
  pageKey,
  siblingsInCluster,
  provenanceLinks,
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
  pageKey?: string;
  siblingsInCluster?: SeoQualitySiblingInput[];
  provenanceLinks?: string[];
}): SeoDecisionPayload => {
  const primaryRule = mappedDecisionAreas
    .map((area) => mappedRules.find((rule) => rule.area === area))
    .find((rule): rule is BoundedDecisionRule => Boolean(rule));

  const evidence = reportEvidenceItems.slice(0, 3).map((item) => ({
    title: item.title,
    summary: item.immediateImplication,
    confidenceLabel: item.confidenceLabel,
  }));

  const failureWarnings = buildTrustWarnings({
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
    `Risk appetite falls below ${formatThresholdNumber(assessment.thresholds.riskAppetiteRegime)} or funding pressure rises above ${formatThresholdNumber(assessment.thresholds.tightnessRegime)}.`;
  const reversalCondition =
    primaryRule?.resumeTrigger ??
    "Both scores move back past their lines and stay there for two weekly readings.";

  const trustSummary = buildCompactTrustSummary({
    confidenceLabel,
    freshnessLabel,
    isFallbackSnapshot,
  });

  const citationMeta = buildWeeklyCitationMetaLine({
    statusLabel: getRegimePublicLabel(assessment.regime),
    confidenceLabel,
    recordDateLabel,
    freshnessLabel,
  });

  /*
   * The whole page, not the engine-derived half of it.
   *
   * This was `${currentCall}|${immediateAction}`, and both come from the first
   * mapped decision rule. There are five decision areas and eight pages in the
   * decision cluster, so by pigeonhole at least three pages must share a primary
   * rule and therefore an identical label — and the uniqueness gate blocked five
   * of eleven answers with `cluster-duplicate-no-distinct-datapoint-or-
   * interpretation`, permanently, for a reason no amount of editing those pages
   * could fix.
   *
   * Each page also carries its own hand-written answer (`shortAnswer` in
   * `content/answers/pages.json`, arriving here as `fallbackCurrentCall`). It is
   * validated by zod, rendered as the meta description and as the page subtitle
   * — and the gate deciding whether to publish the page never saw it, because it
   * is named "fallback" and only read when no rule matches, which never happens.
   *
   * Folding it in does not weaken the gate: the label is still duplicate-
   * sensitive, two pages with the same stated answer still collide, and
   * `thin-page` still independently refuses a page with nothing on it. It makes
   * the gate measure what the page says rather than what the engine contributed
   * to it.
   */
  const interpretationLabel = buildAnswerInterpretationLabel({
    editorialAngle: fallbackCurrentCall,
    currentCall,
    immediateAction,
  });

  const qualityGates = evaluateSeoQualityGates(
    {
      pageKey: pageKey ?? `${mappedDecisionAreas.join("-") || "default"}`,
      currentCall,
      immediateAction,
      triggerThreshold,
      reversalCondition,
      evidenceCount: evidence.length,
      evidenceTitles: evidence.map((item) => item.title),
      fetchedAtIso,
      isFallbackSnapshot,
      trustSummary,
      citationMeta,
      provenanceStatusLabel,
      provenanceLinks,
      confidenceLabel,
      fallbackLabel: isFallbackSnapshot ? "fallback" : "live",
      interpretationLabel,
      siblingsInCluster,
    },
  );

  return {
    pageKey,
    interpretationLabel,
    currentCall,
    immediateAction,
    triggerThreshold,
    reversalCondition,
    evidence,
    freshness: freshnessLabel,
    degraded: degraded || qualityGates.noindex,
    noindex: qualityGates.noindex,
    noindexReasons: qualityGates.reasons,
    qualityGates,
    trustSummary,
    citationMeta,
  };
};
