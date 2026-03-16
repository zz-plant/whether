import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../timeMachine/timeMachineSelection";
import { loadReportDataSafe, type ReportData } from "./reportData";
import { buildTrustStatus } from "./trustStatus";
import { buildCompactFreshnessMeta } from "./reportFormatting";
import {
  buildInterpretationLayer,
  isInterpretationView,
  type InterpretationView,
} from "./interpretationLayer";
import { buildBoardBrief, buildCallCitation } from "../export/briefBuilders";
import {
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../export/weeklyOperatorBrief";
import { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "./homeBriefModel";
import { resolveSectorKey } from "./sectorSensitivity";
import { getRegimeDisplayLabel } from "../regimePresentation";
import { buildPostureState } from "./postureStateSource";
import {
  buildCanonicalDecisionCopy,
  buildFlipConditionsWithoutTriggerDuplication,
} from "./canonicalDecisionCopy";
import { homeSectionSequence } from "./homeSections";
import {
  buildBreadcrumbList,
  defaultSiteDescription,
  organizationName,
  websiteName,
} from "../seo";
import { siteUrl } from "../siteUrl";
import { createBreadcrumbTrail } from "../navigation/breadcrumbs";
import type { HomePageSearchParams } from "./homeMetadata";

export type ArtifactPayload = {
  boardSummary: string;
  weeklyOperatorBriefText: string;
  weeklyCallSnapshotText: string;
  callCitation: string;
};

type BuildArtifactPayloadArgs = {
  assessment: ReportData["assessment"];
  treasury: ReportData["treasury"];
  weeklyRecordDate: ReportData["weeklyRecordDate"];
  sensors: ReportData["sensors"];
  macroSeries: ReportData["macroSeries"];
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  postureState: Awaited<ReturnType<typeof buildPostureState>>;
  interpretationView: InterpretationView;
  forecast: ReportData["forecast"];
  freshnessLabel: string;
};

export type HomePageAssembly = {
  reportShell: {
    regime: ReportData["assessment"]["regime"];
    statusLabel: string;
    recordDateLabel: string;
    fetchedAtLabel: string;
    freshnessLine: string;
    treasurySource: ReportData["treasury"]["source"];
    trustStatusLabel: string;
    trustStatusDetail: string;
    trustStatusAction: string;
    trustStatusTone: ReturnType<typeof buildTrustStatus>["trustStatusTone"];
    provenance: ReportData["treasuryProvenance"];
    showOfflineBadge: boolean;
    sectionLinks: { href: string; label: string }[];
    structuredData: ReturnType<typeof buildHomeStructuredData>;
    commandBar: {
      regime: ReportData["assessment"]["regime"];
      call: string;
      doNow: string[];
      flipConditions: string[];
      updatedAt: string;
    };
    historicalBanner: {
      banner: string;
      liveHref: string;
      previousHref?: string;
      timeMachineHref: string;
    } | null;
  };
  reportResult: Awaited<ReturnType<typeof loadReportDataSafe>>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  diagnosticsLane: {
    weeklyMemoLines: ReturnType<typeof buildHomeBriefModel>["weeklyMemoLines"];
    immediateDecision: string;
    revisitDecisions: boolean;
    guardrail: string;
    regimeDistance: ReturnType<typeof buildHomeBriefModel>["regimeDistance"];
    postureWithStageLabel: string;
    statusLabel: string;
    trendLabel: string;
    confidencePercent: number;
    decisionMatrix: ReturnType<typeof buildHomeBriefModel>["decisionMatrix"];
    decisionRules: ReturnType<typeof buildHomeBriefModel>["decisionRules"];
    roleAwareTemplates: ReturnType<typeof buildHomeBriefModel>["roleAwareTemplates"];
    evidenceItems: ReturnType<typeof buildHomeBriefModel>["evidenceItems"];
    reportDynamics: ReportData["reportDynamics"];
    weeklyMovement: ReturnType<typeof buildHomeBriefModel>["weeklyMovement"];
    transitionProbabilities: ReturnType<typeof buildHomeBriefModel>["transitionProbabilities"];
    failureModes: ReturnType<typeof buildHomeBriefModel>["failureModes"];
    historicalTimeline: ReturnType<typeof buildHomeBriefModel>["historicalTimeline"];
  };
  fallbackActive: boolean;
};

const resolveHomepageOverlaySector = (value: string | undefined) => resolveSectorKey(value);

const buildLeadershipArtifactPayload = async ({
  assessment,
  treasury,
  weeklyRecordDate,
  sensors,
  macroSeries,
  homeBriefModel,
  postureState,
  interpretationView,
  forecast,
  freshnessLabel,
}: BuildArtifactPayloadArgs): Promise<ArtifactPayload | null> => {
  await Promise.resolve();

  try {
    const interpretationLayer = buildInterpretationLayer({
      view: interpretationView,
      homeBriefModel,
      assessment,
      forecast,
      decisionRules: homeBriefModel.decisionRules,
    });
    const exportLayerOptions = {
      interpretationLayer,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      operatingStanceLine: homeBriefModel.operatingStanceLine,
      trendLabel: homeBriefModel.trendLabel,
      transitionWatch: homeBriefModel.transitionWatch,
      regimeDistancePoints: homeBriefModel.regimeDistance.pointsToFlip,
      historicalAnalogs: homeBriefModel.historicalAnalogs,
      failureModes: homeBriefModel.failureModes,
      actionStripItems: homeBriefModel.actionStripItems,
      confidenceLabel: homeBriefModel.confidenceLabel,
      freshnessLabel,
      postureState,
    };
    const boardSummary = buildBoardBrief(assessment, treasury, sensors, macroSeries, exportLayerOptions);
    const canonicalDecisionCopy = buildCanonicalDecisionCopy({
      homeBriefModel,
      postureState,
    });
    const weeklyOperatorBriefPayload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      date: weeklyRecordDate,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      actionStripItems: homeBriefModel.actionStripItems,
      flipConditionLabels: homeBriefModel.compactFlipConditionLabels,
      postureState,
      canonicalDecisionCopy,
    });

    return {
      boardSummary,
      weeklyOperatorBriefText: buildWeeklyOperatorBriefPlainText(weeklyOperatorBriefPayload),
      weeklyCallSnapshotText: buildWeeklyCallSnapshotPlainText({
        regime: canonicalDecisionCopy.currentRegimeLabel,
        call: canonicalDecisionCopy.operatingCall,
        trend: homeBriefModel.trendLabel,
        confidence: `${Math.round(homeBriefModel.confidencePercent)}% (${homeBriefModel.confidenceLabel})`,
        doNow: canonicalDecisionCopy.doNowLines[0],
        avoid: homeBriefModel.executiveOperationalStance.avoid[0] ?? homeBriefModel.guardrail,
        watch: canonicalDecisionCopy.flipTrigger,
        flipConditions: canonicalDecisionCopy.flipConditions,
      }),
      callCitation: buildCallCitation(assessment, treasury, {
        interpretationLayer,
        postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      }),
    };
  } catch (error) {
    console.error("[home] leadership artifact export unavailable", error);
    return null;
  }
};

