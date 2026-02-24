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
import {
  operationsSectionLinks,
  operationsWorkstreamLinks,
} from "../../lib/navigation/operationsNavigation";
import { appendSearchParamsToRoute } from "../../lib/navigation/routeSearchParams";
import { ExecutionTable } from "../components/executionTable";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { OperationsWorkflowProgress } from "./components/operationsWorkflowProgress";

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
    "Premium module preview",
    "Coming-soon status and rollout guidance",
    "Use Plan + Briefings in the current release",
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
      title: "Pick a workstream",
      detail:
        "Route to plan, decisions, or briefings based on the question at hand.",
      href: "#ops-workstreams",
      cta: "Review workstreams",
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
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Signals are live; apply these guardrails in weekly and monthly planning.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

  const workstreamCards = operationsWorkstreamLinks.filter(
    (link) => link.href !== "/operations",
  );
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
      href: "#ops-workstreams",
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
      pageSummary="Translate posture into hiring, spend, and planning guardrails."
      pageSummaryLink={{
        href: "#ops-workstreams",
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
            href: "#ops-workstreams",
            metric: "riskAppetite",
          },
          { label: "Base rate", href: "#ops-horizon-plan", metric: "baseRate" },
        ]}
        openPanelHref="/signals#time-machine"
      />

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

      <section
        className="weather-panel space-y-4 px-6 py-5"
        aria-label="Execution lenses"
      >
        <header>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Operating guardrails
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Convert the current posture into concrete planning constraints.
          </h2>
        </header>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            {
              title: "Finance lens",
              detail:
                "Stress-test funding posture, margin protection, and spend pacing before locking commitments.",
            },
            {
              title: "Product lens",
              detail:
                "Prioritize customer-critical scope and sequence bets around near-term demand certainty.",
            },
            {
              title: "Engineering lens",
              detail:
                "Translate posture into capacity guardrails, reliability thresholds, and delivery constraints.",
            },
          ].map((lens) => (
            <article key={lens.title} className="weather-surface space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {lens.title}
              </p>
              <p className="text-sm text-slate-200">{lens.detail}</p>
            </article>
          ))}
        </div>
      </section>

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
        <p className="text-sm font-semibold text-slate-200">Time horizon: {activeHorizon === "week" ? "This week" : activeHorizon === "month" ? "This month" : "This quarter"}</p>
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
        <ExecutionTable
          title="Execution table"
          rows={visibleHorizonPlan.map((item) => ({
            horizon: item.horizon,
            owner: item.ownerRole,
            due: item.dueWindow,
            impact: item.impact,
            href: appendSearchParamsToRoute(item.href, resolvedSearchParams),
            ctaLabel: `Review ${item.horizon.toLowerCase()} actions`,
          }))}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-workstreams"
        title="Upcoming Enhancements"
        description="Roadmap view of capability investments and delivery status."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workstreamCards.map((link) => (
            <article
              key={link.href}
              className="weather-surface flex h-full flex-col gap-4 p-5"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                    {link.label}
                  </p>
                  {link.tier === "premium" ? (
                    <span className="inline-flex min-h-[22px] items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                      <span aria-hidden="true">👑</span>
                      Premium
                    </span>
                  ) : null}
                  {link.availability === "coming-soon" ? (
                    <span className="inline-flex min-h-[22px] items-center rounded-full border border-amber-300/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                      Planned
                    </span>
                  ) : null}
                  {link.tier === "premium" ? (
                    <span className="inline-flex min-h-[22px] items-center rounded-full border border-sky-300/50 bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                      In development
                    </span>
                  ) : null}
                  {link.availability !== "coming-soon" ? (
                    <span className="inline-flex min-h-[22px] items-center rounded-full border border-indigo-300/50 bg-indigo-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-100">
                      Researching
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-300">{link.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-200">
                {workstreamHighlights[link.href]?.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Owner</dt>
                  <dd className="text-slate-200">
                    Assign in weekly ops review
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Due date</dt>
                  <dd className="text-slate-200">This cycle</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Impact</dt>
                  <dd className="text-slate-200">High operational leverage</dd>
                </div>
              </dl>
              <Link
                href={
                  appendSearchParamsToRoute(
                    link.href,
                    resolvedSearchParams,
                  ) as Route
                }
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white"
              >
                Review {link.label}
              </Link>
            </article>
          ))}
        </div>
      </SectionedReportPanel>

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
