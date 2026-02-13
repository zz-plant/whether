import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { buildBreadcrumbList, buildPageMetadata, organizationName, websiteName } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { RelatedReportLinks } from "../components/relatedReportLinks";
import { CadenceChecklist } from "../components/cadenceChecklist";
import { HistoricalBanner, MonthlyActionSummaryPanel } from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import {
  operationsSectionLinks,
  operationsWorkstreamLinks,
} from "../../lib/navigation/operationsNavigation";
import { appendSearchParamsToRoute } from "../../lib/navigation/routeSearchParams";
import { OperationsWorkstreamNav } from "./components/operationsWorkstreamNav";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook",
  description:
    "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
  path: "/operations",
  imageAlt: "Whether Report action playbook overview",
});

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
  searchParams?: Promise<{ month?: string; year?: string; [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const quickSteps = [
    {
      title: "Confirm the posture",
      detail: "Use the current regime to decide what to fund now vs defer.",
      href: "#ops-monthly-action-summary",
      cta: "Review monthly actions",
      emphasis: "primary",
    },
    {
      title: "Pick a workstream",
      detail: "Route to plan, decisions, or briefings based on the question in front of you.",
      href: "#ops-workstreams",
      cta: "Open workstreams",
      emphasis: "secondary",
    },
    {
      title: "Export the brief",
      detail: "Generate copy-ready output for exec syncs, board prep, and team alignment.",
      href: "/operations/briefings",
      cta: "Open briefing kits",
      emphasis: "secondary",
    },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/operations#webpage`,
        name: "Whether Report — Action playbook",
        url: `${siteUrl}/operations`,
        description:
          "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          name: websiteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: organizationName,
        },
      },
      buildBreadcrumbList([
        { name: "Weekly briefing", path: "/" },
        { name: "Action playbook", path: "/operations" },
      ]),
    ],
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    statusLabel,
    treasury,
    treasuryProvenance,
  } = await loadReportData(resolvedSearchParams);
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

  const stageItems = [
    { id: "assess", label: "Assess regime", href: "/signals#regime-timeline", status: "completed" as const },
    { id: "decide", label: "Decide posture", href: "/", status: "completed" as const },
    { id: "guardrails", label: "Set guardrails", href: "/operations/decisions", status: "current" as const },
    { id: "owners", label: "Assign owners", href: "/operations/plan", status: "upcoming" as const },
    { id: "export", label: "Export brief", href: "/operations/briefings", status: "upcoming" as const },
  ];

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
      currentPath="/operations"
      pageSummary="Turn macro signals into execution posture, decision guardrails, and leadership-ready briefs."
      pageSummaryLink={{ href: "#ops-workstreams", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.overview}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#ops-monthly-action-summary", label: "Review monthly actions" }}
      stageRail={{ title: "Global decision flow", items: stageItems }}
      decisionBanner={{
        label: "Decide now",
        decision: "Set this month's operating posture and commit guardrails.",
        horizon: "2-6 weeks",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      actionSequence={{
        title: "Execution sequence",
        items: quickSteps.map((step) => ({ title: step.title, detail: step.detail, href: step.href, cta: step.cta })),
      }}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations" />
        ) : null
      }
    >
      <OperationsWorkstreamNav currentPath="/operations" />

      <CadenceChecklist
        cadence="monthly"
        storageKey="whether-monthly-review-checklist"
        title="Monthly operating review"
        subtitle="Run this sequence once per month to keep teams aligned."
        items={[
          {
            id: "monthly-summary",
            label: "Review monthly summary",
            href: "#ops-monthly-action-summary",
          },
          {
            id: "decision-checks",
            label: "Validate decision guardrails",
            href: appendSearchParamsToRoute("/operations/decisions", resolvedSearchParams),
          },
          {
            id: "briefing-export",
            label: "Export leadership brief",
            href: `${appendSearchParamsToRoute("/operations/briefings", resolvedSearchParams)}#ops-export-briefs`,
          },
        ]}
      />

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
                href={appendSearchParamsToRoute(link.href, resolvedSearchParams) as Route}
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white"
              >
                Open {link.label}
              </Link>
            </article>
          ))}
        </div>
      </SectionedReportPanel>

      <RelatedReportLinks
        title="Keep navigating the report"
        links={[
          {
            href: "/signals",
            label: "Signal evidence",
            description: "Trace the macro evidence and thresholds behind each recommended action.",
          },
          {
            href: "/operations/briefings",
            label: "Briefing kits",
            description: "Export leadership-ready summaries for board, CXO, and planning reviews.",
          },
          {
            href: "/formulas",
            label: "Methodology",
            description: "Review source-linked formula details before finalizing major decisions.",
          },
        ]}
      />
    </ReportShell>
  );
}
