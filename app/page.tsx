import type { Metadata } from "next";
import type { SeriesHistoryPoint } from "../lib/types";
import {
  resolveTimeMachineSelection,
  parseTimeMachineRequest,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { getTimeMachineRollingYieldSeries } from "../lib/timeMachine/timeMachineCache";
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
import { formatTimestampUTC } from "../lib/formatters";
import { MiniSeriesRow } from "./components/miniSeriesRow";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const homeSectionSequence = [
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "#signal-matrix", label: "Signal breakdown" },
  { href: "#evidence-matrix", label: "Evidence matrix" },
] as const;

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

  const titleSuffix =
    selection?.banner ?? (requestedSelection ? "Time Machine Preview" : "Live");
  const title = `Whether Report — ${titleSuffix}`;
  const imageUrl = baseUrl.toString();
  const canonicalUrl = buildCanonicalUrl("/");

  return {
    title,
    description: siteDescription,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description: siteDescription,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Whether Report ${titleSuffix} Open Graph`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteDescription,
      images: [imageUrl],
    },
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
  const sectionLinks = homeSectionSequence.map((section, index) => ({
    href: section.href,
    label: `${index + 1}. ${section.label}`,
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: organizationName,
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: websiteName,
        url: siteUrl,
        description: defaultSiteDescription,
        inLanguage: "en",
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
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        about: {
          "@type": "Thing",
          name: "Macro signal operations guidance",
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
    statusLabel,
    treasury,
    treasuryProvenance,
    macroSeries,
  } = await loadReportData(resolvedSearchParams);

  const computeZScore = (
    series: SeriesHistoryPoint[],
    latestValue: number | null,
  ) => {
    if (latestValue === null) {
      return null;
    }

    const values = series
      .map((point) => point.value)
      .filter((value): value is number => typeof value === "number");

    if (values.length < 2) {
      return null;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;
    const deviation = Math.sqrt(variance);

    if (!Number.isFinite(deviation) || deviation === 0) {
      return null;
    }

    return (latestValue - mean) / deviation;
  };

  const cpiSignal = macroSeries.find((series) => series.id === "CPI_YOY");
  const unemploymentSignal = macroSeries.find(
    (series) => series.id === "UNEMPLOYMENT_RATE",
  );
  const spreadSignal = macroSeries.find(
    (series) => series.id === "BBB_CREDIT_SPREAD",
  );

  const rollingYieldSeries = getTimeMachineRollingYieldSeries(
    60,
    treasury.record_date,
  );
  const curveSeries = rollingYieldSeries.tenYear.map((point, index) => ({
    date: point.date,
    value:
      point.value !== null && rollingYieldSeries.twoYear[index]?.value !== null
        ? Number(
            (
              point.value - (rollingYieldSeries.twoYear[index]?.value ?? 0)
            ).toFixed(2),
          )
        : null,
  }));

  const evidenceRows = [
    {
      key: "curve",
      name: "Yield curve slope (10Y−2Y)",
      latestValue:
        assessment.scores.curveSlope === null
          ? "N/A"
          : `${assessment.scores.curveSlope.toFixed(2)}%`,
      zScore: computeZScore(curveSeries, assessment.scores.curveSlope),
      series: curveSeries,
      thresholds: [{ label: "Inversion", value: 0 }],
      updatedAt: formatTimestampUTC(treasury.fetched_at),
      insight:
        assessment.scores.curveSlope !== null &&
        assessment.scores.curveSlope < 0
          ? "Curve remains inverted; keep approval bars high and prioritize fast-payback bets."
          : "Curve has normalized; selective medium-horizon investments can move into review.",
    },
    {
      key: "base-rate",
      name: "Policy proxy rate (1M Treasury)",
      latestValue:
        treasury.yields.oneMonth === null
          ? "N/A"
          : `${treasury.yields.oneMonth.toFixed(2)}%`,
      zScore: computeZScore(
        rollingYieldSeries.oneMonth,
        treasury.yields.oneMonth,
      ),
      series: rollingYieldSeries.oneMonth,
      thresholds: [
        {
          label: "Tightness threshold",
          value: assessment.thresholds.baseRateTightness,
        },
      ],
      updatedAt: formatTimestampUTC(treasury.fetched_at),
      insight:
        treasury.yields.oneMonth !== null &&
        treasury.yields.oneMonth >= assessment.thresholds.baseRateTightness
          ? "Funding conditions are still restrictive; gate discretionary hiring and long-payback work."
          : "Funding pressure is easing; plan controlled re-acceleration only where demand is validated.",
    },
    {
      key: "cpi",
      name: "Inflation pulse (CPI YoY)",
      latestValue:
        cpiSignal?.value === null || cpiSignal?.value === undefined
          ? "N/A"
          : `${cpiSignal.value.toFixed(2)}%`,
      zScore: computeZScore(cpiSignal?.history ?? [], cpiSignal?.value ?? null),
      series: cpiSignal?.history ?? [],
      thresholds: [{ label: "Target", value: 2 }],
      updatedAt: formatTimestampUTC(
        cpiSignal?.fetched_at ?? treasury.fetched_at,
      ),
      insight:
        (cpiSignal?.value ?? 0) > 3
          ? "Sticky inflation reinforces pricing discipline and cost-control checks in weekly planning."
          : "Cooling inflation supports steadier assumptions for supplier and payroll planning.",
    },
    {
      key: "unemployment",
      name: "Labor slack (unemployment rate)",
      latestValue:
        unemploymentSignal?.value === null ||
        unemploymentSignal?.value === undefined
          ? "N/A"
          : `${unemploymentSignal.value.toFixed(2)}%`,
      zScore: computeZScore(
        unemploymentSignal?.history ?? [],
        unemploymentSignal?.value ?? null,
      ),
      series: unemploymentSignal?.history ?? [],
      thresholds: [{ label: "Stress watch", value: 5 }],
      updatedAt: formatTimestampUTC(
        unemploymentSignal?.fetched_at ?? treasury.fetched_at,
      ),
      insight:
        (unemploymentSignal?.value ?? 0) >= 4.5
          ? "Labor softening calls for conservative revenue assumptions and tighter hiring plans."
          : "Labor remains resilient; focus on retention and selective backfills over broad expansion.",
    },
    {
      key: "credit",
      name: "Credit stress (BBB spread)",
      latestValue:
        spreadSignal?.value === null || spreadSignal?.value === undefined
          ? "N/A"
          : `${spreadSignal.value.toFixed(2)}%`,
      zScore: computeZScore(
        spreadSignal?.history ?? [],
        spreadSignal?.value ?? null,
      ),
      series: spreadSignal?.history ?? [],
      thresholds: [{ label: "Stress line", value: 2.5 }],
      updatedAt: formatTimestampUTC(
        spreadSignal?.fetched_at ?? treasury.fetched_at,
      ),
      insight:
        (spreadSignal?.value ?? 0) > 2.5
          ? "Wider spreads signal tighter credit access; protect runway and avoid fragile launch timing."
          : "Contained spreads support normal execution cadence with standard contingency buffers.",
    },
  ] as const;
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Fallback mode"
      : "Verified live feed";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Using cached Treasury snapshot due to upstream outage.")
      : "Treasury live feed verified for this cycle.";
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
      pageTitle="Weekly briefing"
      currentPath="/"
      pageSummary="Weekly regime pulse and recommended moves."
      primaryCta={{
        href: "#weekly-action-summary",
        label: "Review weekly actions",
      }}
      secondaryCta={{
        href: "#executive-snapshot",
        label: "Review leadership summary",
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
        aria-label="Read this first"
        className="weather-panel space-y-6 px-6 py-6"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Read this first
          </p>
          <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
            Decision card: what changed and what to do now.
          </h1>
        </div>
        <article className="weather-surface space-y-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            What changed
          </p>
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            What to do now
          </p>
          <p className="text-sm text-slate-200">{trustStatusAction}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Confidence
          </p>
          <p className="text-sm text-slate-200">
            {trustStatusLabel} · {trustStatusDetail}
          </p>
        </article>
      </section>

      <section id="weekly-action-summary" className="space-y-8">
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </section>

      <section id="executive-snapshot" className="space-y-8">
        <ExecutiveSnapshotPanel
          treasury={treasury}
          assessment={assessment}
          provenance={treasuryProvenance}
        />
      </section>

      <section id="signal-matrix" className="space-y-8">
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
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Evidence matrix
          </p>
          <h2
            id="evidence-matrix-title"
            className="text-xl font-semibold text-slate-100 sm:text-2xl"
          >
            High-density macro evidence for weekly operating decisions.
          </h2>
          <p className="text-sm text-slate-300">
            <abbr title="Year-over-year" className="cursor-help no-underline">
              YoY
            </abbr>
            ,{" "}
            <abbr title="Basis points" className="cursor-help no-underline">
              bps
            </abbr>
            , and{" "}
            <abbr
              title="10-year minus 2-year Treasury spread"
              className="cursor-help no-underline"
            >
              10Y−2Y
            </abbr>{" "}
            are defined inline.
          </p>
        </div>
        <div className="space-y-3">
          {evidenceRows.map(({ key, ...row }) => (
            <MiniSeriesRow key={key} {...row} />
          ))}
        </div>
      </section>
    </ReportShell>
  );
}
