import { buildCallCitation, formatGuidance } from "../export/briefBuilders";
import { buildBriefPermalinkUrl } from "../export/briefPermalink";
import { describeConditions } from "../export/exportTerms";
import { buildPostureState } from "./postureStateSource";
import { getRegimeDisplayLabel } from "../regimePresentation";
import { buildCanonicalDecisionCopy, type CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "./homeBriefModel";
import { loadReportDataSafe, type LoadReportDataSafeResult, type ReportData, type ReportDataFallback, type ReportDataLoadOptions, type ReportSearchParams } from "./reportData";
import { buildCompactFreshnessMeta, type CompactFreshnessMeta } from "./reportFormatting";
import { buildTrustStatus } from "./trustStatus";
import { describePolicyHold } from "./regimeDescription";
import type { PostureStateContract } from "./postureStateContract";
import { applyStageToWeeklyCall, buildWeeklyCallContract, type WeeklyCallContract } from "./weeklyCallContract";
import type { StartupVariantMode } from "./boundedDecisionRules";
import type { RunwayBand } from "./operatorRunway";
import { isSavedCopy } from "./provenanceStatus";

export type WeeklyBriefSnapshot = {
  reportData: ReportData | ReportDataFallback;
  degraded: boolean;
  isFallback: boolean;
  displayRegime: ReturnType<typeof getRegimeDisplayLabel>;
  freshnessMeta: CompactFreshnessMeta;
  trustStatus: ReturnType<typeof buildTrustStatus>;
  postureState: PostureStateContract | null;
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  canonicalDecisionCopy: CanonicalDecisionCopy | null;
  weeklyCall: WeeklyCallContract;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  callCitation: string;
};

export type WeeklyBriefSnapshotResult = {
  reportResult: LoadReportDataSafeResult;
  reportData: ReportData | ReportDataFallback;
  degraded: boolean;
  snapshot: WeeklyBriefSnapshot;
};

type BuildWeeklyBriefSnapshotArgs = {
  reportData: ReportData | ReportDataFallback;
  degraded: boolean;
  postureState?: PostureStateContract | null;
  startupVariantMode?: StartupVariantMode;
  runwayBand?: RunwayBand;
  runwayMonths?: number;
};

const defaultTrustStatusCopy = {
  historicalAction:
    "Use for retrospectives only; avoid live planning decisions until you return to current data.",
  fallbackAction:
    "Pause irreversible decisions until the live feed returns or you confirm the cache.",
  /* Printed under `DATA_CAVEAT_LABEL`. "Safe to use for near-term planning;
     proceed with normal approval flow" was printed under "Action" in a week
     whose guidance was to freeze new commitments. Live data adds no caveat; the
     guidance itself says what to do. */
  stableAction: "None.",
};

const buildHomeBriefInput = (
  reportData: ReportData | ReportDataFallback,
  postureState?: PostureStateContract | null,
) => ({
  assessment: reportData.assessment,
  fetchedAtLabel: reportData.fetchedAtLabel,
  historicalSelection: reportData.historicalSelection,
  historicalAnalogs: reportData.historicalAnalogs,
  lastYearComparison: reportData.lastYearComparison,
  recordDateLabel: reportData.recordDateLabel,
  regimeAlert: reportData.regimeAlert,
  reportDynamics: reportData.reportDynamics,
  sensors: reportData.sensors,
  macroSeries: reportData.macroSeries,
  forecast: reportData.forecast,
  regimeSeries: reportData.regimeSeries,
  statusLabel: reportData.statusLabel,
  stopItems: reportData.stopItems,
  treasury: reportData.treasury,
  treasuryProvenance: reportData.treasuryProvenance,
  actionNowShort: reportData.actionNowShort,
  guardrailThreshold: reportData.guardrailThreshold,
  flipThreshold: reportData.flipThreshold,
  reportEvidenceItems: reportData.reportEvidenceItems,
  postureState: postureState ?? undefined,
});

export const buildWeeklyBriefSnapshot = ({
  reportData,
  degraded,
  postureState = null,
  startupVariantMode,
  runwayBand,
  runwayMonths,
}: BuildWeeklyBriefSnapshotArgs): WeeklyBriefSnapshot => {
  const isFallback = isSavedCopy(reportData.treasury);
  const homeBriefModel = buildHomeBriefModel(
    buildHomeBriefInput(reportData, postureState),
    { startupVariantMode, runwayBand, runwayMonths },
  );
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: reportData.fetchedAtLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  const displayRegime = getRegimeDisplayLabel({
    regime: reportData.assessment.regime,
    momentum: reportData.reportDynamics.directionLabel,
    confidence: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch === "ON",
  });
  const trustStatus = buildTrustStatus({
    historicalSelection: Boolean(reportData.historicalSelection),
    isFallback,
    fallbackReason: reportData.treasury.fallback_reason ?? undefined,
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    freshnessState: freshnessMeta,
    policyHold: reportData.assessment.policyAssessment.refusal.refused
      ? describePolicyHold(reportData.assessment.policyAssessment.refusal)
      : null,
    historicalMacroCoverageLabel: reportData.macroCoverage?.label ?? null,
    ...defaultTrustStatusCopy,
  });
  const canonicalDecisionCopy = postureState
    ? buildCanonicalDecisionCopy({
        homeBriefModel,
        postureState,
      })
    : null;
  const weeklyCall = reportData.projectsOperatingSnapshot && reportData.operatingSnapshot
    ? applyStageToWeeklyCall(reportData.operatingSnapshot.weeklyCall, {
        assessment: reportData.operatingSnapshot.assessment,
        startupVariantMode,
        runwayBand,
        runwayMonths,
      })
    : buildWeeklyCallContract({
        assessment: reportData.assessment,
        homeBriefModel,
        canonicalDecisionCopy,
        startupVariantMode,
        runwayBand,
        runwayMonths,
      });
  /* The answer pages' citation, under the call's own conditions label and the
     published confidence the home model already resolved for this read. */
  const callCitation = buildCallCitation({
    conditions: { line: describeConditions(reportData.assessment.regime, weeklyCall.regimeStage) },
    confidence: homeBriefModel.confidenceLabel,
    provenance: {
      sourceUrl: reportData.treasury.source,
      recordDate: reportData.treasury.record_date,
      permalink: buildBriefPermalinkUrl(reportData.treasury.record_date),
    },
  });
  const weeklyDecisionCardModel = buildWeeklyDecisionCardViewModel({
    homeBriefModel,
    statusLabel: displayRegime.label,
    regimeKey: reportData.assessment.regime,
    reportDynamics: reportData.reportDynamics,
    citation: callCitation,
    recordDateLabel: reportData.weeklyRecordDateLabel,
    fetchedAtLabel: reportData.fetchedAtLabel,
    freshnessLine: freshnessMeta.line,
    confidenceHistory: reportData.confidenceHistory,
    confidenceTrend: reportData.confidenceTrend,
    canonicalDecisionCopy: canonicalDecisionCopy ?? undefined,
    isFallbackSnapshot: isFallback && !reportData.historicalSelection,
    weeklyCall,
  });

  return {
    reportData,
    degraded,
    isFallback,
    displayRegime,
    freshnessMeta,
    trustStatus,
    postureState,
    homeBriefModel,
    canonicalDecisionCopy,
    weeklyCall,
    weeklyDecisionCardModel,
    callCitation,
  };
};

/**
 * The week's guidance as every paste and Monday send prints it (`formatGuidance`), for a
 * surface that has the report and its posture state but not the homepage model: the agent
 * state, the CLI and the agent handoff. They printed the loader's `actionNowShort`, the
 * action the headline stopped leading with on 2026-10-09, so on the Oct 26 reading an
 * agent was told "Freeze new commitments and keep spend flexible." under a page and a
 * Slack post that said "Commit to what protects income you have; new bets wait for
 * cheaper money." The snapshot is built for its call alone; `degraded` changes nothing
 * the call reads.
 */
export const resolveWeekGuidance = (
  reportData: ReportData | ReportDataFallback,
  postureState: PostureStateContract,
): string => formatGuidance(buildWeeklyBriefSnapshot({ reportData, degraded: false, postureState }).weeklyCall);

export const loadWeeklyBriefSnapshot = async (
  searchParams?: ReportSearchParams,
  context?: { route?: string; requestId?: string },
  options?: ReportDataLoadOptions,
): Promise<WeeklyBriefSnapshotResult> => {
  const reportResult = await loadReportDataSafe(searchParams, context, options);
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    record: reportData.treasury,
    historical: Boolean(reportData.historicalSelection),
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const snapshot = buildWeeklyBriefSnapshot({
    reportData,
    degraded: !reportResult.ok,
    postureState,
  });

  return {
    reportResult,
    reportData,
    degraded: !reportResult.ok,
    snapshot,
  };
};
