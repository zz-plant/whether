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

const regimeShiftTargets = {
  SCARCITY: {
    defensive: "DEFENSIVE",
    adjacent: "VOLATILE",
  },
  DEFENSIVE: {
    defensive: "SCARCITY",
    adjacent: "EXPANSION",
  },
  VOLATILE: {
    defensive: "SCARCITY",
    adjacent: "EXPANSION",
  },
  EXPANSION: {
    defensive: "DEFENSIVE",
    adjacent: "VOLATILE",
  },
} as const;

const postureForecastHorizons = ["Now", "+1 week", "+2 weeks", "+4 weeks"] as const;

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

const describeProbabilityBand = (value: number) => {
  if (value >= 75) {
    return "High";
  }
  if (value >= 50) {
    return "Elevated";
  }
  if (value >= 25) {
    return "Moderate";
  }

  return "Low";
};

type PostureForecastItem = {
  horizon: (typeof postureForecastHorizons)[number];
  label: "Stable" | "Watch" | "Likely shift" | "Projection unavailable";
  rationale: string;
  confidence: "High confidence" | "Medium confidence" | "Low confidence";
};

const RegimeStatusIcon = ({ regime }: { regime: keyof typeof regimeLabelMap }) => {
  switch (regime) {
    case "SCARCITY":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 3l7 3v5c0 5-3.4 8.5-7 10-3.6-1.5-7-5-7-10V6l7-3z" />
        </svg>
      );
    case "DEFENSIVE":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 118 0v3" />
        </svg>
      );
    case "VOLATILE":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 4v15" />
          <path d="M6 8h12" />
          <path d="M4 8l-2 4h4l-2-4zm16 0l-2 4h4l-2-4z" />
          <path d="M9 19h6" />
        </svg>
      );
    case "EXPANSION":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M14 4c3 0 6 3 6 6-2 .3-4.4 1.6-6.3 3.5C11.7 15.5 10.3 18 10 20c-3 0-6-3-6-6 2-.3 4.4-1.7 6.4-3.7C12.3 8.4 13.7 6 14 4z" />
          <circle cx="14.5" cy="9.5" r="1.3" />
          <path d="M7 17l-3 3" />
        </svg>
      );
  }
};

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
  const tightnessGap = Math.abs(assessment.scores.tightness - tightnessThreshold);
  const riskGap = Math.abs(assessment.scores.riskAppetite - riskThreshold);
  const nearestThresholdGap = Math.min(tightnessGap, riskGap);
  const shiftTargets = regimeShiftTargets[assessment.regime];
  const primaryShiftRegimeLabel = regimeLabelMap[shiftTargets.defensive];
  const adjacentShiftRegimeLabel = regimeLabelMap[shiftTargets.adjacent];
  const normalizedTightnessGap = clampPercentage((tightnessGap / 40) * 100);
  const normalizedRiskGap = clampPercentage((riskGap / 40) * 100);
  const defensivePressure = clampPercentage(100 - normalizedRiskGap);
  const expansionPressure = clampPercentage(100 - normalizedTightnessGap);
  const shiftPressure = clampPercentage((defensivePressure + expansionPressure) / 2);
  const probabilityStay = Math.round(clampPercentage(100 - shiftPressure));
  const shiftAllocationWeight =
    assessment.regime === "EXPANSION"
      ? 0.7
      : assessment.regime === "SCARCITY"
        ? 0.55
        : assessment.regime === "DEFENSIVE"
          ? 0.6
          : 0.65;
  const probabilityShiftPool = 100 - probabilityStay;
  const probabilityShiftDefensive = Math.round(
    clampPercentage(probabilityShiftPool * shiftAllocationWeight),
  );
  const probabilityShiftExpansion = Math.max(0, 100 - probabilityStay - probabilityShiftDefensive);
  const probabilityPills = [
    {
      id: "shift-defensive",
      label: `Shift risk (${primaryShiftRegimeLabel})`,
      copy: `${probabilityShiftDefensive}%`,
      qualitativeBand: describeProbabilityBand(probabilityShiftDefensive),
      className: "weather-chip",
    },
    {
      id: "stay",
      label: "Stay likely",
      copy: `${probabilityStay}%`,
      qualitativeBand: describeProbabilityBand(probabilityStay),
      className: "weather-pill",
    },
    {
      id: "shift-adjacent",
      label: `Shift risk (${adjacentShiftRegimeLabel})`,
      copy: `${probabilityShiftExpansion}%`,
      qualitativeBand: describeProbabilityBand(probabilityShiftExpansion),
      className: "weather-pill-muted",
    },
  ];
  const hasProjectionData =
    Number.isFinite(assessment.scores.tightness) &&
    Number.isFinite(assessment.scores.riskAppetite) &&
    Number.isFinite(tightnessThreshold) &&
    Number.isFinite(riskThreshold);
  const horizonForecast: PostureForecastItem[] = hasProjectionData
    ? postureForecastHorizons.map((horizon, index) => {
        const alertBias = regimeAlert ? 8 : 0;
        const projectedGap = nearestThresholdGap - index * 5 - alertBias;
        const label: PostureForecastItem["label"] =
          projectedGap <= 2 ? "Likely shift" : projectedGap <= 8 ? "Watch" : "Stable";
        const rationale =
          label === "Likely shift"
            ? `Risk appetite and tightness are near regime boundaries (${riskThreshold}/${tightnessThreshold}); trigger conditions are close.`
            : label === "Watch"
              ? `Risk appetite or tightness is within monitoring range of thresholds (${riskThreshold}/${tightnessThreshold}).`
              : `Risk appetite and tightness remain comfortably away from thresholds (${riskThreshold}/${tightnessThreshold}).`;
        const confidence: PostureForecastItem["confidence"] =
          horizon === "Now"
            ? "High confidence"
            : horizon === "+1 week"
              ? "Medium confidence"
              : "Low confidence";

        return {
          horizon,
          label,
          rationale,
          confidence,
        };
      })
    : postureForecastHorizons.map((horizon) => ({
        horizon,
        label: "Projection unavailable",
        rationale: "Projection unavailable: missing score inputs for this horizon.",
        confidence: "Low confidence",
      }));
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
        label: "See posture rationale",
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
        className="weather-panel space-y-7 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.3)_45%,rgba(2,6,23,0.92)_75%)] px-6 py-8 sm:space-y-9 sm:py-9"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">
            Posture for the next 2–6 weeks
          </p>
          <h1 id="decision-card-title" className="text-4xl font-semibold text-slate-100 sm:text-[2.8rem]">
            How should your company operate right now?
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-300">
            Live market and capital conditions translated into a clear operating posture for the next cycle.
          </p>
          <div className="py-2 sm:py-3">
            <p className="inline-flex items-center justify-center gap-3 text-5xl font-bold tracking-[-0.02em] text-slate-50 sm:text-[3.5rem]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 text-slate-100 sm:h-14 sm:w-14">
                <RegimeStatusIcon regime={assessment.regime} />
              </span>
              <span>{statusLabel}</span>
            </p>
          </div>
          <p className="text-sm font-semibold tracking-[0.08em] text-slate-100">{postureDelta}</p>
          <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Operational posture probabilities">
            {probabilityPills.map((pill) => (
              <p
                key={pill.id}
                className={`${pill.className} inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100`}
              >
                <span>
                  {pill.label}: {pill.copy} ({pill.qualitativeBand})
                </span>
              </p>
            ))}
          </div>
          <p className="text-xs text-slate-300">
            Heuristic operational probabilities only; this translates current threshold distance into posture shift odds and is not a financial forecast.
          </p>
          <p className="text-xs text-slate-300">
            These percentages use the same trigger logic as <span className="font-semibold text-slate-100">What would change this posture</span>: scores closer to threshold imply higher shift risk.
          </p>
          <p className="text-[11px] font-medium tracking-[0.14em] text-slate-400">
            Updated {recordDateLabel} · Confidence: {trustStatusLabel}
          </p>
        </div>

        <article className="weather-surface space-y-4 p-5" aria-label="Current climate summary">
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-sm text-slate-300">{trustStatusAction}</p>
        </article>

        <details className="weather-surface group p-4 sm:p-5" aria-label="Expanded posture details">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-[0.08em] text-slate-200 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">
            <span>See detailed triggers and execution checklist</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>

          <section className="mt-4 space-y-3" aria-label="Posture forecast timeline">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">
              Trigger outlook timeline
            </h2>
            <div className="weather-forecast-strip lg:grid-cols-4" role="list" aria-label="Posture forecast timeline">
              {horizonForecast.map((item) => (
                <article
                  key={item.horizon}
                  className="weather-forecast-card"
                  role="listitem"
                  aria-label={`Posture forecast ${item.horizon}: ${item.label}`}
                >
                  <span className="weather-forecast-icon" aria-hidden="true">
                    {item.label === "Likely shift" ? "⚠" : item.label === "Watch" ? "◔" : item.label === "Stable" ? "✓" : "?"}
                  </span>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{item.horizon}</p>
                    <p className="text-sm font-semibold text-slate-50">{item.label}</p>
                    <p className="text-sm text-slate-300">{item.rationale}</p>
                    <p className="inline-flex rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                      {item.confidence}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="weather-panel space-y-3 p-5" aria-label="Prioritize">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Prioritize</h2>
              <ul className="space-y-2 text-sm text-slate-100">
                {startItems.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />{item}</li>
                ))}
              </ul>
            </article>
            <article className="weather-panel space-y-3 p-5" aria-label="Avoid">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Avoid</h2>
              <ul className="space-y-2 text-sm text-slate-100">
                {stopItems.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-4 border-t border-slate-800/70 pt-4">
            <p className="text-sm font-semibold tracking-[0.08em] text-slate-200">What would change this posture</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• Will shift if Capital Tightness rises above {tightnessThreshold} for two consecutive reads.</li>
              <li>• Will shift if Risk Appetite falls below {riskThreshold} and remains there through the next update.</li>
              <li>• Curve slope turns negative and stays inverted through the next cycle.</li>
            </ul>
          </div>
        </details>

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
    </ReportShell>
  );
}
