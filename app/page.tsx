import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildTrustStatus } from "../lib/report/trustStatus";
import { buildCompactFreshnessMeta } from "../lib/report/reportFormatting";
import { WeeklyDecisionCard, WeeklyDecisionDiagnosticsLane } from "./components/weeklyDecisionCard";
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
import { homeSectionSequence } from "../lib/report/homeSections";
import { StagedReveal } from "./components/stagedReveal";

export const revalidate = 900;
export const runtime = "edge";

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
  <section aria-label="Loading weekly operating posture" className="space-y-5" aria-live="polite" aria-busy="true">
    <section className="weather-panel space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Building this week&apos;s operator brief</p>
          <p className="max-w-xl text-sm text-slate-100">Live signals are loading. We&apos;ll land on a call, actions, and flip conditions.</p>
          <p className="text-[11px] text-slate-300">Usually ready in under 10 seconds for weekly standup.</p>
        </div>
        <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
          Live refresh
        </span>
      </div>

      <ol className="grid gap-1.5 text-xs sm:grid-cols-3 sm:gap-2">
        <li className="rounded-lg border border-cyan-300/35 bg-cyan-300/12 px-3 py-2.5 text-cyan-50" aria-current="step">
          <span className="font-semibold">1. Sync signals</span>
          <span className="mt-1 block text-cyan-100/85">Market, labor, and credit inputs</span>
        </li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/65 px-3 py-2.5 text-slate-200">
          <span className="font-semibold">2. Set posture</span>
          <span className="mt-1 block text-slate-300">Guardrails + flip triggers</span>
        </li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/65 px-3 py-2.5 text-slate-200">
          <span className="font-semibold">3. Build artifact</span>
          <span className="mt-1 block text-slate-300">Share-ready weekly call snapshot</span>
        </li>
      </ol>

      <div className="space-y-2.5 rounded-xl border border-slate-700/80 bg-slate-900/70 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-2.5 w-32 rounded-full bg-slate-600/80" />
          <Skeleton className="h-2.5 w-16 rounded-full bg-slate-600/60" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg bg-slate-500/70" />
        <Skeleton className="h-8 w-full rounded-lg bg-slate-500/65" />
        <Skeleton className="h-2.5 w-10/12 rounded-full bg-slate-500/55" />
      </div>
    </section>

    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Checking live evidence stream">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Checking live evidence</p>
        <Skeleton className="h-3 w-24 rounded-full bg-slate-600/65" />
      </div>
      <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <Skeleton className="h-3 w-full rounded-full bg-slate-600/70" />
        <Skeleton className="h-3 w-11/12 rounded-full bg-slate-600/65" />
        <Skeleton className="h-3 w-4/5 rounded-full bg-slate-600/60" />
        <Skeleton className="h-3 w-7/12 rounded-full bg-slate-600/60" />
      </div>
    </section>
  </section>
);

const ArtifactActionsFallback = () => (
  <div
    aria-busy="true"
    aria-label="Loading share artifacts"
    className="space-y-3 rounded-lg border border-slate-700/70 bg-slate-950/65 px-3 py-3"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Preparing share artifacts</span>
      <Skeleton className="h-3 w-16 rounded-full bg-slate-600/60" />
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
    </div>
  </div>
);

const WeeklyDiagnosticsFallback = () => (
  <section aria-label="Loading diagnostics lane" className="space-y-3" aria-busy="true">
    <article className="rounded-xl border border-slate-800/45 bg-slate-950/62 p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-44 rounded-full bg-slate-600/75" />
        <Skeleton className="h-3 w-20 rounded-full bg-slate-600/65" />
      </div>
      <Skeleton className="mt-3 h-10 w-full rounded-lg bg-slate-600/55" />
      <Skeleton className="mt-2 h-10 w-full rounded-lg bg-slate-600/55" />
      <Skeleton className="mt-2 h-10 w-11/12 rounded-lg bg-slate-600/50" />
    </article>
    <article className="rounded-xl border border-slate-700/55 bg-slate-950/84 p-5">
      <Skeleton className="h-4 w-40 rounded-full bg-slate-600/75" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-16 w-full rounded-lg bg-slate-600/55" />
        <Skeleton className="h-16 w-full rounded-lg bg-slate-600/55" />
      </div>
    </article>
  </section>
);

