import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../timeMachine/timeMachineSelection";
import { type ReportData, type ReportDataFallback } from "./reportData";
import { buildTrustMarker, buildTrustStatus } from "./trustStatus";
import { formatSourceFreshnessLabel, formatSourceModeLabel } from "./sourceHealth";
import {
  buildInterpretationLayer,
  isInterpretationView,
  type InterpretationLayer,
  type InterpretationView,
} from "./interpretationLayer";
import { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "./homeBriefModel";
import { resolveSectorKey } from "./sectorSensitivity";
import { buildPostureState } from "./postureStateSource";
import { homeSectionSequence } from "./homeSections";
import type { HomePageSearchParams } from "./homeMetadata";
import { loadHomePageReportData } from "./homePageData";
import { buildWeeklyBriefSnapshot } from "./weeklyBriefSnapshot";
import { buildDiagnosticsLanePayload } from "./home/diagnosticsLane";
import { buildHomeWorkspaceModel } from "./home/workspaceModel";
import { buildLeadershipArtifactPayload } from "./home/artifactPayload";
import { buildHomeStructuredData } from "./home/structuredData";
import type { WeeklyCallContract } from "./weeklyCallContract";
import type {
  ArtifactPayload,
  HomePageAssembly,
  HomePageDiagnosticsLane,
  HomePageWorkspaceModel,
} from "./home/contracts";

export type {
  ArtifactPayload,
  HomePageAssembly,
  HomePageDiagnosticsLane,
  HomePageWorkspaceModel,
} from "./home/contracts";

type HomePageAssemblerDependencies = {
  loadHomePageReportData: typeof loadHomePageReportData;
  buildPostureState: typeof buildPostureState;
};

type DeferredHomeSupportModels = {
  diagnosticsLane: HomePageDiagnosticsLane;
  workspaceModel: HomePageWorkspaceModel;
};

const resolveHomepageOverlaySector = (value: string | undefined) => resolveSectorKey(value);

const defaultHomePageAssemblerDependencies: HomePageAssemblerDependencies = {
  loadHomePageReportData,
  buildPostureState,
};

const buildCommandBarPayload = ({
  assessment,
  weeklyCall,
  weeklyDecisionCardModel,
  updatedAt,
}: {
  assessment: ReportData["assessment"];
  weeklyCall: WeeklyCallContract;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  updatedAt: string;
}) => ({
  regime: assessment.regime,
  call: weeklyCall.currentCall,
  doNow: weeklyCall.doNowBullets,
  flipConditions: [weeklyCall.changeCourseIf, ...weeklyCall.flipConditionLabels].slice(0, 4),
  updatedAt,
  postureLabel: weeklyDecisionCardModel.status.postureWithStageLabel ?? weeklyDecisionCardModel.status.statusLabel,
  trendLabel: weeklyDecisionCardModel.status.trendLabel,
  confidenceLabel: weeklyDecisionCardModel.status.confidenceLabel,
  confidencePercent: weeklyDecisionCardModel.status.confidencePercent,
  postureTrajectory: weeklyDecisionCardModel.diagnostics.postureTrajectory,
  regimeDistance: weeklyDecisionCardModel.diagnostics.regimeDistance,
});

const buildDeferredHomeSupportModels = ({
  reportData,
  homeBriefModel,
  weeklyDecisionCardModel,
  statusLabel,
  reportDynamics,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  outageType,
  outageSeverity,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  freshnessLabel,
  trustMarker,
  sectionLinks,
}: {
  reportData: ReportData | ReportDataFallback;
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  statusLabel: string;
  reportDynamics: ReportData["reportDynamics"];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: ReturnType<typeof buildTrustStatus>["trustStatusTone"];
  outageType: ReturnType<typeof buildTrustStatus>["outageType"];
  outageSeverity: ReturnType<typeof buildTrustStatus>["outageSeverity"];
  decisionImpactWindow: ReturnType<typeof buildTrustStatus>["decisionImpactWindow"];
  approvalBuckets: ReturnType<typeof buildTrustStatus>["approvalBuckets"];
  recoveryPlan: ReturnType<typeof buildTrustStatus>["recoveryPlan"];
  outageExitGate: ReturnType<typeof buildTrustStatus>["outageExitGate"];
  freshnessLabel: string;
  trustMarker: ReturnType<typeof buildTrustMarker>;
  sectionLinks: { href: string; label: string }[];
}): DeferredHomeSupportModels => {
  const diagnosticsLane = buildDiagnosticsLanePayload({
    homeBriefModel,
    weeklyDecisionCardModel,
    statusLabel,
    reportDynamics,
  });

  return {
    diagnosticsLane,
    workspaceModel: buildHomeWorkspaceModel({
      reportData,
      diagnosticsLane,
      weeklyDecisionCardModel,
      trustStatusLabel,
      trustStatusDetail,
      trustStatusAction,
      trustStatusTone,
      outageType,
      outageSeverity,
      decisionImpactWindow,
      approvalBuckets,
      recoveryPlan,
      outageExitGate,
      freshnessLabel,
      trustMarkerLabel: trustMarker.label,
      trustMarkerTone: trustMarker.tone,
      trustMarkerDetail: trustMarker.detail,
      sourceDegraded: trustMarker.degraded,
      sectionLinks,
    }),
  };
};

export const assembleHomePage = async ({
  searchParams,
}: {
  searchParams?: HomePageSearchParams;
}, dependencies: Partial<HomePageAssemblerDependencies> = {}): Promise<HomePageAssembly> => {
  const resolvedDependencies = {
    ...defaultHomePageAssemblerDependencies,
    ...dependencies,
  } satisfies HomePageAssemblerDependencies;
  const homepageOverlaySector = resolveHomepageOverlaySector(searchParams?.sector);
  const interpretationView: InterpretationView = isInterpretationView(searchParams?.view)
    ? searchParams.view
    : "default";
  const sectionLinks = homeSectionSequence.map((section) => ({ href: section.href, label: section.label }));

  const reportResult = await resolvedDependencies.loadHomePageReportData(searchParams);
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    historicalAnalogs,
    recordDateLabel,
    weeklyRecordDate,
    weeklyRecordDateLabel,
    regimeAlert,
    reportDynamics,
    sensors,
    macroSeries,
    forecast,
    regimeSeries,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
    confidenceHistory,
    confidenceTrend,
  } = reportData;

  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/signals?advanced=1#time-machine";
  const baseSnapshot = buildWeeklyBriefSnapshot({
    reportData,
    degraded: !reportResult.ok,
    overlaySector: homepageOverlaySector,
  });
  const { isFallback, trustStatus, freshnessMeta, homeBriefModel, weeklyDecisionCardModel, weeklyCall } = baseSnapshot;
  const {
    trustStatusLabel,
    trustStatusDetail,
    trustStatusAction,
    trustStatusTone,
    outageType,
    outageSeverity,
    decisionImpactWindow,
    approvalBuckets,
    recoveryPlan,
    outageExitGate,
  } = trustStatus;
  const trustMarker = buildTrustMarker({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessMeta,
    isFallbackSnapshot: isFallback && !historicalSelection,
    isHistoricalSelection: Boolean(historicalSelection),
  });
  const interpretationLayer = buildInterpretationLayer({
    view: interpretationView,
    homeBriefModel,
    assessment,
    forecast,
    decisionRules: homeBriefModel.decisionRules,
  });
  const interpretationSearchParams = searchParams
    ? Object.entries(searchParams).reduce<Record<string, string | undefined>>((result, [key, value]) => {
        if (typeof value === "string") {
          result[key] = value;
        }

        return result;
      }, {})
    : undefined;

  const enrichedHomePageModelPromise = (async () => {
    try {
      const postureState = await resolvedDependencies.buildPostureState({
        recordDate: treasury.record_date,
        assessment,
        reportDynamics,
      });
      const enrichedSnapshot = buildWeeklyBriefSnapshot({
        reportData,
        degraded: !reportResult.ok,
        overlaySector: homepageOverlaySector,
        postureState,
      });

      return {
        postureState,
        homeBriefModel: enrichedSnapshot.homeBriefModel,
        weeklyDecisionCardModel: enrichedSnapshot.weeklyDecisionCardModel,
        canonicalDecisionCopy: enrichedSnapshot.canonicalDecisionCopy,
      };
    } catch (error) {
      console.error("[home] deferred posture-state enrichment unavailable", error);
      return {
        postureState: null,
        homeBriefModel: baseSnapshot.homeBriefModel,
        weeklyDecisionCardModel: baseSnapshot.weeklyDecisionCardModel,
        canonicalDecisionCopy: null,
      };
    }
  })();

  const fallbackAlert = !historicalSelection && isFallback
    ? {
        lastCachedTimestamp: reportResult.ok ? treasury.fetched_at : reportResult.fallback.lastCachedTimestamp,
        sourceLabel: treasury.source,
        effectiveRecordDate: treasury.record_date,
        fallbackReason: treasury.fallback_reason,
      }
    : null;

  return {
    reportResult,
    weeklyCall,
    weeklyDecisionCardModel,
    leadershipArtifactPayloadPromise: enrichedHomePageModelPromise.then(({ postureState, homeBriefModel: enrichedHomeBriefModel }) =>
      postureState
        ? buildLeadershipArtifactPayload({
            assessment,
            treasury,
            weeklyRecordDate,
            sensors,
            macroSeries,
            homeBriefModel: enrichedHomeBriefModel,
            postureState,
            interpretationView,
            forecast,
            freshnessLabel: freshnessMeta.updatedAtLabel,
            weeklyCall,
          })
        : null
    ),
    fallbackActive: !historicalSelection && isFallback,
    fallbackAlert,
    interpretationLayer,
    interpretationSearchParams,
    diagnosticsLanePromise: enrichedHomePageModelPromise.then(({ homeBriefModel: enrichedHomeBriefModel, weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel }) =>
      buildDeferredHomeSupportModels({
        reportData,
        homeBriefModel: enrichedHomeBriefModel,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
        statusLabel,
        reportDynamics,
        trustStatusLabel,
        trustStatusDetail,
        trustStatusAction,
        trustStatusTone,
        outageType,
        outageSeverity,
        decisionImpactWindow,
        approvalBuckets,
        recoveryPlan,
        outageExitGate,
        freshnessLabel: freshnessMeta.line,
        trustMarker,
        sectionLinks,
      }).diagnosticsLane
    ),
    workspaceModelPromise: enrichedHomePageModelPromise.then(({ homeBriefModel: enrichedHomeBriefModel, weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel }) =>
      buildDeferredHomeSupportModels({
        reportData,
        homeBriefModel: enrichedHomeBriefModel,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
        statusLabel,
        reportDynamics,
        trustStatusLabel,
        trustStatusDetail,
        trustStatusAction,
        trustStatusTone,
        outageType,
        outageSeverity,
        decisionImpactWindow,
        approvalBuckets,
        recoveryPlan,
        outageExitGate,
        freshnessLabel: freshnessMeta.line,
        trustMarker,
        sectionLinks,
      }).workspaceModel
    ),
    reportShell: {
      regime: assessment.regime,
      statusLabel,
      recordDateLabel,
      fetchedAtLabel,
      freshnessLine: freshnessMeta.line,
      treasurySource: treasury.source,
      trustStatusLabel,
      trustStatusDetail,
      trustStatusAction,
      trustStatusTone,
      outageType,
      outageSeverity,
      decisionImpactWindow,
      approvalBuckets,
      recoveryPlan,
      outageExitGate,
      degradedSourceRows: reportData.sourceHealth
        .filter((row) => row.mode !== "live")
        .map((row) => ({
          sourceName: row.sourceName,
          modeLabel: formatSourceModeLabel(row.mode),
          freshnessStatus: formatSourceFreshnessLabel(row),
        })),
      provenance: treasuryProvenance,
      showOfflineBadge: isFallback && !historicalSelection,
      sectionLinks,
      structuredData: buildHomeStructuredData(),
      commandBar: buildCommandBarPayload({
        assessment,
        weeklyCall,
        weeklyDecisionCardModel,
        updatedAt: freshnessMeta.updatedAtLabel,
      }),
      historicalBanner: historicalSelection
        ? {
          banner: historicalSelection.banner,
          liveHref: "/",
          previousHref: previousHistoricalHref,
          timeMachineHref: historicalTimeMachineHref,
        }
        : null,
    },
  };
};
