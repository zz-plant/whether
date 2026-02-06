import type { Metadata } from "next";
import Link from "next/link";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner, MonthlyActionSummaryPanel } from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import {
  operationsSectionLinks,
  operationsWorkstreamLinks,
} from "../../lib/navigation/operationsNavigation";
import { appendSearchParamsToRoute } from "../../lib/navigation/routeSearchParams";
import { OperationsWorkstreamNav } from "./components/operationsWorkstreamNav";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Action playbook",
  description:
    "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
};

const workstreamHighlights: Record<string, string[]> = {
  "/operations/plan": [
    "Start, stop, and fence playbook moves",
    "Quarterly finance posture",
    "Signal-driven operator requests",
  ],
  "/operations/decisions": [
    "Lock assumptions before committing",
    "Decision shield validation and templates",
    "Counterfactual pressure tests",
  ],
  "/operations/briefings": [
    "Board-ready strategy brief",
    "Exportable leadership briefs",
    "CXO-specific deliverables",
  ],
};

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const quickSteps = [
    {
      title: "Step 1 · Confirm posture",
      detail: "Review the monthly recommendation to decide what to fund now vs defer.",
      href: "#ops-monthly-action-summary",
      cta: "Review monthly actions",
      emphasis: "primary",
    },
    {
      title: "Step 2 · Pick a workstream",
      detail: "Choose plan, decisions, or briefings so teams see only what they need.",
      href: "#ops-workstreams",
      cta: "Open workstreams",
      emphasis: "secondary",
    },
    {
      title: "Step 3 · Export the brief",
      detail: "Create copy-ready output for exec syncs, board prep, and cross-functional alignment.",
      href: "/operations/briefings",
      cta: "Open briefing kits",
      emphasis: "secondary",
    },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Action playbook",
    url: `${siteUrl}/operations`,
    description:
      "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Whether — Market Climate Station",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Whether",
    },
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    statusLabel,
    treasury,
    treasuryProvenance,
  } = await loadReportData(searchParams);
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
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm playbook moves and decision shields.";
  const trustStatusTone = historicalSelection ? "historical" : isFallback ? "warning" : "stable";

  const workstreamCards = operationsWorkstreamLinks.filter((link) => link.href !== "/operations");

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
      pageTitle="Action playbook"
      pageSummary="Follow a simple sequence: set posture, open the right workstream, then export aligned briefs."
      pageSummaryLink={{ href: "#ops-workstreams", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.overview}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#ops-monthly-action-summary", label: "Review monthly actions" }}
      secondaryCta={{ href: "#ops-workstreams", label: "Open workstreams" }}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations" />
        ) : null
      }
    >
      <OperationsWorkstreamNav currentPath="/operations" />

      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Start with this sequence
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Reduce noise by moving through planning, decisions, and briefings in order.
            </h2>
          </div>
          <a
            href="#ops-workstreams"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            See workstreams →
          </a>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {quickSteps.map((step) => (
            <article key={step.title} className="weather-surface flex h-full flex-col gap-3 p-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                <p className="text-sm text-slate-300">{step.detail}</p>
              </div>
              {step.emphasis === "primary" ? (
                <a
                  href={step.href}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta}
                </a>
              ) : (
                <a
                  href={step.href}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-slate-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta} →
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <SectionedReportPanel
        id="ops-monthly-action-summary"
        title="Step 1: Monthly action summary"
        description="Start with the regime-recommended moves before opening detailed workflows."
      >
        <MonthlyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-workstreams"
        title="Step 2: Choose a focused workstream"
        description="Open only the workflow you need so each meeting stays concise and decision-oriented."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workstreamCards.map((link) => (
            <article key={link.href} className="weather-surface flex h-full flex-col gap-4 p-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                  {link.label}
                </p>
                <p className="text-sm text-slate-300">{link.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-200">
                {workstreamHighlights[link.href]?.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={appendSearchParamsToRoute(link.href, searchParams)}
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white"
              >
                Open {link.label}
              </Link>
            </article>
          ))}
        </div>
      </SectionedReportPanel>
    </ReportShell>
  );
}
