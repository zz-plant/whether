import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildPageMetadata,
  organizationName,
  websiteName,
} from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { RelatedReportLinks } from "../components/relatedReportLinks";
import { CadenceChecklist } from "../components/cadenceChecklist";
import {
  HistoricalBanner,
  MonthlyActionSummaryPanel,
} from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../lib/navigation/operationsNavigation";
import { appendSearchParamsToRoute } from "../../lib/navigation/routeSearchParams";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { OperationsWorkflowProgress } from "./components/operationsWorkflowProgress";
import { buildTrustStatus } from "../../lib/report/trustStatus";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook",
  description:
    "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
  path: "/operations",
  imageAlt: "Whether Report action playbook overview",
});


export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const quickSteps = [
    {
      title: "Confirm the posture",
      detail: "Use the regime to decide what to fund now vs. defer.",
      href: "#ops-monthly-action-summary",
      cta: "Review monthly actions",
      emphasis: "primary",
    },
    {
      title: "Choose the planning horizon",
      detail:
        "Focus this week, month, or quarter before assigning owners and due dates.",
      href: "#ops-horizon-plan",
      cta: "Review horizon plan",
      emphasis: "secondary",
    },
    {
      title: "Export the brief",
      detail:
        "Generate copy-ready output for exec syncs, board prep, and team alignment.",
      href: "/operations/briefings",
      cta: "Review briefing kits",
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
      "Use historical data for retrospectives; avoid approving new bets until live signals return.",
    fallbackAction:
      "Hold irreversible decisions until live signals return or you validate the cache.",
    stableAction:
      "Signals are live; apply these guardrails in weekly and monthly planning.",
  });

  const horizonPlan = [
    {
      horizon: "This week",
      objective: "Commit immediate scope and freeze non-essential spend.",
      ownerRole: "Product + Engineering",
      dueWindow: "Friday EOD",
      impact: "Protect reliability and delivery confidence.",
      href: "#ops-monthly-action-summary",
    },
    {
      horizon: "This month",
      objective: "Align workstream owners and publish operating guardrails.",
      ownerRole: "Staff PM + Finance partner",
      dueWindow: "Month-end review",
      impact: "Reduce drift and improve sequencing.",
      href: "#ops-monthly-action-summary",
    },
    {
      horizon: "This quarter",
      objective: "Rebalance roadmap bets against regime constraints.",
      ownerRole: "Exec staff",
      dueWindow: "Quarterly planning",
      impact: "Improve capital efficiency under current posture.",
      href: "/operations/plan",
    },
  ] as const;

  const horizonTabs = ["week", "month", "quarter"] as const;
  type HorizonTab = (typeof horizonTabs)[number];
  const requestedHorizon = resolvedSearchParams?.horizon;
  const activeHorizon: HorizonTab =
    requestedHorizon && horizonTabs.includes(requestedHorizon as HorizonTab)
      ? (requestedHorizon as HorizonTab)
      : "week";
  const buildHorizonHref = (horizon: HorizonTab) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "horizon") {
          params.set(key, value);
        }
      });
    }
    if (horizon !== "week") {
      params.set("horizon", horizon);
    }
    const query = params.toString();
    return query ? `/operations?${query}` : "/operations";
  };
  const horizonKeyByLabel = {
    "This week": "week",
    "This month": "month",
    "This quarter": "quarter",
  } as const;
  const visibleHorizonPlan = horizonPlan.filter(
    (item) => horizonKeyByLabel[item.horizon] === activeHorizon,
  );
  const requestedMode = resolvedSearchParams?.mode;
  const isExpertMode = requestedMode === "expert";
  const buildModeHref = (mode: "guided" | "expert") => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "mode") {
          params.set(key, value);
        }
      });
    }
    if (mode === "expert") {
      params.set("mode", "expert");
    }
    const query = params.toString();
    return query ? `/operations?${query}` : "/operations";
  };
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
      pageTitle="Playbook"
      currentPath="/operations"
      pageSummary="Guardrails, sequencing, and execution trade-offs for this posture."
      pageSummaryLink={{
        href: "#ops-horizon-plan",
        label: "Review guardrails",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.overview}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{
        href: "#ops-monthly-action-summary",
        label: "Review monthly actions",
      }}
      decisionBanner={{
        label: "Decide now",
        decision: "Set this month's posture and commit guardrails.",
        horizon: "2-6 weeks",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      actionSequence={{
        title: "Plan",
        items: quickSteps.map((step) => ({
          title: step.title,
          detail: step.detail,
          href: step.href,
          cta: step.cta,
        })),
      }}
      decisionDiffs={[{ label: "Up from last week", tone: "positive" }]}
      nextStep={{
        description: "Turn this playbook into owner assignments and exports.",
        href: appendSearchParamsToRoute(
          "/operations/plan",
          resolvedSearchParams,
        ),
      }}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/operations"
          />
        ) : null
      }
    >
      <ReturningVisitorDeltaStrip
        assessment={assessment}
        recordDate={treasury.record_date}
        impactLinks={[
          {
            label: "Tightness",
            href: "#ops-monthly-action-summary",
            metric: "tightness",
          },
          {
            label: "Risk appetite",
            href: "#ops-horizon-plan",
            metric: "riskAppetite",
          },
          { label: "Base rate", href: "#ops-horizon-plan", metric: "baseRate" },
        ]}
        openPanelHref="/signals#time-machine"
      />



      <SectionedReportPanel
        id="ops-horizon-plan"
        title="Time horizon plan"
        description="Decide moves for this week, month, and quarter."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {horizonTabs.map((horizon) => {
            const active = horizon === activeHorizon;
            const label =
              horizon === "week"
                ? "This week"
                : horizon === "month"
                  ? "This month"
                  : "This quarter";
            return (
              <Link
                key={horizon}
                href={buildHorizonHref(horizon) as Route}
                aria-current={active ? "page" : undefined}
                className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                  active
                    ? "border-sky-200/90 bg-sky-500/20 text-white shadow-sm shadow-sky-900/40"
                    : "opacity-80 text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {visibleHorizonPlan.map((item) => (
            <article
              key={item.horizon}
              className="weather-surface flex h-full flex-col gap-3 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {item.horizon}
              </p>
              <p className="text-sm font-semibold text-slate-100">
                {item.objective}
              </p>
              <dl className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Owner</dt>
                  <dd className="text-right text-slate-200">
                    {item.ownerRole}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Due</dt>
                  <dd className="text-right text-slate-200">
                    {item.dueWindow}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Expected impact</dt>
                  <dd className="text-right text-slate-200">{item.impact}</dd>
                </div>
              </dl>
              <Link
                href={
                  appendSearchParamsToRoute(
                    item.href,
                    resolvedSearchParams,
                  ) as Route
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
              >
                Review {item.horizon.toLowerCase()} actions
              </Link>
            </article>
          ))}
        </div>
      </SectionedReportPanel>

      <section className="weather-panel space-y-4 px-6 py-5" aria-label="Playbook mode selector">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Mode</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              {isExpertMode ? "Advanced view: open all planning surfaces." : "Simple view: plan → decisions → briefings."}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={buildModeHref("guided")}
              aria-current={!isExpertMode ? "page" : undefined}
              className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                !isExpertMode
                  ? "border-sky-300/80 text-slate-100"
                  : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
              }`}
            >
              Simple view
            </a>
            <a
              href={buildModeHref("expert")}
              aria-current={isExpertMode ? "page" : undefined}
              className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                isExpertMode
                  ? "border-sky-300/80 text-slate-100"
                  : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
              }`}
            >
              Advanced view
            </a>
          </div>
        </header>
        {!isExpertMode ? <OperationsWorkflowProgress currentPath="/operations/plan" /> : null}
        {!isExpertMode ? (
          <article className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">Next action</p>
            <p className="text-sm font-semibold text-slate-100">
              Step 1 complete once you assign owners and due dates for this horizon.
            </p>
            <a
              href={appendSearchParamsToRoute("/operations/decisions", resolvedSearchParams)}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.16em]"
            >
              Step complete — continue to Decisions
            </a>
          </article>
        ) : null}
      </section>

      <CadenceChecklist
        cadence="monthly"
        storageKey="whether-monthly-review-checklist"
        title="Monthly operating review"
        subtitle="Monthly review for team alignment."
        items={[
          {
            id: "monthly-summary",
            label: "Review monthly summary",
            href: "#ops-monthly-action-summary",
          },
          {
            id: "decision-checks",
            label: "Validate decision guardrails",
            href: appendSearchParamsToRoute(
              "/operations/decisions",
              resolvedSearchParams,
            ),
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

      <RelatedReportLinks
        title="Keep navigating the report"
        links={[
          {
            href: "/signals",
            label: "Signal evidence",
            description:
              "Trace the macro evidence and thresholds behind each recommended action.",
          },
          {
            href: "/operations/briefings",
            label: "Briefing kits",
            description:
              "Export leadership-ready summaries for board, CXO, and planning reviews.",
          },
          {
            href: "/methodology",
            label: "Methodology",
            description:
              "Review source-linked formula details before finalizing major decisions.",
          },
        ]}
      />
    </ReportShell>
  );
}
