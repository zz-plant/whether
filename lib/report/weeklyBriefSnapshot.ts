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
};

const defaultTrustStatusCopy = {
  historicalAction:
    "Use for retrospectives only; avoid live planning calls until you return to current data.",
  fallbackAction:
    "Pause irreversible decisions until the live feed returns or you confirm the cache.",
  stableAction:
    "Safe to use for near-term planning; proceed with normal approval flow.",
};

const buildHomeBriefInput = (
  reportData: ReportData | ReportDataFallback,
  postureState?: PostureStateContract | null,
) => ({
  assessment: reportData.assessment,
  fetchedAtLabel: reportData.fetchedAtLabel,
  historicalSelection: reportData.historicalSelection,
  historicalAnalogs: reportData.historicalAnalogs,
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
}: BuildWeeklyBriefSnapshotArgs): WeeklyBriefSnapshot => {
  const isFallback = Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason);
  const homeBriefModel = buildHomeBriefModel(
    buildHomeBriefInput(reportData, postureState),
    { overlaySector },
  );
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: reportData.fetchedAtLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    isFallbackSnapshot: isFallback,
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
    ...defaultTrustStatusCopy,
  });
  const canonicalDecisionCopy = postureState
    ? buildCanonicalDecisionCopy({
        homeBriefModel,
        postureState,
      })
    : null;
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
    recordDate: reportData.treasury.record_date,
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
