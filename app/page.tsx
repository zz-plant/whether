import type { Metadata } from "next";
import dynamic from "next/dynamic";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportDataWithTimeout } from "../lib/report/reportData";
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
import { RevealOnView } from "./components/revealOnView";
import { operatingCallsByRegime } from "../lib/report/operatingCalls";
import { deriveDecisionKnobs } from "../lib/report/decisionKnobs";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { CopySlackBriefButton } from "./components/copySlackBriefButton";
import { createBreadcrumbTrail } from "../lib/navigation/breadcrumbs";
import { buildWeeklyCall } from "../lib/report/weeklyCall";
import { evaluateRegime } from "../lib/regimeEngine";
import {
  buildBoldnessScore,
  buildWeeklyLeadershipBriefModel,
} from "../lib/report/weeklyLeadershipBrief";
import { getPreviousTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { ViewEventBeacon } from "./components/viewEventBeacon";

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
  { href: "#one-screen-weekly-brief", label: "This week" },
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Evidence" },
] as const;

const regimeSeverityRank = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
};

const expansionWindowByRegime = {
  SCARCITY: "Closed",
  DEFENSIVE: "Mostly closed",
  VOLATILE: "Selective",
  EXPANSION: "Open with guardrails",
};

const longCycleBetByRegime = {
  SCARCITY: "Constrained",
  DEFENSIVE: "Constrained",
  VOLATILE: "Caution",
  EXPANSION: "Permitted with milestones",
};

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

  const {
    assessment,
    fetchedAtLabel,
    regimeSeries,
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
  } = await loadReportDataWithTimeout(resolvedSearchParams, 900);
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
  const previousRegime = regimeAlert?.previousRegime;
  const severityDelta = previousRegime
    ? regimeSeverityRank[assessment.regime] - regimeSeverityRank[previousRegime]
    : 0;
  const operatingCalls = operatingCallsByRegime[assessment.regime];
  const expansionWindow = expansionWindowByRegime[assessment.regime];
  const longCycleBetStance = longCycleBetByRegime[assessment.regime];
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessGap = Math.abs(assessment.scores.tightness - tightnessThreshold);
  const riskGap = Math.abs(assessment.scores.riskAppetite - riskThreshold);
  const nearestThresholdGap = Math.min(tightnessGap, riskGap);
  const weeklyCall = buildWeeklyCall({
    regime: assessment.regime,
    stopItems,
    expansionWindow,
    hiringConstraint: operatingCalls.hiring,
    longCycleBetStance,
    tightnessThreshold,
    riskThreshold,
    tightnessScore: assessment.scores.tightness,
    riskAppetiteScore: assessment.scores.riskAppetite,
  });
  const decisionKnobs = deriveDecisionKnobs(assessment.regime, severityDelta);
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries, {
    decisionKnobs,
    weeklyCall,
  });
  const previousSnapshot = getPreviousTimeMachineSnapshot(treasury.record_date);
  const previousAssessment = previousSnapshot ? evaluateRegime(previousSnapshot) : null;
  const latestRegimeSeries = regimeSeries.slice(-8);
  let stabilityWeeks = 0;
  for (let index = latestRegimeSeries.length - 1; index >= 0; index -= 1) {
    if (latestRegimeSeries[index]?.regime === assessment.regime) {
      stabilityWeeks += 1;
      continue;
    }
    break;
  }
  const snapshots = [treasury];
  while (snapshots.length < 4) {
    const previous = getPreviousTimeMachineSnapshot(snapshots[0].record_date);
    if (!previous) {
      break;
    }
    snapshots.unshift(previous);
  }
  const assessedSnapshots = snapshots.map((snapshot) => evaluateRegime(snapshot));
  const last4Boldness = assessedSnapshots.map((snapshotAssessment) =>
    buildBoldnessScore(
      snapshotAssessment.scores.tightness,
      snapshotAssessment.scores.riskAppetite,
    ),
  );
  const hiringTrendDelta = assessedSnapshots.reduce((accumulator, snapshotAssessment, index) => {
    if (index === 0) {
      return accumulator;
    }
    return accumulator +
      (assessedSnapshots[index - 1].scores.tightness - snapshotAssessment.scores.tightness);
  }, 0);
  const leadershipBriefModel = buildWeeklyLeadershipBriefModel({
    assessment,
    previousAssessment,
    treasury,
    last4Boldness,
    hiringTrendDelta,
    stabilityWeeks,
  });
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
        href: "#one-screen-weekly-brief",
        label: "Copy weekly brief",
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
      <ViewEventBeacon
        name="briefing_view_loaded"
        payload={{
          route: "/",
          posture: assessment.regime,
          freshness: trustStatusLabel,
          recordDate: treasury.record_date,
        }}
      />

      <section id="one-screen-weekly-brief" className="weather-panel space-y-3 px-5 py-4 sm:px-6 sm:py-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">This week</p>
            <p className="text-sm text-slate-100">Boldness budget: {leadershipBriefModel.notchShiftLabel}</p>
            <p className="text-sm text-slate-100">Hiring window: {leadershipBriefModel.hiringWindow}</p>
            <p className="text-sm text-slate-100">Expansion window: {leadershipBriefModel.expansionWindow}</p>
            <p className="text-sm text-slate-100">Raise window: {leadershipBriefModel.raiseWindow}</p>
            <p className="text-sm text-slate-100">Stability: Moderate (Week {leadershipBriefModel.stabilityWeeks})</p>
            <p className="text-sm text-slate-100">Net delta: {leadershipBriefModel.netDeltaLabel}</p>
          </div>
          <CopySlackBriefButton brief={slackBrief} />
        </header>

        <section className="weather-surface space-y-1 px-4 py-3">
          <p className="text-base font-semibold text-slate-100">
            We&apos;re {leadershipBriefModel.boldnessDelta >= 0 ? `+${leadershipBriefModel.boldnessDelta}` : leadershipBriefModel.boldnessDelta} bold this week.
          </p>
          <p className="text-xs text-slate-400">Baseline posture: {assessment.regime}.</p>
        </section>

        <section className="weather-surface space-y-2 px-4 py-3">
          <p className="text-sm font-semibold text-slate-100">Boldness Budget: {leadershipBriefModel.boldnessScore} / 100</p>
          <p className="text-sm text-slate-200">Change: {leadershipBriefModel.boldnessDelta >= 0 ? `+${leadershipBriefModel.boldnessDelta}` : leadershipBriefModel.boldnessDelta}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="weather-pill">Risk appetite {leadershipBriefModel.riskDelta >= 0 ? `+${leadershipBriefModel.riskDelta}` : leadershipBriefModel.riskDelta}</span>
            <span className="weather-pill">
              Tightness {leadershipBriefModel.tightnessDelta === 0 ? "unchanged" : leadershipBriefModel.tightnessDelta > 0 ? `+${leadershipBriefModel.tightnessDelta}` : leadershipBriefModel.tightnessDelta}
            </span>
            <span className="weather-pill">
              Curve {Math.abs(leadershipBriefModel.curveDelta) < 0.05 ? "stable" : leadershipBriefModel.curveDelta > 0 ? "steeper" : "flatter"}
            </span>
          </div>
        </section>

        <section className="weather-surface space-y-2 px-4 py-3">
          <p className="text-sm font-semibold text-slate-100">Revisit last week&apos;s roadmap/hiring decisions?</p>
          <p className="text-sm text-slate-100">
            {leadershipBriefModel.revisitYes ? "YES — Regime shift detected." : "NO — Hold posture."}
          </p>
          {leadershipBriefModel.revisitYes ? (
            <p className="text-xs text-slate-300">Cause: boldness moved outside the hold band or hiring window changed.</p>
          ) : null}
        </section>

        <section className="weather-surface space-y-1 px-4 py-3 text-sm text-slate-100">
          <p>If tightness rises 20 points → Hiring window closes → Boldness budget drops 12 points</p>
          <p>If curve inverts below 0.00% → Payback tolerance tightens to ≤ 9 months</p>
        </section>

        <section className="weather-surface space-y-1 px-4 py-3 text-sm text-slate-100">
          <p>Expansion window: {leadershipBriefModel.expansionWindow}</p>
          <p>Trend: {leadershipBriefModel.expansionTrend}</p>
        </section>

        <section className="weather-surface space-y-1 px-4 py-3 text-sm text-slate-100">
          <p>Last 4 weeks: Boldness {last4Boldness.join(" → ")}</p>
          <p>Hiring window trend: {leadershipBriefModel.hiringTrend}</p>
        </section>

        <section className="weather-surface px-4 py-3 text-xs text-slate-200">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <p>Data freshness: {treasuryProvenance.ageLabel.replace(".", "")}</p>
            <p>Confidence: {leadershipBriefModel.confidenceLabel}</p>
            <p>Inputs complete: {leadershipBriefModel.inputsComplete ? "Yes" : "No"}</p>
          </div>
        </section>
      </section>

      <section
        id="weekly-action-summary"
        aria-label="Weekly action summary"
        className="space-y-8"
      >
        <RevealOnView>
          <WeeklyActionSummaryPanel
            assessment={assessment}
            provenance={treasuryProvenance}
            recordDateLabel={recordDateLabel}
          />
        </RevealOnView>
      </section>

      <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
        <RevealOnView>
          <ExecutiveSnapshotPanel
            treasury={treasury}
            assessment={assessment}
            provenance={treasuryProvenance}
          />
        </RevealOnView>
      </section>

    </ReportShell>
  );
}
