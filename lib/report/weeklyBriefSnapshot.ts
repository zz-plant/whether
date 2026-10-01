import { buildCallCitation } from "../export/briefBuilders";
import { buildPostureState } from "./postureStateSource";
import { getRegimeDisplayLabel } from "../regimePresentation";
import { buildCanonicalDecisionCopy, type CanonicalDecisionCopy } from "./canonicalDecisionCopy";
import { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "./homeBriefModel";
import { loadReportDataSafe, type LoadReportDataSafeResult, type ReportData, type ReportDataFallback, type ReportDataLoadOptions, type ReportSearchParams } from "./reportData";
import { buildCompactFreshnessMeta, type CompactFreshnessMeta } from "./reportFormatting";
import { resolveSectorKey, type SectorKey } from "./sectorSensitivity";
import { buildTrustStatus } from "./trustStatus";
import type { PostureStateContract } from "./postureStateContract";
import { applyStageToWeeklyCall, buildWeeklyCallContract, type WeeklyCallContract } from "./weeklyCallContract";
import type { StartupVariantMode } from "./boundedDecisionRules";
import type { RunwayBand } from "./operatorRunway";

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
  overlaySector?: SectorKey;
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
  overlaySector = "b2b-saas",
  postureState = null,
  startupVariantMode,
  runwayBand,
  runwayMonths,
}: BuildWeeklyBriefSnapshotArgs): WeeklyBriefSnapshot => {
  const isFallback = Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason);
  const homeBriefModel = buildHomeBriefModel(
    buildHomeBriefInput(reportData, postureState),
    { overlaySector, startupVariantMode, runwayBand, runwayMonths },
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
    policyRefusalActive: reportData.assessment.policyAssessment.refusal.refused,
    policyRefusalReasons: reportData.assessment.policyAssessment.refusal.reasons,
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
  const callCitation = buildCallCitation(reportData.assessment, reportData.treasury, {
    postureWithStageLabel: homeBriefModel.postureWithStageLabel,
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

export const loadWeeklyBriefSnapshot = async (
  searchParams?: ReportSearchParams,
  context?: { route?: string; requestId?: string },
  options?: ReportDataLoadOptions & { overlaySector?: string },
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
    overlaySector: resolveSectorKey(options?.overlaySector),
    postureState,
  });

  return {
    reportResult,
    reportData,
    degraded: !reportResult.ok,
    snapshot,
  };
};
