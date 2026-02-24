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
      sidebarVariant="hidden"
      hideHeroChrome={true}
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
        className="weather-panel space-y-8 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.3)_45%,rgba(2,6,23,0.92)_75%)] px-6 py-8 sm:space-y-10 sm:py-10"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">
            Posture for the next 2–6 weeks
          </p>
          <h1 id="decision-card-title" className="text-4xl font-semibold text-slate-100 sm:text-5xl">
            How should your company operate right now?
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-300">
            Live market and capital conditions translated into a clear operating posture for the next cycle.
          </p>
          <div className="py-2 sm:py-4">
            <p className="text-5xl font-bold tracking-[-0.03em] text-slate-50 sm:text-6xl">{statusLabel}</p>
          </div>
          <p className="text-sm font-semibold tracking-[0.08em] text-slate-100">{postureDelta}</p>
          <p className="text-[11px] font-medium tracking-[0.14em] text-slate-400">
            Updated {recordDateLabel} · Confidence: {trustStatusLabel} · Next refresh expected: 48h
          </p>
        </div>

        <article className="weather-surface space-y-4 p-5" aria-label="Current climate summary">
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-sm text-slate-300">{trustStatusAction}</p>
        </article>

        <article className="weather-surface space-y-3 p-5" aria-label="Posture change triggers">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What would change this posture</p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>• Will shift if Capital Tightness rises above {tightnessThreshold} for two consecutive reads.</li>
            <li>• Will shift if Risk Appetite falls below {riskThreshold} and remains there through the next update.</li>
            <li>• Curve slope turns negative and stays inverted through the next cycle.</li>
          </ul>
        </article>

        <div className="grid gap-4">
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

      <section className="weather-panel px-6 py-5" aria-label="Evidence link">
        <RelatedReportLinks
          title="Explore deeper context"
          links={[
            {
              href: "/signals",
              label: "Open Signals",
              description:
                "Inspect the full evidence matrix, thresholds, historical context, and source links.",
            },
            {
              href: "/solutions/product-roadmapping",
              label: "Product roadmapping",
              description:
                "Apply macro signals to roadmap sequencing, pricing posture, and launch timing.",
            },
            {
              href: "/solutions/engineering-capacity",
              label: "Engineering capacity",
              description:
                "Plan hiring pace, delivery risk, and reliability investment by regime.",
            },
            {
              href: "/solutions/market-regime-playbook",
              label: "Market regime playbook",
              description:
                "Use operating guardrails for high-, moderate-, and low-stress environments.",
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}
