import type { Metadata } from "next";
import { resolveTimeMachineSelection, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
import {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
  RegimeSummaryPanel,
  RegimeAssessmentCard,
  RegimeChangeAlertPanel,
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ChangeSinceLastReadPanel } from "./components/changeSinceLastReadPanel";
import { RegimeAlertsPanel } from "./components/regimeAlertsPanel";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";

export const runtime = "edge";

const regimeLabels = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
} as const;

export const generateMetadata = ({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
}): Metadata => {
  const siteName = "Whether — Market Climate Station";
  const siteDescription =
    "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
  const selection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const baseUrl = new URL("/api/og", siteUrl);

  if (selection) {
    baseUrl.searchParams.set("month", String(selection.month));
    baseUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    baseUrl.searchParams.set("month", String(requestedSelection.month));
    baseUrl.searchParams.set("year", String(requestedSelection.year));
    baseUrl.searchParams.set("status", "invalid");
  }

  const titleSuffix = selection?.banner ?? (requestedSelection ? "Time Machine Preview" : "Live");
  const title = `Whether Report — ${titleSuffix}`;
  const imageUrl = baseUrl.toString();

  return {
    title,
    description: siteDescription,
    openGraph: {
      type: "website",
      url: siteUrl,
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
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const sectionLinks = [
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "#weekly-action-summary", label: "This week's actions" },
    { href: "#regime-summary", label: "Market climate summary" },
    { href: "#regime-alerts", label: "New alerts" },
    { href: "#regime-alert-log", label: "Alert history" },
    { href: "#regime-assessment", label: "What the scores mean" },
    { href: "#signal-matrix", label: "Signal breakdown" },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Whether — Market Climate Station",
    url: siteUrl,
    description:
      "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Whether"
    }
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    regimeAlert,
    statusLabel,
    treasury,
    treasuryProvenance,
  } = await loadReportData(searchParams);
  const regimeLabel = regimeLabels[assessment.regime];
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Fallback mode"
      : "Verified live feed";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? treasury.fallback_reason ?? "Using cached Treasury snapshot due to upstream outage."
      : "Treasury API responding normally; live signals verified.";
  const trustStatusAction = historicalSelection
    ? "Use for retrospectives only; avoid live planning calls until you return to current data."
    : isFallback
      ? "Pause irreversible decisions until the live feed returns or you confirm the cache."
      : "Safe to use for near-term planning; proceed with normal approval flow.";
  const trustStatusTone = historicalSelection ? "historical" : isFallback ? "warning" : "stable";

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
      pageSummary="A quick pulse on the week’s regime and the moves it hints at."
      pageSummaryLink={{ href: "#weekly-action-summary", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
    >
      <section className="weather-panel space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Weekly focus
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Anchor decisions before you dive into the detail.
            </h2>
          </div>
          <a
            href="#weekly-action-summary"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Jump to action summary →
          </a>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Regime posture
            </p>
            <p className="text-lg font-semibold text-slate-100">{regimeLabel}</p>
            <p className="text-sm text-slate-300">{assessment.description}</p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Operating constraints
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              {assessment.constraints.slice(0, 3).map((constraint) => (
                <li key={constraint} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Score context
            </p>
            <div className="flex items-baseline justify-between text-sm text-slate-300">
              <span>Tightness</span>
              <span className="mono text-slate-100">{assessment.scores.tightness}/100</span>
            </div>
            <div className="flex items-baseline justify-between text-sm text-slate-300">
              <span>Risk appetite</span>
              <span className="mono text-slate-100">{assessment.scores.riskAppetite}/100</span>
            </div>
            <p className="text-xs text-slate-400">
              Use scores to validate urgency before committing roadmap shifts.
            </p>
          </div>
        </div>
      </section>

      <ExecutiveSnapshotPanel
        treasury={treasury}
        assessment={assessment}
        provenance={treasuryProvenance}
      />

      <ChangeSinceLastReadPanel
        assessment={assessment}
        recordDate={treasury.record_date}
        provenance={treasuryProvenance}
      />

      <WeeklyActionSummaryPanel
        assessment={assessment}
        provenance={treasuryProvenance}
        recordDateLabel={recordDateLabel}
      />

      <RegimeSummaryPanel assessment={assessment} provenance={treasuryProvenance} />

      <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

      <RegimeAlertsPanel />

      <section className="mt-10">
        <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />
      </section>

      <section className="mt-10">
        <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
      </section>
    </ReportShell>
  );
}
