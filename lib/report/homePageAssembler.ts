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
import {
  buildFlipConditionsWithoutTriggerDuplication,
  type buildCanonicalDecisionCopy,
} from "./canonicalDecisionCopy";
import { homeSectionSequence } from "./homeSections";
import type { HomePageSearchParams } from "./homeMetadata";
import { loadHomePageReportData } from "./homePageData";
import { buildWeeklyBriefSnapshot } from "./weeklyBriefSnapshot";
import { buildDiagnosticsLanePayload } from "./home/diagnosticsLane";
import { buildHomeWorkspaceModel } from "./home/workspaceModel";
import { buildLeadershipArtifactPayload } from "./home/artifactPayload";
import { buildHomeStructuredData } from "./home/structuredData";
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

const resolveHomepageOverlaySector = (value: string | undefined) => resolveSectorKey(value);

const defaultHomePageAssemblerDependencies: HomePageAssemblerDependencies = {
  loadHomePageReportData,
  buildPostureState,
};

const dedupeCompactItems = (items: Array<string | undefined>, maxItems = 4) =>
  items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item && item.length > 0))
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, maxItems);

const buildCommandBarPayload = ({
  assessment,
  homeBriefModel,
  weeklyDecisionCardModel,
  updatedAt,
  canonicalDecisionCopy,
}: {
  assessment: ReportData["assessment"];
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  updatedAt: string;
  canonicalDecisionCopy?: ReturnType<typeof buildCanonicalDecisionCopy> | null;
}) => ({
  regime: assessment.regime,
  call: canonicalDecisionCopy?.operatingCall ?? weeklyDecisionCardModel.decision.operatingStanceLine,
  doNow: canonicalDecisionCopy?.doNowLines ?? dedupeCompactItems([
    weeklyDecisionCardModel.decision.immediateDecision,
    ...homeBriefModel.actionStripItems.map((item) => item.actionNow),
  ], 3),
  flipConditions: canonicalDecisionCopy
    ? [
        canonicalDecisionCopy.flipTrigger,
        ...buildFlipConditionsWithoutTriggerDuplication({
          flipTrigger: canonicalDecisionCopy.flipTrigger,
          flipConditions: canonicalDecisionCopy.flipConditions,
          maxItems: 3,
        }),
      ]
    : dedupeCompactItems([
        homeBriefModel.flipThreshold,
        homeBriefModel.reversalTrigger,
        ...homeBriefModel.compactFlipConditionLabels,
      ], 4),
  updatedAt,
});

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
  const { isFallback, trustStatus, freshnessMeta, displayRegime, homeBriefModel, weeklyDecisionCardModel } = baseSnapshot;
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
          })
        : null
    ),
    fallbackActive: !historicalSelection && isFallback,
    fallbackAlert,
    interpretationLayer,
    interpretationSearchParams,
    diagnosticsLanePromise: enrichedHomePageModelPromise.then(({ homeBriefModel: enrichedHomeBriefModel, weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel }) =>
      buildDiagnosticsLanePayload({
        homeBriefModel: enrichedHomeBriefModel,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
        statusLabel,
        reportDynamics,
      })
    ),
    workspaceModelPromise: enrichedHomePageModelPromise.then(({ homeBriefModel: enrichedHomeBriefModel, weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel }) => {
      const diagnosticsLane = buildDiagnosticsLanePayload({
        homeBriefModel: enrichedHomeBriefModel,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
        statusLabel,
        reportDynamics,
      });

      return buildHomeWorkspaceModel({
        reportData,
        diagnosticsLane,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
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
        trustMarkerLabel: trustMarker.label,
        trustMarkerTone: trustMarker.tone,
        trustMarkerDetail: trustMarker.detail,
        sourceDegraded: trustMarker.degraded,
        sectionLinks,
      });
    }),
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
        homeBriefModel,
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
