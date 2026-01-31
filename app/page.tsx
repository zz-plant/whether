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
      <section className="weather-panel space-y-5 px-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Start here
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Get decision-ready in five minutes.
            </h2>
            <p className="text-sm text-slate-300">
              Follow the flow below to align leadership on posture, capture constraints, and only
              then drill into signals.
            </p>
          </div>
          <a
            href="#weekly-action-summary"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Jump to action summary →
          </a>
        </div>
        <ol className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
          {[
            "Read the weekly action control room to lock posture (your default operating stance).",
            "Confirm operating constraints (budget and approval guardrails) and score context (0–100 gauges).",
            "Open signal breakdowns only when decisions hinge on evidence.",
          ].map((step, index) => (
            <li
              key={step}
              className="weather-surface flex gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-100">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Decision checklist
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              {[
                {
                  href: "#weekly-action-summary",
                  label: "Set the weekly posture and action summary.",
                },
                {
                  href: "#change-since-last-read",
                  label: "Confirm what changed since your last read.",
                },
                {
                  href: "#regime-summary",
                  label: "Align constraints before approving spend or hiring.",
                },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    <span aria-hidden="true">→</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Meeting prompts
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>Are we acting like a {regimeLabel} week across product and delivery?</li>
              <li>
                Tightness score is{" "}
                <span className="mono text-slate-100">{assessment.scores.tightness}</span>
                /100 — does this force spending gates?
              </li>
              <li>
                Risk appetite sits at{" "}
                <span className="mono text-slate-100">{assessment.scores.riskAppetite}</span>
                /100 — do we pause or accelerate growth bets?
              </li>
              <li>Data confidence: {trustStatusLabel}. Confirm with your finance lead.</li>
            </ul>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Regime posture
            </p>
            <p className="text-xs text-slate-500">
              A combined read of cash tightness and market risk appetite from Treasury signals.
            </p>
            <p className="text-lg font-semibold text-slate-100">
              <span className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-sky-100">
                {regimeLabel}
              </span>
            </p>
            <p className="text-sm text-slate-300">{assessment.description}</p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Operating constraints
            </p>
            <p className="text-xs text-slate-500">
              Guardrails that translate the regime into budget, hiring, and approval guidance.
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
            <p className="text-xs text-slate-500">
              0–100 scores: higher tightness = tougher funding, higher risk appetite = more growth
              funding.
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
