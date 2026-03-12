import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportDataSafe, type ReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  defaultSiteDescription,
  canonicalPositioningLine,
  organizationName,
  websiteName,
  buildSocialImageUrl,
} from "../lib/seo";
import { HistoricalBanner } from "./components/boardBriefSections";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildTrustStatus } from "../lib/report/trustStatus";
import { buildCompactFreshnessMeta } from "../lib/report/reportFormatting";
import { WeeklyDecisionCard } from "./components/weeklyDecisionCard";
import { buildBoardBrief, buildCallCitation } from "../lib/export/briefBuilders";
import {
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../lib/export/weeklyOperatorBrief";
import {
  buildInterpretationLayer,
  isInterpretationView,
  type InterpretationView,
} from "../lib/report/interpretationLayer";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { createBreadcrumbTrail } from "../lib/navigation/breadcrumbs";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { resolveSectorKey } from "../lib/report/sectorSensitivity";
import { LiveDataFallbackAlert } from "./components/liveDataFallbackAlert";
import { getRegimeDisplayLabel } from "../lib/regimePresentation";
import { buildPostureState } from "../lib/report/postureStateSource";
import { buildCanonicalDecisionCopy, buildFlipConditionsWithoutTriggerDuplication } from "../lib/report/canonicalDecisionCopy";
import { Skeleton } from "./components/skeleton";

export const revalidate = 900;
export const runtime = "edge";

const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#decision-snapshot-for-leadership-this-week", label: "Decide the call" },
  { href: "#execution-guidance", label: "Run the plan" },
  { href: "#evidence-diagnostics", label: "Stress-test evidence" },
] as const;


export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<Metadata> => {
  const siteName = "Whether — Startup Market Weather & Weekly Operating Posture";
  const siteDescription = defaultSiteDescription;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selection = resolveTimeMachineSelection(resolvedSearchParams);
  const requestedSelection = parseTimeMachineRequest(resolvedSearchParams);
  const baseUrl = new URL("/api/og", siteUrl);
  baseUrl.searchParams.set("template", "report");

  if (selection) {
    baseUrl.searchParams.set("month", String(selection.month));
    baseUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    baseUrl.searchParams.set("month", String(requestedSelection.month));
    baseUrl.searchParams.set("year", String(requestedSelection.year));
    baseUrl.searchParams.set("status", "invalid");
  }

  const title = "Startup market weather, weekly posture, and founder decisions — Whether";
  const imageUrl = baseUrl.toString();
  const socialImageUrl = buildSocialImageUrl();
  const canonicalUrl = buildCanonicalUrl("/");
  const hasTimeMachineParams = Boolean(
    resolvedSearchParams?.month || resolvedSearchParams?.year,
  );

  return {
    title,
    description: `${canonicalPositioningLine} Weekly answer: what to change now across hiring, fundraising, and runway.`,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description: `${canonicalPositioningLine} Weekly answer: what to change now across hiring, fundraising, and runway.`,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Whether Report Weekly briefing Open Graph",
        },
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: "Whether Report Weekly briefing Open Graph",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `${canonicalPositioningLine} Weekly answer: what to change now across hiring, fundraising, and runway.`,
      images: [imageUrl, socialImageUrl],
    },
    robots: hasTimeMachineParams
      ? {
        index: false,
        follow: true,
      }
      : undefined,

  };
};


const resolveHomepageOverlaySector = (value: string | undefined) => resolveSectorKey(value);

type HomePageSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

