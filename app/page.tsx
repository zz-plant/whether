import type { Metadata } from "next";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  defaultSiteDescription,
  organizationName,
  websiteName,
  buildSocialImageUrl,
} from "../lib/seo";
import {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildTrustStatus } from "../lib/report/trustStatus";
import { WeeklyDecisionCard } from "./components/weeklyDecisionCard";

export const runtime = "edge";
export const revalidate = 900;

const homeSectionSequence = [
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Operating constraints" },
  { href: "#signal-matrix", label: "Risk posture" },
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

const regimeSeverityRank: Record<keyof typeof regimeLabelMap, number> = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
};

const operatingCallsByRegime: Record<keyof typeof regimeLabelMap, { hiring: string; roadmap: string; spend: string }> = {
  SCARCITY: {
    hiring: "Maintain freeze",
    roadmap: "Cut to must-win commitments",
    spend: "Require immediate payback",
  },
  DEFENSIVE: {
    hiring: "Backfill critical roles only",
    roadmap: "Favor retention and reliability",
    spend: "Gate discretionary programs",
  },
  VOLATILE: {
    hiring: "Stay selective by role",
    roadmap: "Prioritize near-term ROI",
    spend: "Fund only measurable returns",
  },
  EXPANSION: {
    hiring: "Add targeted growth capacity",
    roadmap: "Scale validated bets",
    spend: "Increase with guardrails",
  },
};

const netStanceByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "Net operating stance: Maintain constraint discipline. No expansion moves.",
  DEFENSIVE: "Net operating stance: Protect core delivery. Expand only with hard ROI proof.",
  VOLATILE: "Net operating stance: Keep optionality high. Stage commitments behind milestones.",
  EXPANSION: "Net operating stance: Expand selectively. Keep burn and payback guardrails active.",
};


const expansionWindowByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "Closed",
  DEFENSIVE: "Mostly closed",
  VOLATILE: "Selective",
  EXPANSION: "Open with guardrails",
};