type WeeklyDecisionDiagnosticsLaneDeferredProps = {
  weeklyMemoLines: string[];
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

const WeeklyDecisionDiagnosticsLaneDeferred = async ({
  weeklyMemoLines,
  immediateDecision,
  revisitDecisions,
  guardrail,
  regimeDistance,
  postureWithStageLabel,
  statusLabel,
  trendLabel,
  confidencePercent,
  decisionMatrix,
  decisionRules,
  roleAwareTemplates,
  evidenceItems,
  reportDynamics,
  weeklyMovement,
  transitionProbabilities,
  failureModes,
  historicalTimeline,
}: WeeklyDecisionDiagnosticsLaneDeferredProps) => {
  await Promise.resolve();

  return (
    <WeeklyDecisionDiagnosticsLane
      weeklyMemoLines={weeklyMemoLines}
      immediateDecision={immediateDecision}
      revisitDecisions={revisitDecisions}
      guardrail={guardrail}
      regimeDistance={regimeDistance}
      postureWithStageLabel={postureWithStageLabel}
      statusLabel={statusLabel}
      trendLabel={trendLabel}
      confidencePercent={confidencePercent}
      decisionMatrix={decisionMatrix}
      decisionRules={decisionRules}
      roleAwareTemplates={roleAwareTemplates}
      evidenceItems={evidenceItems}
      reportDynamics={reportDynamics}
      weeklyMovement={weeklyMovement}
      transitionProbabilities={transitionProbabilities}
      failureModes={failureModes}
      historicalTimeline={historicalTimeline}
    />
  );
};

type ArtifactActionsProps = {
  artifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
};

type ArtifactPayload = {
  boardSummary: string;
  weeklyOperatorBriefText: string;
  weeklyCallSnapshotText: string;
  callCitation: string;
};

type BuildArtifactPayloadArgs = {
  assessment: ReportData["assessment"];
  treasury: ReportData["treasury"];
  sensors: ReportData["sensors"];
  macroSeries: ReportData["macroSeries"];
  homeBriefModel: ReturnType<typeof buildHomeBriefModel>;
  postureState: Awaited<ReturnType<typeof buildPostureState>>;
  interpretationView: InterpretationView;
  forecast: ReportData["forecast"];
  freshnessLabel: string;
};

const buildLeadershipArtifactPayload = async ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  homeBriefModel,
  postureState,
  interpretationView,
  forecast,
  freshnessLabel,
}: BuildArtifactPayloadArgs): Promise<ArtifactPayload | null> => {
  await Promise.resolve();

  let artifactPayload: ArtifactPayload | null = null;

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

    artifactPayload = {
      boardSummary,
      weeklyOperatorBriefText,
      weeklyCallSnapshotText,
      callCitation,
    };
  } catch (error) {
    console.error("[home] leadership artifact export unavailable", error);
  }

  return artifactPayload;
};

const LeadershipArtifactActions = async ({
  artifactPayloadPromise,
  fallbackActive,
}: ArtifactActionsProps) => {
  const artifactPayload = await artifactPayloadPromise;

  if (!artifactPayload) {
    return (
      <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
        Artifact export is temporarily unavailable. Use the weekly call card as the source of truth while we recover.
      </p>
    );
  }

  return (
    <CopyLeadershipArtifactsButtons
      weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
      weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
      boardSummary={artifactPayload.boardSummary}
      citation={artifactPayload.callCitation}
      fallbackActive={fallbackActive}
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
  const immediateDecision = canonicalDecisionCopy.doNowLines[0]
    ?? homeBriefModel.actionNowShort?.trim()
    ?? (homeBriefModel.revisitDecisions
      ? "Revise hiring and roadmap calls now."
      : "Hold last week's operating rules.");

  const leadershipArtifactPayloadPromise = buildLeadershipArtifactPayload({
    assessment,
    treasury,
    sensors,
    macroSeries,
    homeBriefModel,
    postureState,
    interpretationView,
    forecast,
    freshnessLabel: freshnessMeta.updatedAtLabel,
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
          <StagedReveal
            delayMs={220}
            placeholder={<div className="h-[98px] rounded-lg border border-slate-800/60 bg-slate-950/35" aria-hidden="true" />}
          >
            <Suspense fallback={<ArtifactActionsFallback />}>
              <LeadershipArtifactActions
                artifactPayloadPromise={leadershipArtifactPayloadPromise}
                fallbackActive={!historicalSelection && Boolean(treasury.fallback_at || treasury.fallback_reason)}
              />
            </Suspense>
          </StagedReveal>
        )}
        diagnosticsLane={(
          <StagedReveal
            delayMs={520}
            placeholder={<div className="h-[238px] rounded-xl border border-slate-800/60 bg-slate-950/35" aria-hidden="true" />}
          >
            <Suspense fallback={<WeeklyDiagnosticsFallback />}>
              <WeeklyDecisionDiagnosticsLaneDeferred
                weeklyMemoLines={homeBriefModel.weeklyMemoLines}
                immediateDecision={immediateDecision}
                revisitDecisions={homeBriefModel.revisitDecisions}
                guardrail={homeBriefModel.guardrail}
                regimeDistance={homeBriefModel.regimeDistance}
                postureWithStageLabel={homeBriefModel.postureWithStageLabel}
                statusLabel={statusLabel}
                trendLabel={homeBriefModel.trendLabel}
                confidencePercent={homeBriefModel.confidencePercent}
                decisionMatrix={homeBriefModel.decisionMatrix}
                decisionRules={homeBriefModel.decisionRules}
                roleAwareTemplates={homeBriefModel.roleAwareTemplates}
                evidenceItems={homeBriefModel.evidenceItems}
                reportDynamics={reportDynamics}
                weeklyMovement={homeBriefModel.weeklyMovement}
                transitionProbabilities={homeBriefModel.transitionProbabilities}
                failureModes={homeBriefModel.failureModes}
                historicalTimeline={homeBriefModel.historicalTimeline}
              />
            </Suspense>
          </StagedReveal>
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
