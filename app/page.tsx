import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import { NextStepRail } from "./components/nextStepRail";
import { getRegimeDisplayLabel } from "../lib/regimePresentation";

const WeeklyActionSummaryPanel = dynamic(
  () => import("./components/boardBriefSections").then((module) => module.WeeklyActionSummaryPanel),
  { suspense: true },
);

const ExecutiveSnapshotPanel = dynamic(
  () => import("./components/boardBriefSections").then((module) => module.ExecutiveSnapshotPanel),
  { suspense: true },
);

const WeeklyActionSummaryFallback = () => (
  <section id="weekly-action-summary" aria-label="Weekly action summary" className="space-y-8">
    <div className="weather-panel px-5 py-5 text-sm text-slate-300">Loading weekly action summary…</div>
  </section>
);

const ExecutiveSnapshotFallback = () => (
  <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
    <div className="weather-panel px-5 py-5 text-sm text-slate-300">Loading evidence snapshot…</div>
  </section>
);

export const revalidate = 900;
export const runtime = "edge";

const homeSectionSequence = [
  { href: "#weekly-posture-brief-title", label: "This week" },
  { href: "#why-whether", label: "Why Whether" },
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Evidence" },
] as const;


export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<Metadata> => {
  const siteName = "Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)";
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

  const title = "Weekly operating posture brief — Whether";
  const imageUrl = baseUrl.toString();
  const socialImageUrl = buildSocialImageUrl();
  const canonicalUrl = buildCanonicalUrl("/");
  const hasTimeMachineParams = Boolean(
    resolvedSearchParams?.month || resolvedSearchParams?.year,
  );

  return {
    title,
    description:
      "A weekly operating posture call for product/engineering/finance—based on public macro signals (with constraints + guardrails).",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description:
        "A weekly operating posture call for product/engineering/finance—based on public macro signals (with constraints + guardrails).",
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
      description:
        "A weekly operating posture call for product/engineering/finance—based on public macro signals (with constraints + guardrails).",
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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Loading this week&apos;s call</p>
      <p className="text-sm text-slate-200">
        Building your decision delta for this week.
      </p>
      <ol className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <li className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-2">1. Refresh signals</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">2. Set posture + guardrails</li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/60 px-2.5 py-2">3. Prepare share-ready brief</li>
      </ol>
      <div className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-slate-600/80" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-500/80" />
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-500/70" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-slate-600/80" />
      </div>
      <p className="text-xs text-slate-400">Usually ready in under 10 seconds.</p>
    </section>
    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Loading evidence">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Loading evidence snapshot</p>
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
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries, {
    interpretationLayer,
    postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    historicalAnalogs: homeBriefModel.historicalAnalogs,
    failureModes: homeBriefModel.failureModes,
  });
  const boardSummary = buildBoardBrief(assessment, treasury, sensors, macroSeries, {
    interpretationLayer,
    postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    historicalAnalogs: homeBriefModel.historicalAnalogs,
    failureModes: homeBriefModel.failureModes,
  });
  const callCitation = buildCallCitation(assessment, treasury, { interpretationLayer, postureWithStageLabel: homeBriefModel.postureWithStageLabel });
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
        href: "#weekly-posture-brief-title",
        label: "Prepare Monday leadership sync brief",
        copyText: slackBrief,
        copyTarget: "Slack",
      }}
      secondaryCta={{
        href: "#why-whether",
        label: "Why this over dashboards or research",
      }}
      nextStep={{
        href: "/signals",
        description: "Review evidence in Signals",
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
        trendLabel={homeBriefModel.trendLabel}
        transitionWatch={homeBriefModel.transitionWatch}
        netConstraintSummary={homeBriefModel.netConstraintSummary}
        guardrail={homeBriefModel.guardrail}
        reversalTrigger={homeBriefModel.reversalTrigger}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
        reportDynamics={reportDynamics}
        decisionShiftSummary={homeBriefModel.decisionShiftSummary}
        transitionProbabilities={homeBriefModel.transitionProbabilities}
        decisionRules={homeBriefModel.decisionRules}
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


      <HomeInterpretationPanel
        layer={interpretationLayer}
        searchParams={resolvedSearchParams}
      />

      <section id="why-whether" className="weather-panel space-y-4 px-5 py-5" aria-label="Why Whether versus alternatives">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Why Whether</p>
          <h2 className="text-base font-semibold text-slate-100">Built for a weekly operating call, not just analysis</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead>
              <tr className="border-b border-slate-700/70 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Dashboards / research stack</th>
                <th className="px-2 py-2">Whether</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/80">
                <th className="px-2 py-2 font-semibold text-slate-100">Output</th>
                <td className="px-2 py-2 text-slate-300">Evidence and commentary to interpret.</td>
                <td className="px-2 py-2 font-medium text-sky-100">One bounded weekly operating call leadership can act on.</td>
              </tr>
              <tr className="border-b border-slate-800/80">
                <th className="px-2 py-2 font-semibold text-slate-100">Cadence</th>
                <td className="px-2 py-2 text-slate-300">Ad hoc review during planning debates.</td>
                <td className="px-2 py-2 font-medium text-sky-100">Weekly ritual for Monday sync preparation.</td>
              </tr>
              <tr>
                <th className="px-2 py-2 font-semibold text-slate-100">Decision quality</th>
                <td className="px-2 py-2 text-slate-300">Generic guidance with uneven follow-through.</td>
                <td className="px-2 py-2 font-medium text-sky-100">Action + threshold + reversal condition in one artifact.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>


      <section className="weather-panel space-y-4 px-5 py-5" aria-label="Decision concept links">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Decision playbooks</p>
          <h2 className="text-base font-semibold text-slate-100">Revisit these concept playbooks before finalizing this week&apos;s plan</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {featuredConcepts.map((concept) => (
            <Link
              key={concept.slug}
              href={`/concepts/${concept.slug}`}
              className="weather-surface block space-y-2 px-4 py-3 transition-colors hover:border-sky-400/70"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{concept.focus}</p>
              <p className="text-sm font-semibold text-slate-100">{concept.title}</p>
              <p className="text-xs text-slate-300">{concept.audience}</p>
            </Link>
          ))}
        </div>
      </section>

      {!reportResult.ok ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={reportResult.fallback.lastCachedTimestamp}
          followUpLabel="Review live evidence"
        />
      ) : null}

      <DeferredSection
        id="weekly-action-summary"
        ariaLabel="Weekly action summary"
        fallback={<WeeklyActionSummaryFallback />}
      >
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </DeferredSection>

      <details className="weather-panel px-5 py-4 sm:hidden">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Evidence appendix (tap to expand)</summary>
        <DeferredSection
          id="executive-snapshot-mobile"
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
      </details>

      <div className="hidden sm:block">
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
      </div>
      <NextStepRail currentPath="/" />
    </ReportShell>
  );
};