const HomePageStreamingFallback = () => (
  <section aria-label="Loading weekly operating posture" className="space-y-6">
    <section className="weather-panel space-y-4 px-5 py-5" aria-live="polite" aria-busy="true">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Building your weekly operator brief</p>
      <p className="text-sm text-slate-100">
        Pulling fresh signals so you can lock this week&apos;s operating call.
      </p>
      <ol className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <li className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-2">1. Sync market + labor signals</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">2. Set posture, guardrails, and flip triggers</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">3. Generate a share-ready leadership brief</li>
      </ol>
      <div className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <Skeleton className="h-3 w-32 rounded-full bg-slate-600/80" />
        <Skeleton className="h-4 w-full rounded-full bg-slate-500/80" />
        <Skeleton className="h-4 w-11/12 rounded-full bg-slate-500/70" />
        <Skeleton className="h-3 w-40 rounded-full bg-slate-600/80" />
      </div>
      <p className="text-xs text-slate-300">Usually ready in under 10 seconds for weekly standup.</p>
    </section>
    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Loading evidence">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Checking live evidence</p>
      <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <Skeleton className="h-3 w-full rounded-full bg-slate-600/70" />
        <Skeleton className="h-3 w-full rounded-full bg-slate-600/70" />
        <Skeleton className="h-3 w-11/12 rounded-full bg-slate-600/60" />
        <Skeleton className="h-3 w-7/12 rounded-full bg-slate-600/60" />
      </div>
    </section>
  </section>
);

const ArtifactActionsFallback = () => (
  <div
    aria-live="polite"
    aria-busy="true"
    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/65 px-3 py-2"
  >
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Preparing share-ready artifacts</span>
    <Skeleton className="h-9 w-36 rounded-full bg-slate-600/70" />
    <Skeleton className="h-9 w-44 rounded-full bg-slate-600/70" />
    <Skeleton className="h-9 w-40 rounded-full bg-slate-600/70" />
  </div>
);

type ArtifactActionsProps = {
  assessment: ReportData["assessment"];
  treasury: ReportData["treasury"];
  sensors: ReportData["sensors"];
  macroSeries: ReportData["macroSeries"];
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  postureState: Awaited<ReturnType<typeof buildPostureState>>;
  interpretationView: InterpretationView;
  forecast: ReportData["forecast"];
  freshnessLabel: string;
  historicalSelectionActive: boolean;
};

const buildLeadershipArtifactPayload = cache(
  async (
    assessment: ReportData["assessment"],
    treasury: ReportData["treasury"],
    sensors: ReportData["sensors"],
    macroSeries: ReportData["macroSeries"],
    homeBriefModel: ReturnType<typeof buildHomeBriefModel>,
    postureState: Awaited<ReturnType<typeof buildPostureState>>,
    interpretationView: InterpretationView,
    forecast: ReportData["forecast"],
    freshnessLabel: string,
  ) => {
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
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      actionStripItems: homeBriefModel.actionStripItems,
      flipConditionLabels: homeBriefModel.compactFlipConditionLabels,
      postureState,
      canonicalDecisionCopy,
    });
    const weeklyOperatorBriefText = buildWeeklyOperatorBriefPlainText(weeklyOperatorBriefPayload);
    const weeklyCallSnapshotText = buildWeeklyCallSnapshotPlainText({
      regime: canonicalDecisionCopy.currentRegimeLabel,
      call: canonicalDecisionCopy.operatingCall,
      trend: homeBriefModel.trendLabel,
      confidence: `${Math.round(homeBriefModel.confidencePercent)}% (${homeBriefModel.confidenceLabel})`,
      doNow: canonicalDecisionCopy.doNowLines[0],
      avoid: homeBriefModel.executiveOperationalStance.avoid[0] ?? homeBriefModel.guardrail,
      watch: canonicalDecisionCopy.flipTrigger,
      flipConditions: canonicalDecisionCopy.flipConditions,
    });
    const callCitation = buildCallCitation(assessment, treasury, {
      interpretationLayer,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    });

    return {
      boardSummary,
      weeklyOperatorBriefText,
      weeklyCallSnapshotText,
      callCitation,
    };
  },
);

