import type { Metadata } from "next";
import {
  resolveTimeMachineSelection,
  parseTimeMachineRequest,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  defaultSiteDescription,
  organizationName,
  websiteName,
} from "../lib/seo";
import {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { RelatedReportLinks } from "./components/relatedReportLinks";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const homeSectionSequence = [
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "#signal-matrix", label: "Signal breakdown" },
  { href: "#evidence-matrix", label: "Evidence matrix" },
] as const;

const regimeLabelMap = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Neutral",
  EXPANSION: "Expansion",
} as const;

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<Metadata> => {
  const siteName = "Whether — Market Climate Station";
  const siteDescription = defaultSiteDescription;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selection = resolveTimeMachineSelection(resolvedSearchParams);
  const requestedSelection = parseTimeMachineRequest(resolvedSearchParams);
  const baseUrl = new URL("/api/og", siteUrl);

  if (selection) {
    baseUrl.searchParams.set("month", String(selection.month));
    baseUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    baseUrl.searchParams.set("month", String(requestedSelection.month));
    baseUrl.searchParams.set("year", String(requestedSelection.year));
    baseUrl.searchParams.set("status", "invalid");
  }

  const title = "Macro signals for product and engineering planning — Whether";
  const imageUrl = baseUrl.toString();
  const canonicalUrl = buildCanonicalUrl("/");
  const hasTimeMachineParams = Boolean(
    resolvedSearchParams?.month || resolvedSearchParams?.year,
  );

  return {
    title,
    description:
      "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description:
        "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
      siteName,
      images: [
        {
          url: imageUrl,
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
        "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
      images: [imageUrl],
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
        logo: `${siteUrl}/icon.png`,
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
          isBasedOn: {
            "@type": "CreativeWork",
            name: "US Treasury Fiscal Data API",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
          },
        },
      },
      buildBreadcrumbList([{ name: "Weekly briefing", path: "/" }]),
    ],
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    regimeAlert,
    lastYearComparison,
    startItems,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  } = await loadReportData(resolvedSearchParams);
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using last verified snapshot"
      : "Live • Treasury verified";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Live refresh pending. Using last verified snapshot.")
      : "Live refresh healthy. Next expected update: 48h.";
  const trustStatusAction = historicalSelection
    ? "Use for retrospectives only; avoid live planning calls until you return to current data."
    : isFallback
      ? "Pause irreversible decisions until the live feed returns or you confirm the cache."
      : "Safe to use for near-term planning; proceed with normal approval flow.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const postureDelta = regimeAlert
    ? `Shifted from ${regimeLabelMap[regimeAlert.previousRegime]}.`
    : "No change since last week.";
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  return (
    <ReportShell
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      treasurySource={treasury.source}
      trustStatusLabel={trustStatusLabel}
      trustStatusDetail={trustStatusDetail}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      showOfflineBadge={isFallback && !historicalSelection}
      pageTitle="Current Climate"
      currentPath="/"
      pageSummary="Canonical operating posture for the current cycle."
      primaryCta={{
        href: "#weekly-action-summary",
        label: "Review posture details",
      }}
      secondaryCta={{
        href: "#executive-snapshot",
        label: "What changed this week",
      }}
      sidebarVariant="hidden"
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
    >
      <section
        aria-labelledby="decision-card-title"
        className="weather-panel space-y-10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.3)_45%,rgba(2,6,23,0.92)_75%)] px-6 py-10 sm:space-y-12 sm:py-12"
      >
        <div className="space-y-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">
            Posture for the next 2–6 weeks
          </p>
          <h1 id="decision-card-title" className="text-4xl font-semibold text-slate-100 sm:text-5xl">
            How should your company operate right now?
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-300">
            Live market and capital conditions translated into a clear operating posture for the next cycle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4 sm:py-6">
            <p className="text-7xl font-bold tracking-[-0.04em] text-slate-50 sm:text-8xl">{statusLabel}</p>
            <a
              href="/signals#current-scores"
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-sky-100 hover:border-sky-300/80"
            >
              Why?
            </a>
          </div>
          <p className="text-sm font-semibold tracking-[0.08em] text-slate-100">{postureDelta}</p>
          <p className="text-xs text-slate-300">Since Last Review: {postureDelta}</p>
          <a
            href="/signals#regime-timeline"
            className="inline-flex min-h-[44px] items-center justify-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
          >
            What changed?
          </a>
          <p className="text-[11px] font-medium tracking-[0.14em] text-slate-400">
            Updated {recordDateLabel} · Confidence: {trustStatusLabel} · Next refresh expected: 48h
          </p>
        </div>

        <article className="weather-surface space-y-4 p-5" aria-label="Current climate summary">
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-sm text-slate-300">{trustStatusAction}</p>
        </article>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="weather-surface space-y-3 p-5" aria-label="Prioritize">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Prioritize</h2>
            <ul className="space-y-2 text-sm text-slate-100">
              {startItems.slice(0, 5).map((item) => (
                <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />{item}</li>
              ))}
            </ul>
          </article>
          <article className="weather-surface space-y-3 p-5" aria-label="Avoid">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Avoid</h2>
            <ul className="space-y-2 text-sm text-slate-100">
              {stopItems.slice(0, 5).map((item) => (
                <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="weather-surface space-y-3 p-5" aria-label="Posture change triggers">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What would change this posture</p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>• Will shift if Capital Tightness rises above {tightnessThreshold} for two consecutive reads.</li>
            <li>• Will shift if Risk Appetite falls below {riskThreshold} and remains there through the next update.</li>
            <li>• Curve slope turns negative and stays inverted through the next cycle.</li>
          </ul>
        </article>
      </section>

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

      <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
        <ExecutiveSnapshotPanel
          treasury={treasury}
          assessment={assessment}
          provenance={treasuryProvenance}
        />
      </section>

      <section id="signal-matrix" aria-label="Signal breakdown" className="space-y-8">
        <SignalMatrixPanel
          assessment={assessment}
          provenance={treasuryProvenance}
        />
      </section>

      <section
        id="evidence-matrix"
        aria-labelledby="evidence-matrix-title"
        className="weather-panel space-y-4 px-6 py-5"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Evidence matrix
          </p>
          <h2
            id="evidence-matrix-title"
            className="text-xl font-semibold text-slate-100 sm:text-2xl"
          >
            Deep evidence has moved to the dedicated Evidence page.
          </h2>
          <p className="text-sm text-slate-300">
            Keep the decide screen focused on action; use Evidence for full macro series,
            thresholds, and source-level methodology.
          </p>
        </header>
        <RelatedReportLinks
          title="Open Evidence"
          links={[
            {
              href: "/signals",
              label: "Evidence",
              description:
                "Inspect the full macro evidence matrix, historical series context, and source links.",
            },
            {
              href: "/solutions/product-roadmapping",
              label: "Product roadmapping",
              description:
                "Apply macro signals to product roadmap sequencing, pricing posture, and launch timing.",
            },
            {
              href: "/solutions/engineering-capacity",
              label: "Engineering capacity planning",
              description:
                "Use regime-aware signals to plan hiring, delivery risk, and reliability investments.",
            },
            {
              href: "/solutions/market-regime-playbook",
              label: "Market regime playbook",
              description:
                "Operational playbook for high, moderate, and low market-stress environments.",
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}
