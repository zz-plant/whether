import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../timeMachine/timeMachineSelection";
import { buildDegradedSourceRows } from "./sourceHealth";
import type { HomePageSearchParams } from "./homeMetadata";
import { loadHomePageReportData } from "./homePageData";
import { buildWeeklyBriefSnapshot } from "./weeklyBriefSnapshot";
import { resolveStartupVariantMode } from "./boundedDecisionRules";
import { parseOperatorRunwayParam } from "./operatorRunway";
import { buildHomeStructuredData } from "./home/structuredData";
import { getRegimePublicLabel } from "../regimePresentation";
import type { OperatorContext } from "./operatorContext";
import type { HomePageAssembly } from "./home/contracts";

export type {
  HomePageAssembly,
} from "./home/contracts";

type HomePageAssemblerDependencies = {
  loadHomePageReportData: typeof loadHomePageReportData;
};

const defaultHomePageAssemblerDependencies: HomePageAssemblerDependencies = {
  loadHomePageReportData,
};

export const assembleHomePage = async ({
  searchParams,
  operatorContext,
}: {
  searchParams?: HomePageSearchParams;
  operatorContext?: OperatorContext;
}, dependencies: Partial<HomePageAssemblerDependencies> = {}): Promise<HomePageAssembly> => {
  const resolvedDependencies = {
    ...defaultHomePageAssemblerDependencies,
    ...dependencies,
  } satisfies HomePageAssemblerDependencies;
  // Only pass a stage when the operator explicitly selected one — in the URL
  // for this view, or in the stage cookie the hero selector and the settings
  // panel both write. An untouched brief keeps its canonical (stage-agnostic)
  // action copy rather than silently switching to Series A language the
  // operator never asked for.
  const startupVariantMode = searchParams?.stage
    ? resolveStartupVariantMode(searchParams.stage)
    : operatorContext?.companyStage ?? undefined;
  const runwayBand = (searchParams?.runway
    ? parseOperatorRunwayParam(searchParams.runway)
    : operatorContext?.companyRunway) ?? undefined;

  const reportResult = await resolvedDependencies.loadHomePageReportData(searchParams);
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    statusLabel,
    treasury,
    treasuryProvenance,
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
    startupVariantMode,
    runwayBand,
  });
  const { isFallback, trustStatus, weeklyDecisionCardModel, weeklyCall } = baseSnapshot;
  const { trustStatusLabel, trustStatusDetail, trustStatusAction } = trustStatus;
  return {
    reportResult,
    weeklyCall,
    weeklyDecisionCardModel,
    reportShell: {
      regime: assessment.regime,
      statusLabel,
      recordDateLabel,
      fetchedAtLabel,
      treasurySource: treasury.source,
      trustStatusLabel,
      trustStatusDetail,
      trustStatusAction,
      degradedSourceRows: buildDegradedSourceRows(reportData.sourceHealth),
      provenance: treasuryProvenance,
      showOfflineBadge: isFallback && !historicalSelection,
      structuredData: buildHomeStructuredData({
        headline: `Whether Weekly Brief — ${recordDateLabel}`,
        description: weeklyCall.currentCall,
        // ISO, not the display labels beside them — see HomeBriefStructuredDataInput.
        datePublishedIso: treasury.record_date,
        dateModifiedIso: treasury.fetched_at,
        postureLabel: weeklyDecisionCardModel.status.postureWithStageLabel
          ?? weeklyDecisionCardModel.status.statusLabel,
        regimeLabel: getRegimePublicLabel(assessment.regime),
        confidenceLabel: weeklyDecisionCardModel.status.confidenceLabel,
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
