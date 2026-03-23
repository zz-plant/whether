import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../timeMachine/timeMachineSelection";
import { type ReportData, type ReportDataFallback } from "./reportData";
import { buildTrustStatus } from "./trustStatus";
import { buildCompactFreshnessMeta } from "./reportFormatting";
import { formatSourceFreshnessLabel, formatSourceModeLabel } from "./sourceHealth";
import {
  buildInterpretationLayer,
  isInterpretationView,
  type InterpretationLayer,
  type InterpretationView,
} from "./interpretationLayer";
import { buildBoardBrief, buildCallCitation } from "../export/briefBuilders";
import {
  buildWeeklyBoardSnippetPlainText,
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
  decideHomeRecommendedToolkitSlugs,
  findToolkitDefinition,
  situationUseCaseDefinitions,
  useCaseRoles,
} from "../decisionDomainCatalog";
import {
  buildBreadcrumbList,
  defaultSiteDescription,
  organizationName,
  websiteName,
} from "../seo";
import { siteUrl } from "../siteUrl";
import { createBreadcrumbTrail } from "../navigation/breadcrumbs";
import type { HomePageSearchParams } from "./homeMetadata";
import { loadHomePageReportData } from "./homePageData";

export type ArtifactPayload = {
  boardSummary: string;
  boardSnippetText: string;
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

export type HomePageDiagnosticsLane = {
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

export type HomePageWorkspaceModel = {
  sectionLinks: { href: string; label: string }[];
  workspaceActions: {
    auditHref: string;
    operationsHref: string;
  };
  audit: {
    trustStatusLabel: string;
    trustStatusDetail: string;
    trustStatusAction: string;
    trustStatusTone: ReturnType<typeof buildTrustStatus>["trustStatusTone"];
    freshnessSummary: string;
    sourceCoverageLine: string;
    sourceRows: Array<{
      sourceName: string;
      modeLabel: string;
      freshnessStatus: string;
    }>;
    revisitHeadline: string;
    revisitDetail: string;
    flipHeadline: string;
    flipDetail: string;
    evidenceMovers: Array<{
      key: string;
      title: string;
      detail: string;
    }>;
  };
  replay: {
    initialDate: string;
    summary: string;
    openFullHref: string;
    preview: Array<{
      key: string;
      label: string;
      summary: string;
    }>;
  };
  operations: {
    continueHref: string;
    approvalHeadline: string;
    approvalDetail: string;
    topGuardrails: Array<{
      key: string;
      label: string;
      detail: string;
    }>;
    financeSnapshot: Array<{
      key: string;
      label: string;
      actionNow: string;
      reversalCondition: string;
    }>;
    exportActions: Array<{
      href: string;
      label: string;
    }>;
  };
  translate: {
    rolePath: {
      href: string;
      title: string;
      detail: string;
    };
    situationPath: {
      href: string;
      title: string;
      detail: string;
    };
    toolkitShortcuts: Array<{
      href: string;
      title: string;
      detail: string;
    }>;
    decisionUtilities: Array<{
      href: string;
      title: string;
      detail: string;
    }>;
    browseActions: Array<{
      href: string;
      label: string;
    }>;
  };
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
  reportResult: Awaited<ReturnType<typeof loadHomePageReportData>>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  diagnosticsLanePromise: Promise<HomePageDiagnosticsLane>;
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
  interpretationLayer: InterpretationLayer;
  interpretationSearchParams?: Record<string, string | undefined>;
  fallbackActive: boolean;
};

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

const buildDiagnosticsLanePayload = ({
  homeBriefModel,
  weeklyDecisionCardModel,
  statusLabel,
  reportDynamics,
}: {
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  statusLabel: string;
  reportDynamics: ReportData["reportDynamics"];
}): HomePageDiagnosticsLane => ({
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
});

const buildSourceCoverageLine = (rows: ReportData["sourceHealth"] | ReportDataFallback["sourceHealth"]) => {
  const liveRows = rows.filter((row) => row.mode === "live").map((row) => row.sourceName);
  const snapshotRows = rows.filter((row) => row.mode === "snapshot").map((row) => row.sourceName);
  const fallbackRows = rows.filter((row) => row.mode === "fallback").map((row) => row.sourceName);
  const parts: string[] = [];

  if (liveRows.length > 0) {
    parts.push(`Live: ${liveRows.join(", ")}`);
  }

  if (snapshotRows.length > 0) {
    parts.push(`Slower cadence: ${snapshotRows.join(", ")}`);
  }

  if (fallbackRows.length > 0) {
    parts.push(`Degraded: ${fallbackRows.join(", ")}`);
  }

  return parts.join(" · ");
};

const buildHomeWorkspaceModel = ({
  reportData,
  diagnosticsLane,
  weeklyDecisionCardModel,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  freshnessLabel,
  sectionLinks,
}: {
  reportData: ReportData | ReportDataFallback;
  diagnosticsLane: HomePageDiagnosticsLane;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: ReturnType<typeof buildTrustStatus>["trustStatusTone"];
  freshnessLabel: string;
  sectionLinks: { href: string; label: string }[];
}): HomePageWorkspaceModel => {
  const actionStripItems = weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const financeSummaryItems = actionStripItems.filter((item) =>
    item.lever === "investment-pace" || item.lever === "risk-tolerance"
  );
  const currentRolePath = useCaseRoles.find((role) => role.slug === "ceo") ?? useCaseRoles[0];
  const currentSituationPath = diagnosticsLane.weeklyMovement.direction === "defensive"
    ? (situationUseCaseDefinitions.find((entry) => entry.slug === "avoid-premature-scaling") ?? situationUseCaseDefinitions[0])
    : (situationUseCaseDefinitions.find((entry) => entry.slug === "roadmap-focus") ?? situationUseCaseDefinitions[0]);
  const toolkitShortcuts = decideHomeRecommendedToolkitSlugs
    .map((slug) => findToolkitDefinition(slug))
    .filter((toolkit): toolkit is NonNullable<typeof toolkit> => Boolean(toolkit))
    .slice(0, 3);
  const replayPreview = diagnosticsLane.historicalTimeline
    .slice(-4)
    .map((entry) => ({
      key: `${entry.label}-${entry.recordDate ?? entry.year ?? "current"}`,
      label: entry.month && entry.year ? `${entry.label} ${String(entry.month).padStart(2, "0")}/${entry.year}` : entry.label,
      summary: entry.summary ?? entry.posture,
    }));

  return {
    sectionLinks,
    workspaceActions: {
      auditHref: "#audit-this-call",
      operationsHref: "#approve-this-weeks-plan",
    },
    audit: {
      trustStatusLabel,
      trustStatusDetail,
      trustStatusAction,
      trustStatusTone,
      freshnessSummary: freshnessLabel,
      sourceCoverageLine: buildSourceCoverageLine(reportData.sourceHealth),
      sourceRows: reportData.sourceHealth.map((row) => ({
        sourceName: row.sourceName,
        modeLabel: formatSourceModeLabel(row.mode),
        freshnessStatus: formatSourceFreshnessLabel(row),
      })),
      revisitHeadline: diagnosticsLane.revisitDecisions
        ? "YES — revisit this week's approvals now."
        : "NO — hold the current weekly baseline.",
      revisitDetail: diagnosticsLane.guardrail,
      flipHeadline: reportData.flipThreshold,
      flipDetail: weeklyDecisionCardModel.decision.reversalTrigger,
      evidenceMovers: diagnosticsLane.evidenceItems.slice(0, 3).map((item) => ({
        key: item.key,
        title: item.title,
        detail: item.immediateImplication,
      })),
    },
    replay: {
      initialDate: `${reportData.selectedYear}-${String(reportData.selectedMonth).padStart(2, "0")}-01`,
      summary: reportData.historicalSelection
        ? `Viewing ${reportData.historicalSelection.banner}. Use Weekly Brief as the source of truth before approving live commitments.`
        : "Choose any date to swap the home workspace to the closest cached monthly snapshot.",
      openFullHref: "/signals?advanced=1#time-machine",
      preview: replayPreview,
    },
    operations: {
      continueHref: "/operations#ops-monthly-action-summary",
      approvalHeadline: weeklyDecisionCardModel.decision.immediateDecision,
      approvalDetail: diagnosticsLane.revisitDecisions
        ? "Revisit last week's approvals before you add fixed cost or sequence new bets."
        : "Hold the current weekly baseline unless a flip condition or trust warning fires.",
      topGuardrails: actionStripItems.slice(0, 3).map((item) => ({
        key: item.lever,
        label: item.label,
        detail: item.triggerThreshold,
      })),
      financeSnapshot: financeSummaryItems.map((item) => ({
        key: item.lever,
        label: item.label,
        actionNow: item.actionNow,
        reversalCondition: item.reversalCondition,
      })),
      exportActions: [
        { href: "/operations#ops-export-briefs", label: "Open share brief" },
        { href: "/operations#ops-finance-strategy", label: "Open finance detail" },
      ],
    },
    translate: {
      rolePath: {
        href: `/decide/${currentRolePath.slug}`,
        title: currentRolePath.title,
        detail: currentRolePath.decisions[0],
      },
      situationPath: {
        href: `/decide/${currentSituationPath.slug}`,
        title: currentSituationPath.title,
        detail: "Fastest route to this week's next action.",
      },
      toolkitShortcuts: toolkitShortcuts.map((toolkit) => ({
        href: `/toolkits/${toolkit.slug}`,
        title: toolkit.title,
        detail: toolkit.decisionThisSession,
      })),
      decisionUtilities: [
        {
          href: "/decide/ship-checklist",
          title: "Whether to ship checklist",
          detail: "Score a go / wait / kill launch decision against the current regime.",
        },
        {
          href: "/decide/team-context",
          title: "Team context profile",
          detail: "Tailor the weekly mandate by stage, sector, and operating profile.",
        },
      ],
      browseActions: [
        { href: "/decide", label: "Browse role and situation hubs" },
        { href: "/toolkits", label: "Browse all toolkits" },
      ],
    },
  };
};

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
      boardSnippetText: buildWeeklyBoardSnippetPlainText({
        trustLine: treasury.fallback_at || treasury.fallback_reason
          ? `TRUST: FALLBACK SNAPSHOT · As of ${freshnessLabel}${treasury.fallback_reason ? ` · Reason: ${treasury.fallback_reason}` : ""}`
          : `TRUST: LIVE · As of ${freshnessLabel}`,
        postureLine: `POSTURE: ${canonicalDecisionCopy.currentRegimeLabel} · ${homeBriefModel.confidenceLabel} ${Math.round(homeBriefModel.confidencePercent)}% confidence`,
        changedLine: `CHANGED: ${homeBriefModel.decisionShiftSummary.replace(/^Changed:\s*/i, "").trim()}`,
        guardrailLine: `GUARDRAIL: ${homeBriefModel.executiveOperationalStance.avoid[0] ?? homeBriefModel.guardrail}`,
        flipLine: `FLIP: ${canonicalDecisionCopy.flipTrigger}`,
        stabilityLine: "STABILITY: Act on posture changes after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.",
      }),
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
    isFallbackSnapshot: isFallback && !historicalSelection,
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
      const enrichedHomeBriefModel = buildHomeBriefModel({
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
      const canonicalDecisionCopy = buildCanonicalDecisionCopy({
        homeBriefModel: enrichedHomeBriefModel,
        postureState,
      });
      const enrichedWeeklyDecisionCardModel = buildWeeklyDecisionCardViewModel({
        homeBriefModel: enrichedHomeBriefModel,
        statusLabel: displayRegime.label,
        regimeKey: assessment.regime,
        reportDynamics,
        citation: buildCallCitation(assessment, treasury, {
          postureWithStageLabel: enrichedHomeBriefModel.postureWithStageLabel,
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
        postureState,
        homeBriefModel: enrichedHomeBriefModel,
        weeklyDecisionCardModel: enrichedWeeklyDecisionCardModel,
        canonicalDecisionCopy,
      };
    } catch (error) {
      console.error("[home] deferred posture-state enrichment unavailable", error);
      return {
        postureState: null,
        homeBriefModel,
        weeklyDecisionCardModel,
        canonicalDecisionCopy: null,
      };
    }
  })();

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
        freshnessLabel: freshnessMeta.line,
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
