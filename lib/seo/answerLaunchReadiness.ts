import type { DecisionPageDefinition } from "../../app/answers/decisionPages";
import { answerPages } from "../../app/answers/decisionPages";
import { evaluateSeoQualityGates, type SeoQualityGateResult } from "../report/seoQualityGates";

export type AnswerLaunchReadinessRecord = {
  slug: string;
  keyword: string;
  eligible: boolean;
  reasons: string[];
  qualityGates: SeoQualityGateResult;
};

const buildSyntheticEvidenceTitles = (page: DecisionPageDefinition) =>
  page.mappedDecisionAreas.map((area) => `Signal context: ${area}`);

const buildInterpretationLabel = (page: DecisionPageDefinition) => `${page.shortAnswer}|${page.directAnswer}`;
const estimateScanSeconds = (page: DecisionPageDefinition): number => {
  const words = [page.shortAnswer, page.directAnswer].join(" ").split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 180;
  return Math.ceil((words / wordsPerMinute) * 60);
};

export const scoreAnswerLaunchReadiness = (
  pages: DecisionPageDefinition[] = answerPages,
  fetchedAtIso: string = new Date().toISOString(),
): AnswerLaunchReadinessRecord[] =>
  pages.map((page) => {
    const siblings = pages
      .filter((candidate) => candidate.slug !== page.slug && candidate.category === page.category)
      .map((candidate) => ({
        pageKey: `/answers/${candidate.slug}`,
        interpretationLabel: buildInterpretationLabel(candidate),
        evidenceTitles: buildSyntheticEvidenceTitles(candidate),
      }));

    const qualityGates = evaluateSeoQualityGates({
      pageKey: `/answers/${page.slug}`,
      currentCall: page.shortAnswer,
      immediateAction: page.directAnswer,
      triggerThreshold: `Use ${page.thresholdFocus} thresholds for ${page.mappedDecisionAreas.join(", ")} decisions.`,
      reversalCondition: "Reverse after two consecutive supportive weekly reads.",
      evidenceCount: page.mappedDecisionAreas.length,
      evidenceTitles: buildSyntheticEvidenceTitles(page),
      fetchedAtIso,
      isFallbackSnapshot: false,
      provenanceStatusLabel: "Live (high confidence)",
      provenanceLinks: ["https://fred.stlouisfed.org/"],
      confidenceLabel: "HIGH",
      fallbackLabel: "live",
      trustSummary: "High confidence • fresh weekly read",
      citationMeta: "Weekly macro decision artifact",
      interpretationLabel: buildInterpretationLabel(page),
      siblingsInCluster: siblings,
      enforceLaunchChecklist: true,
      scanSecondsEstimate: estimateScanSeconds(page),
      hasDecisionBullets: page.mappedDecisionAreas.length > 0,
      hasCopyableDecision: page.directAnswer.trim().length > 0,
      linksToWeeklyBrief: true,
      linksToDecideOrOperations: true,
    });

    return {
      slug: page.slug,
      keyword: page.keyword,
      eligible: qualityGates.eligible,
      reasons: qualityGates.reasons,
      qualityGates,
    };
  });

export const summarizeAnswerLaunchReadiness = (
  records: AnswerLaunchReadinessRecord[],
): {
  total: number;
  eligible: number;
  blocked: number;
  blockedSlugs: Array<{ slug: string; reasons: string[] }>;
} => {
  const blockedSlugs = records
    .filter((record) => !record.eligible)
    .map((record) => ({ slug: record.slug, reasons: record.reasons }));

  return {
    total: records.length,
    eligible: records.length - blockedSlugs.length,
    blocked: blockedSlugs.length,
    blockedSlugs,
  };
};
