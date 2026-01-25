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
  title: "Whether Report — What to do next",
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — What to do next",
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
      pageTitle="What to do next"
      pageSummary="See how the regime turns into plan, decisions, and briefings."
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

      <SectionedReportPanel
        id="ops-monthly-action-summary"
        title="Monthly action summary"
        description="What moves the regime recommends this month."
      >
        <MonthlyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-workstreams"
        title="Operational workstreams"
        description="Pick a focused view so you do not have to scroll through every panel."
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
