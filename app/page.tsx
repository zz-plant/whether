import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportDataSafe } from "../lib/report/reportData";
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
import { WeeklyDecisionCard } from "./components/weeklyDecisionCard";
import { buildBoardBrief, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import {
  buildInterpretationLayer,
  isInterpretationView,
  type InterpretationView,
} from "../lib/report/interpretationLayer";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { createBreadcrumbTrail } from "../lib/navigation/breadcrumbs";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { resolveSectorKey } from "../lib/report/sectorSensitivity";
import { getFeaturedConceptArticles } from "../lib/productCanon";
import { LiveDataFallbackAlert } from "./components/liveDataFallbackAlert";
import { HomeInterpretationPanel } from "./components/homeInterpretationPanel";
import { DeferredSection } from "./components/deferredSection";
import { getRegimeDisplayLabel } from "../lib/regimePresentation";
import { navigationLayers } from "../lib/navigation/informationArchitecture";
import { HomeFirstRunOrientation } from "./components/homeFirstRunOrientation";
import { ResponsiveDetailsPanel } from "./components/responsiveDetailsPanel";

const WeeklyActionSummaryPanel = dynamic(
  () => import("./components/boardBriefSections").then((module) => module.WeeklyActionSummaryPanel),
  {},
);

const ExecutiveSnapshotPanel = dynamic(
  () => import("./components/boardBriefSections").then((module) => module.ExecutiveSnapshotPanel),
  {},
);

const WeeklyActionSummaryFallback = () => (
  <section id="weekly-action-summary" aria-label="Weekly decisions" className="space-y-8">
    <div className="weather-panel px-5 py-5 text-sm text-slate-200">Putting together this week&apos;s decisions…</div>
  </section>
);

const ExecutiveSnapshotFallback = () => (
  <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
    <div className="weather-panel px-5 py-5 text-sm text-slate-200">Collecting the latest evidence snapshot…</div>
  </section>
);

export const revalidate = 900;
export const runtime = "edge";

const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "Call" },
  { href: "#decision-snapshot-for-leadership-this-week", label: "Decide the call" },
  { href: "#execution-guidance", label: "Run the plan" },
  { href: "#evidence-diagnostics", label: "Stress-test evidence" },
] as const;

const firstRunDestinationKeys = ["signals", "operations", "decide"] as const;

const homeQuickActions = [
  { label: "Weekly brief", href: "/" },
  { label: "Learn", href: "/learn" },
  { label: "Review evidence", href: "/signals" },
  { label: "Apply operations", href: "/operations" },
  { label: "Choose decision path", href: "/decide" },
  { label: "Run toolkit", href: "/toolkits" },
  { label: "Inspect methodology", href: "/method" },
];


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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Preparing this week&apos;s call</p>
      <p className="text-sm text-slate-100">
        We&apos;re assembling your weekly decision brief.
      </p>
      <ol className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <li className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-2">1. Refresh signals</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">2. Set posture + guardrails</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">3. Prepare a share-ready brief</li>
      </ol>
      <div className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-slate-600/80" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-500/80" />
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-500/70" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-slate-600/80" />
      </div>
      <p className="text-xs text-slate-300">Usually ready in under 10 seconds.</p>
    </section>
    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Loading evidence">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Checking live evidence</p>
      <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-600/70" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-600/70" />
        <div className="h-3 w-11/12 animate-pulse rounded-full bg-slate-600/60" />
        <div className="h-3 w-7/12 animate-pulse rounded-full bg-slate-600/60" />
      </div>
    </section>
  </section>
);

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