const buildHomeStructuredData = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: organizationName,
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: websiteName,
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: `${siteUrl}/`,
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
    },
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/#webpage`,
      name: "Whether Report — Weekly Brief",
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl}/`,
      },
      isPartOf: {
        "@id": `${siteUrl}#website`,
      },
      about: {
        "@type": "Thing",
        name: "Treasury yield curve strategy planning",
      },
      mainEntity: {
        "@type": "Dataset",
        name: "US Treasury yield curve snapshot",
        description:
          "Weekly US Treasury yield-curve regime snapshot used by Whether to guide product and engineering operating posture.",
        creator: {
          "@id": `${siteUrl}#organization`,
        },
        license: `${siteUrl}/terms-of-service`,
        isBasedOn: {
          "@type": "CreativeWork",
          name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
          url: "https://fred.stlouisfed.org/",
        },
      },
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }])),
  ],
});

export const assembleHomePage = async ({
  searchParams,
}: {
  searchParams?: HomePageSearchParams;
}): Promise<HomePageAssembly> => {
  const homepageOverlaySector = resolveHomepageOverlaySector(searchParams?.sector);
  const interpretationView: InterpretationView = isInterpretationView(searchParams?.view)
    ? searchParams.view
    : "default";
  const sectionLinks = homeSectionSequence.map((section) => ({ href: section.href, label: section.label }));

  const reportResult = await loadReportDataSafe(searchParams, { route: "/" });
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
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);

  const {
    trustStatusLabel,
    trustStatusDetail,
    trustStatusAction,
    trustStatusTone,
  } = buildTrustStatus({
    historicalSelection: Boolean(historicalSelection),
    isFallback,
    fallbackReason: treasury.fallback_reason ?? undefined,
    historicalAction:
      "Use for retrospectives only; avoid live planning calls until you return to current data.",
    fallbackAction:
      "Pause irreversible decisions until the live feed returns or you confirm the cache.",
    stableAction:
      "Safe to use for near-term planning; proceed with normal approval flow.",
  });

  const postureState = await buildPostureState({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics,
  });

  const homeBriefModel = buildHomeBriefModel({
    assessment,
    fetchedAtLabel,
    historicalSelection,
    historicalAnalogs,
    recordDateLabel,
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
    postureState,
  }, { overlaySector: homepageOverlaySector });

  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: fetchedAtLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    isFallbackSnapshot: isFallback,
  });

  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch === "ON",
  });

  const canonicalDecisionCopy = buildCanonicalDecisionCopy({
    homeBriefModel,
    postureState,
  });

  const weeklyDecisionCardModel = buildWeeklyDecisionCardViewModel({
    homeBriefModel,
    statusLabel: displayRegime.label,
    regimeKey: assessment.regime,
    reportDynamics,
    citation: buildCallCitation(assessment, treasury, {
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    }),
    recordDateLabel: weeklyRecordDateLabel,
    fetchedAtLabel,
    freshnessLine: freshnessMeta.line,
    confidenceHistory,
    confidenceTrend,
    canonicalDecisionCopy,
    isFallbackSnapshot: isFallback && !historicalSelection,
  });

  return {
    reportResult,
    weeklyDecisionCardModel,
    leadershipArtifactPayloadPromise: buildLeadershipArtifactPayload({
      assessment,
      treasury,
      weeklyRecordDate,
      sensors,
      macroSeries,
      homeBriefModel,
      postureState,
      interpretationView,
      forecast,
      freshnessLabel: freshnessMeta.updatedAtLabel,
    }),
    fallbackActive: !historicalSelection && isFallback,
    diagnosticsLane: {
      weeklyMemoLines: homeBriefModel.weeklyMemoLines,
      immediateDecision: weeklyDecisionCardModel.decision.immediateDecision,
      revisitDecisions: homeBriefModel.revisitDecisions,
      guardrail: homeBriefModel.guardrail,
      regimeDistance: homeBriefModel.regimeDistance,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      statusLabel,
      trendLabel: homeBriefModel.trendLabel,
      confidencePercent: homeBriefModel.confidencePercent,
      decisionMatrix: homeBriefModel.decisionMatrix,
      decisionRules: homeBriefModel.decisionRules,
      roleAwareTemplates: homeBriefModel.roleAwareTemplates,
      evidenceItems: homeBriefModel.evidenceItems,
      reportDynamics,
      weeklyMovement: homeBriefModel.weeklyMovement,
      transitionProbabilities: homeBriefModel.transitionProbabilities,
      failureModes: homeBriefModel.failureModes,
      historicalTimeline: homeBriefModel.historicalTimeline,
    },
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
      provenance: treasuryProvenance,
      showOfflineBadge: isFallback && !historicalSelection,
      sectionLinks,
      structuredData: buildHomeStructuredData(),
      commandBar: {
        regime: assessment.regime,
        call: canonicalDecisionCopy.operatingCall,
        doNow: canonicalDecisionCopy.doNowLines,
        flipConditions: [
          canonicalDecisionCopy.flipTrigger,
          ...buildFlipConditionsWithoutTriggerDuplication({
            flipTrigger: canonicalDecisionCopy.flipTrigger,
            flipConditions: canonicalDecisionCopy.flipConditions,
            maxItems: 3,
          }),
        ],
        updatedAt: freshnessMeta.updatedAtLabel,
      },
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