const longCycleBetByRegime: Record<keyof typeof regimeLabelMap, string> = {
  SCARCITY: "Constrained",
  DEFENSIVE: "Constrained",
  VOLATILE: "Caution",
  EXPANSION: "Permitted with milestones",
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

type PostureForecastItem = {
  horizon: (typeof postureForecastHorizons)[number];
  label: "Stable" | "Watch" | "Likely shift" | "Projection unavailable";
  rationale: string;
  confidence: "High confidence" | "Medium confidence" | "Low confidence";
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
  baseUrl.searchParams.set("template", "report");

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
  const socialImageUrl = buildSocialImageUrl();
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
        "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
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
  const postureDelta = regimeAlert
    ? `Shifted from ${regimeLabelMap[regimeAlert.previousRegime]}.`
    : "No change since last week.";
  const previousRegime = regimeAlert?.previousRegime;
  const changeLabel = regimeAlert
    ? `${statusLabel} ↑ (changed from ${regimeLabelMap[regimeAlert.previousRegime]})`
    : `${statusLabel} (unchanged vs last week)`;
  const severityDelta = previousRegime
    ? regimeSeverityRank[assessment.regime] - regimeSeverityRank[previousRegime]
    : 0;
  const worseLabel = severityDelta > 0 ? "Worse than last week" : severityDelta < 0 ? "Better than last week" : "No worse than last week";
  const operatingCalls = operatingCallsByRegime[assessment.regime];
  const netStance = netStanceByRegime[assessment.regime];
  const expansionWindow = expansionWindowByRegime[assessment.regime];
  const longCycleBetStance = longCycleBetByRegime[assessment.regime];
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
      pageTitle="Current Climate"
      currentPath="/"
      pageSummary="Verdict and immediate decision call for this planning cycle."
      primaryCta={{
        href: "#weekly-action-summary",
        label: "Start weekly decision sequence",
      }}
      secondaryCta={{
        href: "/onboarding",
        label: "Start onboarding (3 min)",
      }}
      sidebarVariant="hidden"
      hideHeroChrome={true}
      pageNavVariant="compact"
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
        regime={assessment.regime}
        statusLabel={statusLabel}
        startItems={startItems}
        stopItems={stopItems}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
      />

      <section
        aria-labelledby="decision-surface-title"
        className="weather-panel space-y-6 px-5 py-6 sm:px-7 sm:py-8"
      >
        <header className="space-y-3 border-b border-slate-700/70 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Executive summary</p>
          <h1 id="decision-surface-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">
            {changeLabel}
          </h1>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="max-w-3xl text-base text-slate-200">{worseLabel}</p>
            <p className="max-w-3xl text-base text-slate-200">Approval velocity: {assessment.regime === "SCARCITY" || assessment.regime === "DEFENSIVE" ? "-1 notch" : "+0 notch"}</p>
          </div>
          <p className="text-sm font-semibold text-slate-100">{netStance}</p>
          <ul className="space-y-1 text-sm text-slate-200" aria-label="Immediate operating calls">
            <li>• Expansion window: {expansionWindow}</li>
            <li>• Hiring: {operatingCalls.hiring}</li>
            <li>• Long-cycle bets: {longCycleBetStance}</li>
          </ul>
          <div className="grid gap-3 md:grid-cols-3" aria-label="Primary posture metrics">
            <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Short-cycle experiment safety</p>
              <p className="mt-2 text-3xl font-semibold text-slate-50">{probabilityStay}%</p>
              <p className="mt-1 text-sm text-slate-300">Stance: CAUTION — short-cycle experiments viable.</p>
            </article>
            <article className="rounded-xl border border-amber-500/40 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Hiring expansion window</p>
              <p className="mt-2 text-3xl font-semibold text-amber-100">{probabilityShiftDefensive}%</p>
              <p className="mt-1 text-sm text-slate-300">Stance: NO-GO when below safe expansion band toward {primaryShiftRegimeLabel}.</p>
            </article>
            <article className="rounded-xl border border-emerald-500/40 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Long-payback tolerance</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-100">{probabilityShiftExpansion}%</p>
              <p className="mt-1 text-sm text-slate-300">Stance: CAUTION — long-payback risk elevated unless rotation toward {adjacentShiftRegimeLabel}.</p>
            </article>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <p className="lg:col-span-3 text-xs text-slate-400">Percentages are model probabilities for next-cycle posture paths; they are not confidence intervals or score percentiles.</p>
          <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4 lg:col-span-2" aria-label="What changed">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">What changed</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>• {postureDelta}</li>
              <li>• Tightness score: {assessment.scores.tightness.toFixed(1)} vs trigger {tightnessThreshold.toFixed(1)}.</li>
              <li>• Risk appetite score: {assessment.scores.riskAppetite.toFixed(1)} vs trigger {riskThreshold.toFixed(1)}.</li>
              {lastYearComparison ? (
                <li>
                  • Year-over-year regime reference: {regimeLabelMap[lastYearComparison.prior.regime as keyof typeof regimeLabelMap] ?? lastYearComparison.prior.regime} ({lastYearComparison.prior.recordDate}).
                </li>
              ) : null}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4" aria-label="Decision implications">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">DO / AVOID</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {startItems.slice(0, 3).map((item) => (
                <li key={item}>• DO: {item}</li>
              ))}
              {stopItems.slice(0, 2).map((item) => (
                <li key={item}>• AVOID: {item}</li>
              ))}
            </ul>
          </article>
        </div>

        <details className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4" aria-label="Trigger outlook details">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-[0.08em] text-slate-200 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">
            <span>Trigger outlook (expand)</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400">⌄</span>
          </summary>
          <div id="posture-forecast" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Posture forecast timeline">
            {horizonForecast.map((item) => (
              <article
                key={item.horizon}
                className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-3"
                role="listitem"
                aria-label={`Posture forecast ${item.horizon}: ${item.label}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{item.horizon}</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{item.label}</p>
                <p className="mt-1 text-sm text-slate-300">{item.rationale}</p>
              </article>
            ))}
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