const HomePageReportContent = async ({
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
  const firstRunDestinations = firstRunDestinationKeys
    .map((key) => navigationLayers.find((layer) => layer.key === key))
    .filter((layer): layer is (typeof navigationLayers)[number] => layer !== undefined);

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
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
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
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  }, { overlaySector: homepageOverlaySector });
  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: reportDynamics.directionLabel,
    confidence: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch === "ON",
  });

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
  };
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries, exportLayerOptions);
  const boardSummary = buildBoardBrief(assessment, treasury, sensors, macroSeries, exportLayerOptions);
  const callCitation = buildCallCitation(assessment, treasury, {
    interpretationLayer,
    postureWithStageLabel: homeBriefModel.postureWithStageLabel,
  });
  const featuredConcepts = getFeaturedConceptArticles().slice(0, 3);
  return (
    <ReportShell
      regime={assessment.regime}
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      treasurySource={treasury.source}
      trustStatusLabel={trustStatusLabel}
      trustStatusDetail={trustStatusDetail}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      provenance={treasuryProvenance}
      showOfflineBadge={isFallback && !historicalSelection}
      pageTitle="Weekly Operating Posture Brief"
      currentPath="/"
      pageSummary="Action, guardrail, and flip condition for this planning cycle; scores stay contextual."
      primaryCta={{
        href: "#citation-actions",
        label: "Copy weekly brief",
        copyText: slackBrief,
        copyTarget: "Slack",
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
        postureLabel={homeBriefModel.postureLabel}
        stageLabel={homeBriefModel.stageLabel}
        postureWithStageLabel={homeBriefModel.postureWithStageLabel}
        postureDelta={homeBriefModel.postureDeltaLabel}
        confidenceLabel={homeBriefModel.confidenceLabel}
        confidencePercent={homeBriefModel.confidencePercent}
        signalConfidenceReason={homeBriefModel.signalConfidenceReason}
        trendLabel={homeBriefModel.trendLabel}
        transitionWatch={homeBriefModel.transitionWatch}
        operatingStanceLine={homeBriefModel.operatingStanceLine}
        weeklyMemoLines={homeBriefModel.weeklyMemoLines}
        netConstraintSummary={homeBriefModel.netConstraintSummary}
        guardrail={homeBriefModel.guardrail}
        reversalTrigger={homeBriefModel.reversalTrigger}
        actionNowShort={homeBriefModel.actionNowShort}
        guardrailThreshold={homeBriefModel.guardrailThreshold}
        flipThreshold={homeBriefModel.flipThreshold}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
        reportDynamics={reportDynamics}
        decisionShiftSummary={homeBriefModel.decisionShiftSummary}
        transitionProbabilities={homeBriefModel.transitionProbabilities}
        decisionRules={homeBriefModel.decisionRules}
        actionStripItems={homeBriefModel.actionStripItems}
        roleAwareTemplates={homeBriefModel.roleAwareTemplates}
        executiveOperationalStance={homeBriefModel.executiveOperationalStance}
        revisitDecisions={homeBriefModel.revisitDecisions}
        memoryRail={homeBriefModel.memoryRail}
        historicalTimeline={homeBriefModel.historicalTimeline}
        historicalAnalogs={homeBriefModel.historicalAnalogs}
        macroOverlay={homeBriefModel.macroOverlay}
        whyThisCall={homeBriefModel.whyThisCall}
        primaryDrivers={homeBriefModel.primaryDrivers}
        startupClimateIndex={homeBriefModel.startupClimateIndex}
        regimeDistance={homeBriefModel.regimeDistance}
        regimeVelocity={homeBriefModel.regimeVelocity}
        citation={callCitation}
        isFallbackSnapshot={isFallback && !historicalSelection}
        failureModes={homeBriefModel.failureModes}
        actions={<CopyLeadershipArtifactsButtons slackBrief={slackBrief} boardSummary={boardSummary} citation={callCitation} />}
      />


      <DeferredSection
        id="weekly-action-summary"
        ariaLabel="Decisions"
        fallback={<WeeklyActionSummaryFallback />}
      >
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </DeferredSection>

      <ResponsiveDetailsPanel
        className="weather-panel px-5 py-4"
        summary="Evidence appendix (tap to expand)"
        summaryClassName="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 sm:hidden"
      >
        <DeferredSection
          id="executive-snapshot"
          ariaLabel="Leadership summary"
          fallback={<ExecutiveSnapshotFallback />}
        >
          <ExecutiveSnapshotPanel
            treasury={treasury}
            assessment={assessment}
            provenance={treasuryProvenance}
            sectionId="executive-snapshot-evidence"
          />
        </DeferredSection>
      </ResponsiveDetailsPanel>

      <HomeInterpretationPanel
        layer={interpretationLayer}
        searchParams={resolvedSearchParams}
      />

      <HomeFirstRunOrientation
        changeSummary={homeBriefModel.decisionShiftSummary}
        decisionNow={homeBriefModel.operatingStanceLine}
        destinations={firstRunDestinations}
        quickActions={[...homeQuickActions]}
        featuredConcepts={featuredConcepts}
        currentPath="/"
      />

      {!reportResult.ok ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={reportResult.fallback.lastCachedTimestamp}
          followUpLabel="Review live evidence"
        />
      ) : null}
    </ReportShell>
  );
};
