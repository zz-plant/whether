import type { Metadata } from "next";
import dynamic from "next/dynamic";
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
import { HistoricalBanner } from "./components/boardBriefSections";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildTrustStatus } from "../lib/report/trustStatus";
import { WeeklyDecisionCard } from "./components/weeklyDecisionCard";
import { RevealOnView } from "./components/revealOnView";
import { operatingCallsByRegime } from "../lib/report/operatingCalls";
import { DataProvenanceStrip } from "./components/dataProvenanceStrip";
import { deriveDecisionKnobs } from "../lib/report/decisionKnobs";
import { ActionStrip } from "./components/actionStrip";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { CopySlackBriefButton } from "./components/copySlackBriefButton";

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
  { href: "#action-strip", label: "Actions" },
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Evidence" },
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

const regimeSeverityRank: Record<keyof typeof regimeLabelMap, number> = {
  EXPANSION: 0,
  VOLATILE: 1,
  DEFENSIVE: 2,
  SCARCITY: 3,
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

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<Metadata> => {
  const siteName = "Whether — Capital Posture Governance Standard";
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

  const title = "Weekly capital posture governance brief — Whether";
  const imageUrl = baseUrl.toString();
  const socialImageUrl = buildSocialImageUrl();
  const canonicalUrl = buildCanonicalUrl("/");
  const hasTimeMachineParams = Boolean(
    resolvedSearchParams?.month || resolvedSearchParams?.year,
  );

  return {
    title,
    description:
      "Weekly capital posture governance brief with constraints, guardrails, and reversal triggers.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description:
        "Weekly capital posture governance brief with constraints, guardrails, and reversal triggers.",
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
        "Weekly capital posture governance brief with constraints, guardrails, and reversal triggers.",
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
      buildBreadcrumbList([{ name: "Weekly briefing", path: "/" }]),
    ],
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    regimeAlert,
    reportDynamics,
    sensors,
    macroSeries,
    startItems,
    fenceItems,
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
    ? buildTimeMachineHref("/evidence?advanced=1#time-machine", historicalSelection)
    : "/evidence?advanced=1#time-machine";
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
  const postureDeltaLabel = severityDelta > 0 ? "Worse than last week" : severityDelta < 0 ? "Better than last week" : "No worse than last week";
  const operatingCalls = operatingCallsByRegime[assessment.regime];
  const expansionWindow = expansionWindowByRegime[assessment.regime];
  const longCycleBetStance = longCycleBetByRegime[assessment.regime];
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessGap = Math.abs(assessment.scores.tightness - tightnessThreshold);
  const riskGap = Math.abs(assessment.scores.riskAppetite - riskThreshold);
  const nearestThresholdGap = Math.min(tightnessGap, riskGap);
  const shiftTargets = regimeShiftTargets[assessment.regime];
  const primaryShiftRegimeLabel = regimeLabelMap[shiftTargets.defensive];
  const confidenceLabel = nearestThresholdGap <= 5 ? "LOW" : nearestThresholdGap <= 12 ? "MED" : "HIGH";
  const transitionWatch = nearestThresholdGap <= 8 || Boolean(regimeAlert) ? "ON" : "OFF";
  const reversalTrigger = tightnessGap <= riskGap
    ? `Flip to ${primaryShiftRegimeLabel} if tightness crosses ${tightnessThreshold.toFixed(1)} (now ${assessment.scores.tightness.toFixed(1)}).`
    : `Flip to ${primaryShiftRegimeLabel} if risk appetite crosses ${riskThreshold.toFixed(1)} (now ${assessment.scores.riskAppetite.toFixed(1)}).`;
  const dangerousCategory =
    assessment.regime === "EXPANSION"
      ? "Unchecked spend growth without payback controls"
      : assessment.regime === "VOLATILE"
        ? "Irreversible multi-quarter commitments"
        : "Net-new hiring and long-payback expansion bets";
  const constraints = [
    `Expansion window: ${expansionWindow}`,
    `Hiring: ${operatingCalls.hiring}`,
    `Long-cycle bets: ${longCycleBetStance}`,
  ];
  const guardrail = stopItems[0] ?? "Do not approve irreversible commitments without trigger confirmation.";
  const decisionKnobs = deriveDecisionKnobs(assessment.regime, severityDelta);
  const slackBrief = buildSlackBrief(assessment, treasury, sensors, macroSeries);
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
      pageTitle="Weekly Capital Posture Brief"
      currentPath="/"
      pageSummary="Verdict and immediate decision call for this planning cycle."
      primaryCta={{
        href: "#weekly-posture-brief-title",
        label: "Copy Slack brief",
        copyText: slackBrief,
        copyTarget: "Slack",
      }}
      secondaryCta={{
        href: "#weekly-action-summary",
        label: "Review evidence",
      }}
      nextStep={{
        href: "/evidence",
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
      <WeeklyDecisionCard
        regime={assessment.regime}
        statusLabel={statusLabel}
        postureDelta={postureDeltaLabel}
        confidenceLabel={confidenceLabel}
        transitionWatch={transitionWatch}
        constraints={constraints}
        guardrail={guardrail}
        reversalTrigger={reversalTrigger}
        dangerousCategory={dangerousCategory}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
        reportDynamics={reportDynamics}
        decisionKnobs={decisionKnobs}
        actions={<CopySlackBriefButton brief={slackBrief} />}
      />

      <ActionStrip
        doItems={startItems.slice(0, 3)}
        dontItems={stopItems.slice(0, 3)}
        fenceItems={fenceItems.slice(0, 2)}
      />

      <DataProvenanceStrip provenance={treasuryProvenance} variant="compact" />

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
