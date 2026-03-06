import type { Metadata } from "next";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { buildBreadcrumbList, buildPageMetadata, websiteName } from "../../lib/seo";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../../lib/timeMachine/timeMachineSelection";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/boardBriefSections";
import {
  FinanceStrategyPanel,
  MonthlyActionSummaryPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../components/appendixSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../lib/navigation/operationsNavigation";
import { OperationsWorkflowProgress } from "./components/operationsWorkflowProgress";
import { ExportBriefPanel } from "./components/exportBriefPanel";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";

export const runtime = "edge";

const roleLensOptions = [
  { key: "founder", label: "Founder" },
  { key: "product", label: "Product" },
  { key: "engineering", label: "Engineering" },
  { key: "finance", label: "Finance" },
] as const;

type RoleLensKey = (typeof roleLensOptions)[number]["key"];

const roleSummaryByKey: Record<RoleLensKey, string> = {
  founder: "Sequence cross-functional commitments and remove low-confidence bets.",
  product: "Translate posture into roadmap, launch cadence, and scope discipline.",
  engineering: "Protect reliability and capacity while preserving reversible options.",
  finance: "Set spend cadence and downside guardrails before approvals.",
};

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook",
  description:
    "Playbook moves, finance posture, and operator requests tuned to the current regime.",
  path: "/operations",
  imageAlt: "Whether action playbook plan view",
  imageParams: {
    template: "operations",
    eyebrow: "Action playbook · Plan",
    title: "Set priorities and resource posture",
    subtitle:
      "Translate regime context into playbook moves, finance posture, and operator requests.",
    kicker: "Plan workstream · Whether",
  },
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
  const requestedRole = resolvedSearchParams?.role;
  const activeRole: RoleLensKey = roleLensOptions.some((option) => option.key === requestedRole)
    ? (requestedRole as RoleLensKey)
    : "founder";
  const buildOperationsHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
    }
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });
    const query = params.toString();
    return query ? `/operations?${query}` : "/operations";
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Whether Report — Action playbook",
        url: `${siteUrl}/operations`,
        description:
          "Playbook moves, finance posture, and operator requests tuned to the current regime.",
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          name: websiteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "Whether",
        },
      },
      buildBreadcrumbList(
        createBreadcrumbTrail([
          { path: "/" },
          { path: "/operations" },
        ]),
      ),
    ],
  };

  const {
    assessment,
    fenceItems,
    fetchedAtLabel,
    historicalSelection,
    internalProvenance,
    macroSeries,
    playbook,
    recordDateLabel,
    sensors,
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
    ? buildTimeMachineHref("/operations", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = historicalSelection
    ? buildTimeMachineHref("/signals?advanced=1#time-machine", historicalSelection)
    : "/signals?advanced=1#time-machine";
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
      : "Live refresh healthy. Next expected update: 15m.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Evidence feed is live; use it to confirm playbook moves and decision shields.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const roleExposureCards: Array<{
    key: RoleLensKey;
    title: string;
    exposure: string;
    monitor: string;
    move: string;
    decideHref: string;
  }> = [
    {
      key: "founder",
      title: "Founder exposure",
      exposure: "Portfolio sprawl can outpace conviction when posture shifts.",
      monitor: `Track tightness vs threshold gap (${Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime).toFixed(1)} pts).`,
      move: "Pause one long-cycle initiative until this month’s top 3 priorities are fully staffed.",
      decideHref: "/decide?role=ceo",
    },
    {
      key: "product",
      title: "Product exposure",
      exposure: "Roadmap breadth can exceed proof quality during volatile weeks.",
      monitor: `Risk appetite at ${assessment.scores.riskAppetite}/100 should gate launch count and discovery scope.`,
      move: "Convert one roadmap stream into a reversible experiment with explicit rollback trigger.",
      decideHref: "/decide?role=product",
    },
    {
      key: "engineering",
      title: "Engineering exposure",
      exposure: "Reliability debt compounds when commitments rise faster than capacity.",
      monitor: `Regime is ${assessment.regime}; watch deployment risk and incident recovery cadence.`,
      move: "Reserve fixed capacity for reliability and defer architecture bets without 90-day payback proof.",
      decideHref: "/decide?role=engineering",
    },
    {
      key: "finance",
      title: "Finance exposure",
      exposure: "Spend acceleration can outrun signal durability.",
      monitor: `Curve slope at ${assessment.scores.curveSlope === null ? "N/A" : `${assessment.scores.curveSlope.toFixed(2)}%`} should frame commit horizons.`,
      move: "Require staged release gates for any spend increase above current monthly baseline.",
      decideHref: "/decide?role=board",
    },
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
      pageSummary={`Run weekly execution decisions and align the monthly playbook for this cycle. ${roleSummaryByKey[activeRole]}`}
      pageSummaryLink={{ href: "#ops-playbook", label: "Jump to playbook section ↓" }}
      primaryCta={{
        href: "#ops-monthly-action-summary",
        label: "Review weekly + monthly summary",
      }}
      secondaryCta={{ href: "#ops-playbook", label: "Open execution playbook" }}
      exportCta={{ href: "#ops-export-briefs", label: "Copy weekly brief" }}
      nextStep={{
        href: "/decide",
        description: "Translate this into role-specific guidance",
      }}
      pageNavVariant="compact"
      showPageNavigation={true}
      decisionBanner={{
        label: "Align now",
        decision: "Translate the regime into weekly execution calls and a monthly plan.",
        horizon: "This week + month",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      actionSequence={{
        title: "Planning sequence",
        items: [
          {
            title: "Review weekly + monthly summary",
            detail: "Confirm this week's execution posture and monthly priorities.",
            href: "#ops-monthly-action-summary",
            cta: "Open summary",
          },
          {
            title: "Apply playbook moves",
            detail: "Choose start, stop, and fence actions.",
            href: "#ops-playbook",
            cta: "Open playbook",
          },
          {
            title: "Sync finance strategy",
            detail: "Check funding signals before commitments.",
            href: "#ops-finance-strategy",
            cta: "Open finance strategy",
          },
        ],
      }}
      roleSwitcher={{
        active: activeRole,
        options: roleLensOptions.map((option) => ({
          key: option.key,
          label: option.label,
          href: buildOperationsHref({
            role: option.key === "founder" ? null : option.key,
          }),
        })),
      }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.plan}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/operations"
            previousHref={previousHistoricalHref}
            timeMachineHref={historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <OperationsWorkflowProgress currentPath="/operations" />

      <section id="ops-role-exposure" className="weather-panel space-y-4 px-5 py-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Team exposure scan
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Role-specific risk and next moves for this regime.
          </h2>
        </header>
        <div className="grid gap-3 lg:grid-cols-2">
          {roleExposureCards.map((card) => {
            const isActive = card.key === activeRole;
            return (
              <article
                key={card.key}
                className={`weather-surface space-y-2 px-4 py-3 ${
                  isActive
                    ? "border-sky-300/70 bg-sky-500/10"
                    : "border-slate-800/80 bg-slate-950/40"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  {card.title}
                </p>
                <p className="text-sm text-slate-100">{card.exposure}</p>
                <p className="text-sm text-slate-300">{card.monitor}</p>
                <p className="text-sm font-semibold text-slate-100">{card.move}</p>
                <a
                  href={card.decideHref}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                >
                  Open role translation →
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <SectionedReportPanel
        id="ops-monthly-action-summary"
        title="Monthly action summary"
        description="The moves the regime recommends this month."
        tone="sky"
      >
        <MonthlyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </SectionedReportPanel>

      <div className="weather-section-divider" aria-hidden="true" />
      <SectionedReportPanel
        id="ops-playbook"
        title="Playbook"
        description="Start, stop, and fence actions tuned to the current regime."
        tone="amber"
      >
        <PlaybookPanel
          playbook={playbook}
          stopItems={stopItems}
          startItems={startItems}
          fenceItems={fenceItems}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <div className="weather-section-divider" aria-hidden="true" />
      <SectionedReportPanel
        id="ops-finance-strategy"
        title="Finance strategy"
        description="Budget posture and cash timing guidance for the quarter."
        tone="violet"
      >
        <FinanceStrategyPanel
          regime={assessment.regime}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <div className="weather-section-divider" aria-hidden="true" />
      <SectionedReportPanel
        id="ops-export-briefs"
        title="Export briefs"
        description="Copy-ready narratives for leadership updates and stakeholder syncs."
        tone="teal"
      >
        <ExportBriefPanel
          assessment={assessment}
          treasury={treasury}
          sensors={sensors}
          macroSeries={macroSeries}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <div className="weather-section-divider" aria-hidden="true" />
      <SectionedReportPanel
        id="ops-operator-requests"
        title="Operator requests"
        description="Current asks for operators driving execution."
        tone="sky"
      >
        <OperatorRequestsPanel provenance={internalProvenance} showProvenance={false} />
      </SectionedReportPanel>
    </ReportShell>
  );
}