const LeadershipArtifactActions = async ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  homeBriefModel,
  postureState,
  interpretationView,
  forecast,
  freshnessLabel,
  historicalSelectionActive,
}: ArtifactActionsProps) => {
  const {
    boardSummary,
    weeklyOperatorBriefText,
    weeklyCallSnapshotText,
    callCitation,
  } = await buildLeadershipArtifactPayload(
    assessment,
    treasury,
    sensors,
    macroSeries,
    homeBriefModel,
    postureState,
    interpretationView,
    forecast,
    freshnessLabel,
  );

  return (
    <CopyLeadershipArtifactsButtons
      weeklyCallSnapshot={weeklyCallSnapshotText}
      weeklyOperatorBrief={weeklyOperatorBriefText}
      boardSummary={boardSummary}
      citation={callCitation}
      fallbackActive={!historicalSelectionActive && Boolean(treasury.fallback_at || treasury.fallback_reason)}
    />
  );
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
      name: "Whether Report — Weekly briefing",
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

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  return (
    <Suspense fallback={<HomePageStreamingFallback />}>
      <HomePageReportContent searchParams={searchParams} />
    </Suspense>
  );
}

export const HomePageReportContent = async ({
  searchParams,
}: {
  searchParams?: HomePageSearchParams | Promise<HomePageSearchParams>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const homepageOverlaySector = resolveHomepageOverlaySector(resolvedSearchParams?.sector);
  const interpretationView: InterpretationView = isInterpretationView(resolvedSearchParams?.view)
    ? resolvedSearchParams.view
    : "default";
  const sectionLinks = homeSectionSequence.map((section) => ({
    href: section.href,
    label: section.label,
  }));
  const structuredData = buildHomeStructuredData();

  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const {
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
    confidenceHistory,
    confidenceTrend,
  } = reportData;
  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = historicalSelection
    ? buildTimeMachineHref("/signals?advanced=1#time-machine", historicalSelection)
    : "/signals?advanced=1#time-machine";
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
  const postureStatePromise = buildPostureState({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics,
  });
  const postureState = await postureStatePromise;
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

  return (
    <ReportShell
      regime={assessment.regime}
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      freshnessLine={freshnessMeta.line}
      treasurySource={treasury.source}
      trustStatusLabel={trustStatusLabel}
      trustStatusDetail={trustStatusDetail}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      provenance={treasuryProvenance}
      showOfflineBadge={isFallback && !historicalSelection}
      pageTitle="Weekly Operating Posture Brief"
      currentPath="/"
      pageSummary="Whether translates macro conditions into operating decisions for companies. Action, guardrail, and flip condition for this planning cycle; scores stay contextual."
      primaryCta={{
        href: "#citation-actions",
        label: "Prepare Weekly Operator Brief",
      }}
      secondaryCta={{
        href: "/operations",
        label: "View action playbook",
      }}
      nextStep={{
        href: "/signals",
        description: "Inspect evidence in Signals",
      }}
      sidebarVariant="hidden"
      hideHeroChrome={true}
      pageNavVariant="compact"
      showPageNavigation={false}
      inlineTrustPlacement="after-first-section"
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={structuredData}
      commandBar={{
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
      }}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/"
            previousHref={previousHistoricalHref}
            timeMachineHref={historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <WeeklyDecisionCard
        statusLabel={displayRegime.label}
        regimeKey={assessment.regime}
        postureLabel={homeBriefModel.postureLabel}
        stageLabel={homeBriefModel.stageLabel}
        postureWithStageLabel={homeBriefModel.postureWithStageLabel}
        postureDelta={homeBriefModel.postureDeltaLabel}
        confidenceLabel={homeBriefModel.confidenceLabel}
        confidencePercent={homeBriefModel.confidencePercent}
        signalConfidenceReason={homeBriefModel.signalConfidenceReason}
        regimeHeader={homeBriefModel.regimeHeader}
        trendLabel={homeBriefModel.trendLabel}
        confidenceHistory={confidenceHistory}
        confidenceTrend={confidenceTrend}
        regimeSignalIndicators={homeBriefModel.regimeSignalIndicators}
        transitionWatch={homeBriefModel.transitionWatch}
        operatingStanceLine={homeBriefModel.operatingStanceLine}
        weeklyMemoLines={homeBriefModel.weeklyMemoLines}
        netConstraintSummary={homeBriefModel.netConstraintSummary}
        guardrail={homeBriefModel.guardrail}
        reversalTrigger={homeBriefModel.reversalTrigger}
        actionNowShort={homeBriefModel.actionNowShort}
        guardrailThreshold={homeBriefModel.guardrailThreshold}
        flipThreshold={homeBriefModel.flipThreshold}
        compactFlipConditionLabels={homeBriefModel.compactFlipConditionLabels}
        canonicalFlipConditions={homeBriefModel.canonicalFlipConditions}
        canonicalDecisionCopy={canonicalDecisionCopy}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
        freshnessLine={freshnessMeta.line}
        reportDynamics={reportDynamics}
        decisionShiftSummary={homeBriefModel.decisionShiftSummary}
        transitionProbabilities={homeBriefModel.transitionProbabilities}
        decisionRules={homeBriefModel.decisionRules}
        decisionMatrix={homeBriefModel.decisionMatrix}
        startupVariantPolicy={homeBriefModel.startupVariantPolicy}
        actionStripItems={homeBriefModel.actionStripItems}
        roleAwareTemplates={homeBriefModel.roleAwareTemplates}
        executiveOperationalStance={homeBriefModel.executiveOperationalStance}
        revisitDecisions={homeBriefModel.revisitDecisions}
        weeklyMovement={homeBriefModel.weeklyMovement}
        memoryRail={homeBriefModel.memoryRail}
        historicalTimeline={homeBriefModel.historicalTimeline}
        historicalAnalogs={homeBriefModel.historicalAnalogs}
        macroOverlay={homeBriefModel.macroOverlay}
        whyThisCall={homeBriefModel.whyThisCall}
        evidenceItems={homeBriefModel.evidenceItems}
        startupClimateIndex={homeBriefModel.startupClimateIndex}
        regimeDistance={homeBriefModel.regimeDistance}
        regimeVelocity={homeBriefModel.regimeVelocity}
        citation={buildCallCitation(assessment, treasury, {
          postureWithStageLabel: homeBriefModel.postureWithStageLabel,
        })}
        isFallbackSnapshot={isFallback && !historicalSelection}
        failureModes={homeBriefModel.failureModes}
        actions={(
          <Suspense fallback={<ArtifactActionsFallback />}>
            <LeadershipArtifactActions
              assessment={assessment}
              treasury={treasury}
              sensors={sensors}
              macroSeries={macroSeries}
              homeBriefModel={homeBriefModel}
              postureState={postureState}
              interpretationView={interpretationView}
              forecast={forecast}
              freshnessLabel={freshnessMeta.updatedAtLabel}
              historicalSelectionActive={Boolean(historicalSelection)}
            />
          </Suspense>
        )}
      />


      <section className="weather-panel space-y-4 px-5 py-4" aria-label="Secondary navigation">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Need deeper analysis?</p>
        <p className="text-sm text-slate-200">Keep this page as the weekly call surface. Open detailed workflows only when you need diagnostics or role-specific plans.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Link prefetch={false} href="/operations" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Execution playbook</span>
            <span className="mt-1 block text-slate-300">Approve/hold/escalate plans by function.</span>
          </Link>
          <Link prefetch={false} href="/signals" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Evidence + drivers</span>
            <span className="mt-1 block text-slate-300">Inspect raw indicators, deltas, and provenance.</span>
          </Link>
          <Link prefetch={false} href="/decide" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Decision scenarios</span>
            <span className="mt-1 block text-slate-300">Stress-test thresholds and reversal conditions.</span>
          </Link>
        </div>
      </section>

      {!reportResult.ok ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={reportResult.fallback.lastCachedTimestamp}
          followUpLabel="Review live evidence"
        />
      ) : null}
    </ReportShell>
  );
};
