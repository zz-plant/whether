import type { DecisionPageDefinition } from "../../app/answers/decisionPages";
import { answerPages } from "../../app/answers/decisionPages";
import { buildSeoDecisionPayload, type SeoDecisionPayload } from "../report/seoDecisionPayload";
import { loadWeeklyBriefSnapshot, type WeeklyBriefSnapshotResult } from "../report/weeklyBriefSnapshot";
import { evaluateSeoQualityGates, type SeoQualityGateResult, type SeoQualitySiblingInput } from "../report/seoQualityGates";

export type AnswerLaunchReadinessRecord = {
  slug: string;
  keyword: string;
  eligible: boolean;
  reasons: string[];
  qualityGates: SeoQualityGateResult;
};

export type AnswerLaunchReadinessLiveInputs = Pick<WeeklyBriefSnapshotResult, "reportData" | "degraded" | "snapshot">;

type AnswerLaunchReadinessPayloadRecord = {
  page: DecisionPageDefinition;
  payload: SeoDecisionPayload;
  siblingInput: SeoQualitySiblingInput;
};

const buildInterpretationLabel = (payload: Pick<SeoDecisionPayload, "currentCall" | "immediateAction">) =>
  `${payload.currentCall}|${payload.immediateAction}`;

const estimateScanSeconds = (payload: Pick<SeoDecisionPayload, "currentCall" | "immediateAction" | "triggerThreshold" | "reversalCondition">): number => {
  const words = [payload.currentCall, payload.immediateAction, payload.triggerThreshold, payload.reversalCondition]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const wordsPerMinute = 180;
  return Math.ceil((words / wordsPerMinute) * 60);
};

const buildPayloadForPage = (page: DecisionPageDefinition, inputs: AnswerLaunchReadinessLiveInputs): SeoDecisionPayload => {
  const { reportData, degraded, snapshot } = inputs;
  const { homeBriefModel } = snapshot;
  const mappedRules = homeBriefModel.decisionRules.filter((rule) => page.mappedDecisionAreas.includes(rule.area));

  return buildSeoDecisionPayload({
    assessment: reportData.assessment,
    mappedRules,
    mappedDecisionAreas: page.mappedDecisionAreas,
    fallbackCurrentCall: page.shortAnswer,
    fallbackImmediateAction: page.directAnswer,
    reportEvidenceItems: reportData.reportEvidenceItems,
    freshnessLabel: reportData.fetchedAtLabel,
    recordDateLabel: reportData.recordDateLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    isFallbackSnapshot: degraded,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    fetchedAtIso: reportData.treasury.fetched_at,
    pageKey: `/answers/${page.slug}`,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
  });
};

const buildPayloadRecords = (
  pages: DecisionPageDefinition[],
  inputs: AnswerLaunchReadinessLiveInputs,
): AnswerLaunchReadinessPayloadRecord[] =>
  pages.map((page) => {
    const payload = buildPayloadForPage(page, inputs);

    return {
      page,
      payload,
      siblingInput: {
        pageKey: `/answers/${page.slug}`,
        interpretationLabel: buildInterpretationLabel(payload),
        evidenceTitles: payload.evidence.map((item) => item.title),
      },
    };
  });

export const loadAnswerLaunchReadinessInputs = async (route = "/answers/[slug]:launch-readiness"): Promise<AnswerLaunchReadinessLiveInputs> => {
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  return { reportData, degraded, snapshot };
};

export const scoreAnswerLaunchReadiness = async (
  pages: DecisionPageDefinition[] = answerPages,
  liveInputs?: AnswerLaunchReadinessLiveInputs,
): Promise<AnswerLaunchReadinessRecord[]> => {
  const inputs = liveInputs ?? await loadAnswerLaunchReadinessInputs();
  const payloadRecords = buildPayloadRecords(pages, inputs);

  return payloadRecords.map(({ page, payload }) => {
    const siblings = payloadRecords
      .filter((candidate) => candidate.page.slug !== page.slug && candidate.page.category === page.category)
      .map((candidate) => candidate.siblingInput);

    const qualityGates = evaluateSeoQualityGates({
      pageKey: `/answers/${page.slug}`,
      currentCall: payload.currentCall,
      immediateAction: payload.immediateAction,
      triggerThreshold: payload.triggerThreshold,
      reversalCondition: payload.reversalCondition,
      evidenceCount: payload.evidence.length,
      evidenceTitles: payload.evidence.map((item) => item.title),
      fetchedAtIso: inputs.reportData.treasury.fetched_at,
      isFallbackSnapshot: inputs.degraded,
      provenanceStatusLabel: inputs.reportData.treasuryProvenance?.statusLabel,
      provenanceLinks: [inputs.reportData.treasury.source, inputs.reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
      confidenceLabel: inputs.snapshot.homeBriefModel.confidenceLabel,
      fallbackLabel: inputs.degraded ? "fallback" : "live",
      trustSummary: payload.trustSummary,
      citationMeta: payload.citationMeta,
      interpretationLabel: buildInterpretationLabel(payload),
      siblingsInCluster: siblings,
      enforceLaunchChecklist: true,
      scanSecondsEstimate: estimateScanSeconds(payload),
      hasDecisionBullets: page.mappedDecisionAreas.length > 0,
      hasCopyableDecision: payload.immediateAction.trim().length > 0,
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
};

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
