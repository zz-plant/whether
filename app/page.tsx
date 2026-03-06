import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import { RevealOnView } from "./components/revealOnView";
import { DataProvenanceStrip } from "./components/dataProvenanceStrip";
import { buildBoardBrief, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { createBreadcrumbTrail } from "../lib/navigation/breadcrumbs";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { getFeaturedConceptArticles } from "../lib/productCanon";

const WeeklyActionSummaryPanel = dynamic(
  () =>
    import("./components/boardBriefSections").then(
      (module) => module.WeeklyActionSummaryPanel,
    ),
  {
    loading: () => (
      <section id="weekly-action-summary" aria-label="Weekly action summary" className="space-y-8">
        <div className="weather-panel px-5 py-5 text-sm text-slate-300">Loading weekly action summary…</div>
      </section>
    ),
  },
);

const ExecutiveSnapshotPanel = dynamic(
  () =>
    import("./components/boardBriefSections").then(
      (module) => module.ExecutiveSnapshotPanel,
    ),
  {
    loading: () => (
      <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
        <div className="weather-panel px-5 py-5 text-sm text-slate-300">Loading evidence snapshot…</div>
      </section>
    ),
  },
);

export const revalidate = 900;
export const runtime = "edge";

const homeSectionSequence = [
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

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sectionLinks = homeSectionSequence.map((section) => ({
    href: section.href,
    label: section.label,
  }));
  const structuredData = {
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
  };

  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    regimeAlert,
    reportDynamics,
    sensors,
    macroSeries,
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
    recordDateLabel,
    regimeAlert,
    reportDynamics,
    sensors,
    macroSeries,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  });
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries);
  const boardSummary = buildBoardBrief(assessment, treasury, sensors, macroSeries);
  const callCitation = buildCallCitation(assessment, treasury);
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
      showOfflineBadge={isFallback && !historicalSelection}
      pageTitle="Weekly Operating Posture Brief"
      currentPath="/"
      pageSummary="Verdict and immediate decision call for this planning cycle."
      primaryCta={{
        href: "#weekly-posture-brief-title",
        label: "Copy leadership brief (Slack)",
        copyText: slackBrief,
        copyTarget: "Slack",
      }}
      secondaryCta={{
        href: "#weekly-action-summary",
        label: "See evidence behind the call",
      }}
      nextStep={{
        href: "/signals",
        description: "Review evidence in Signals",
      }}
      sidebarVariant="hidden"
      hideHeroChrome={true}
      pageNavVariant="compact"
      showPageNavigation={false}
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
        statusLabel={statusLabel}
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
        decisionRules={homeBriefModel.decisionRules}
        revisitDecisions={homeBriefModel.revisitDecisions}
        memoryRail={homeBriefModel.memoryRail}
        whyThisCall={homeBriefModel.whyThisCall}
        primaryDrivers={homeBriefModel.primaryDrivers}
        startupClimateIndex={homeBriefModel.startupClimateIndex}
        citation={callCitation}
        actions={<CopyLeadershipArtifactsButtons slackBrief={slackBrief} boardSummary={boardSummary} citation={callCitation} />}
      />


      <DataProvenanceStrip provenance={treasuryProvenance} variant="compact" />

      <section className="weather-panel space-y-4 px-5 py-5" aria-label="Decision concept links">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Decision references</p>
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
        <section className="weather-panel border border-amber-500/50 bg-amber-500/10 px-5 py-4 text-sm text-amber-100" aria-live="polite">
          <p className="font-semibold">Live data unavailable — showing cached snapshot.</p>
          <p className="mt-1">Last cached update: {reportResult.fallback.lastCachedTimestamp}. Review <a href="/signals" className="underline">Signals</a> to retry live evidence.</p>
        </section>
      ) : null}

      <RevealOnView>
        <section
          id="weekly-action-summary"
          aria-label="Weekly action summary"
          className="space-y-8"
        >
          <WeeklyActionSummaryPanel
            assessment={assessment}
            provenance={treasuryProvenance}
            recordDateLabel={recordDateLabel}
          />
        </section>
      </RevealOnView>

      <RevealOnView>
        <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
          <ExecutiveSnapshotPanel
            treasury={treasury}
            assessment={assessment}
            provenance={treasuryProvenance}
          />
        </section>
      </RevealOnView>

    </ReportShell>
  );
}
