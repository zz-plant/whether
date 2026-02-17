import type { Metadata } from "next";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { SeriesHistoryPoint } from "../lib/types";
import {
  resolveTimeMachineSelection,
  parseTimeMachineRequest,
  buildTimeMachineHref,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { getTimeMachineRollingYieldSeries } from "../lib/timeMachine/timeMachineCache";
import { siteUrl } from "../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  defaultSiteDescription,
  organizationName,
  websiteName,
} from "../lib/seo";
import {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
  RegimeSummaryPanel,
  RegimeAssessmentCard,
  RegimeChangeAlertPanel,
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ChangeSinceLastReadPanel, ReturningVisitorDeltaStrip } from "./components/changeSinceLastReadPanel";
import { RegimeAlertsPanel } from "./components/regimeAlertsPanel";
import { WeeklyDigestPanel } from "./components/weeklyDigestPanel";
import { ReportShell } from "./components/reportShell";
import { RelatedReportLinks } from "./components/relatedReportLinks";
import { CadenceChecklist } from "./components/cadenceChecklist";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { appendSearchParamsToRoute } from "../lib/navigation/routeSearchParams";
import { formatTimestampUTC } from "../lib/formatters";
import { MiniSeriesRow } from "./components/miniSeriesRow";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ReportGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section aria-label={title} className="space-y-6">
    <div className="sr-only">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="space-y-10">{children}</div>
  </section>
);

const homeSectionSequence = [
  { href: "#operator-fit", label: "Who this is for" },
  { href: "#weekly-action-summary", label: "This week's forecast" },
  { href: "#weekly-action-summary", label: "Next recommended move" },
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "#regime-alerts", label: "New alerts" },
  { href: "#weekly-digest", label: "Signs to watch" },
  { href: "#regime-summary", label: "Market climate summary" },
  { href: "#signal-matrix", label: "Signal breakdown" },
  { href: "#regime-assessment", label: "What the scores mean" },
] as const;

const operatorFitPrimitives = [
  {
    title: "Audience",
    detail: "Product and engineering leaders.",
  },
  {
    title: "Decision window",
    detail: "Weekly planning, staffing, and budget checkpoints.",
  },
  {
    title: "Primary output",
    detail: "What to do now, monitor, or delay.",
  },
] as const;

const commandCenterHighlights = [
  {
    label: "Cadence",
    value: "Weekly",
    detail: "Mon briefing + midweek check",
    glyph: "◴",
  },
  {
    label: "Decision horizon",
    value: "2-6 weeks",
    detail: "Staffing, roadmap, budget timing",
    glyph: "⌖",
  },
  {
    label: "Evidence model",
    value: "Treasury + trend checks",
    detail: "Regime score + alert status",
    glyph: "◌",
  },
] as const;

const briefingFlowSteps = [
  {
    title: "Set this week",
    detail: "Lock this week's operating posture.",
    href: "#weekly-action-summary",
    ctaLabel: "Open actions",
  },
  {
    title: "Align leadership",
    detail: "Confirm constraints and confidence.",
    href: "#executive-snapshot",
    ctaLabel: "Open summary",
  },
  {
    title: "Validate with evidence",
    detail: "Check alerts and signals before committing.",
    href: "#regime-alerts",
    ctaLabel: "Open alerts",
  },
] as const;

const roleFlowOverrides = {
  product: [
    {
      title: "Set product scope",
      detail: "Decide what to accelerate, defer, or sequence with guardrails.",
      href: "#weekly-action-summary",
      ctaLabel: "Open scope actions",
    },
    {
      title: "Align engineering risk",
      detail: "Confirm reliability and staffing constraints for in-flight work.",
      href: "#executive-snapshot",
      ctaLabel: "Open risk summary",
    },
    {
      title: "Confirm budget timing",
      detail: "Validate spend windows before committing irreversible bets.",
      href: "#regime-alerts",
      ctaLabel: "Open spend alerts",
    },
  ],
  engineering: [
    {
      title: "Set delivery posture",
      detail: "Confirm whether to protect throughput or prioritize resiliency work.",
      href: "#weekly-action-summary",
      ctaLabel: "Open delivery actions",
    },
    {
      title: "Validate constraints",
      detail: "Review risk signals before adding operational complexity.",
      href: "#signal-matrix",
      ctaLabel: "Open constraints",
    },
    {
      title: "Assign execution owners",
      detail: "Route guardrail decisions to the right team owners this week.",
      href: "#regime-summary",
      ctaLabel: "Open owner view",
    },
  ],
  finance: [
    {
      title: "Set spending posture",
      detail: "Lock this week's discretionary spend stance.",
      href: "#weekly-action-summary",
      ctaLabel: "Open spend actions",
    },
    {
      title: "Review confidence",
      detail: "Check fallback and confidence before approving medium-term commitments.",
      href: "#executive-snapshot",
      ctaLabel: "Open confidence summary",
    },
    {
      title: "Verify evidence trail",
      detail: "Confirm signals before changing quarterly budget allocations.",
      href: "#signal-matrix",
      ctaLabel: "Open evidence",
    },
  ],
} as const;

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<Metadata> => {
  const siteName = "Whether — Market Climate Station";
  const siteDescription = defaultSiteDescription;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selection = resolveTimeMachineSelection(resolvedSearchParams);
  const requestedSelection = parseTimeMachineRequest(resolvedSearchParams);
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
  const canonicalUrl = buildCanonicalUrl("/");

  return {
    title,
    description: siteDescription,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
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
  searchParams?: Promise<{ month?: string; year?: string; [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const roleOptions = [
    { key: "all", label: "Cross-functional" },
    { key: "product", label: "Product lead" },
    { key: "engineering", label: "Eng lead" },
    { key: "finance", label: "Finance partner" },
  ] as const;
  type RoleKey = (typeof roleOptions)[number]["key"];
  const requestedRole = resolvedSearchParams?.role;
  const activeRole: RoleKey =
    roleOptions.some((role) => role.key === requestedRole)
      ? (requestedRole as RoleKey)
      : "all";
  const buildRoleHref = (role: RoleKey) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "role") {
          params.set(key, value);
        }
      });
    }
    if (role !== "all") {
      params.set("role", role);
    }
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  const activeView = resolvedSearchParams?.view === "evidence" ? "evidence" : "narrative";
  const buildViewHref = (view: "narrative" | "evidence") => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "view") {
          params.set(key, value);
        }
      });
    }
    if (view === "evidence") {
      params.set("view", "evidence");
    }
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  const sectionLinks = homeSectionSequence.map((section, index) => ({
    href: section.href,
    label: `${index + 1}. ${section.label}`,
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: organizationName,
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: websiteName,
        url: siteUrl,
        description: defaultSiteDescription,
        inLanguage: "en",
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
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        about: {
          "@type": "Thing",
          name: "Macro signal operations guidance",
        },
        mainEntity: {
          "@type": "Dataset",
          name: "US Treasury yield curve snapshot",
          isBasedOn: {
            "@type": "CreativeWork",
            name: "US Treasury Fiscal Data API",
            url: "https://fiscaldata.treasury.gov/api-documentation/",
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
    lastYearComparison,
    statusLabel,
    treasury,
    treasuryProvenance,
    macroSeries,
  } = await loadReportData(resolvedSearchParams);

  const computeZScore = (series: SeriesHistoryPoint[], latestValue: number | null) => {
    if (latestValue === null) {
      return null;
    }

    const values = series
      .map((point) => point.value)
      .filter((value): value is number => typeof value === "number");

    if (values.length < 2) {
      return null;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const deviation = Math.sqrt(variance);

    if (!Number.isFinite(deviation) || deviation === 0) {
      return null;
    }

    return (latestValue - mean) / deviation;
  };

  const cpiSignal = macroSeries.find((series) => series.id === "CPI_YOY");
  const unemploymentSignal = macroSeries.find((series) => series.id === "UNEMPLOYMENT_RATE");
  const spreadSignal = macroSeries.find((series) => series.id === "BBB_CREDIT_SPREAD");

  const rollingYieldSeries = getTimeMachineRollingYieldSeries(60, treasury.record_date);
  const curveSeries = rollingYieldSeries.tenYear.map((point, index) => ({
    date: point.date,
    value:
      point.value !== null && rollingYieldSeries.twoYear[index]?.value !== null
        ? Number((point.value - (rollingYieldSeries.twoYear[index]?.value ?? 0)).toFixed(2))
        : null,
  }));

  const evidenceRows = [
    {
      key: "curve",
      name: "Yield curve slope (10Y−2Y)",
      latestValue: assessment.scores.curveSlope === null ? "N/A" : `${assessment.scores.curveSlope.toFixed(2)}%`,
      zScore: computeZScore(curveSeries, assessment.scores.curveSlope),
      series: curveSeries,
      thresholds: [{ label: "Inversion", value: 0 }],
      updatedAt: formatTimestampUTC(treasury.fetched_at),
      insight:
        assessment.scores.curveSlope !== null && assessment.scores.curveSlope < 0
          ? "Curve remains inverted; keep approval bars high and prioritize fast-payback bets."
          : "Curve has normalized; selective medium-horizon investments can move into review.",
    },
    {
      key: "base-rate",
      name: "Policy proxy rate (1M Treasury)",
      latestValue: treasury.yields.oneMonth === null ? "N/A" : `${treasury.yields.oneMonth.toFixed(2)}%`,
      zScore: computeZScore(rollingYieldSeries.oneMonth, treasury.yields.oneMonth),
      series: rollingYieldSeries.oneMonth,
      thresholds: [{ label: "Tightness threshold", value: assessment.thresholds.baseRateTightness }],
      updatedAt: formatTimestampUTC(treasury.fetched_at),
      insight:
        treasury.yields.oneMonth !== null && treasury.yields.oneMonth >= assessment.thresholds.baseRateTightness
          ? "Funding conditions are still restrictive; gate discretionary hiring and long-payback work."
          : "Funding pressure is easing; plan controlled re-acceleration only where demand is validated.",
    },
    {
      key: "cpi",
      name: "Inflation pulse (CPI YoY)",
      latestValue: cpiSignal?.value === null || cpiSignal?.value === undefined ? "N/A" : `${cpiSignal.value.toFixed(2)}%`,
      zScore: computeZScore(cpiSignal?.history ?? [], cpiSignal?.value ?? null),
      series: cpiSignal?.history ?? [],
      thresholds: [{ label: "Target", value: 2 }],
      updatedAt: formatTimestampUTC(cpiSignal?.fetched_at ?? treasury.fetched_at),
      insight:
        (cpiSignal?.value ?? 0) > 3
          ? "Sticky inflation reinforces pricing discipline and cost-control checks in weekly planning."
          : "Cooling inflation supports steadier assumptions for supplier and payroll planning.",
    },
    {
      key: "unemployment",
      name: "Labor slack (unemployment rate)",
      latestValue:
        unemploymentSignal?.value === null || unemploymentSignal?.value === undefined
          ? "N/A"
          : `${unemploymentSignal.value.toFixed(2)}%`,
      zScore: computeZScore(unemploymentSignal?.history ?? [], unemploymentSignal?.value ?? null),
      series: unemploymentSignal?.history ?? [],
      thresholds: [{ label: "Stress watch", value: 5 }],
      updatedAt: formatTimestampUTC(unemploymentSignal?.fetched_at ?? treasury.fetched_at),
      insight:
        (unemploymentSignal?.value ?? 0) >= 4.5
          ? "Labor softening calls for conservative revenue assumptions and tighter hiring plans."
          : "Labor remains resilient; focus on retention and selective backfills over broad expansion.",
    },
    {
      key: "credit",
      name: "Credit stress (BBB spread)",
      latestValue:
        spreadSignal?.value === null || spreadSignal?.value === undefined
          ? "N/A"
          : `${spreadSignal.value.toFixed(2)}%`,
      zScore: computeZScore(spreadSignal?.history ?? [], spreadSignal?.value ?? null),
      series: spreadSignal?.history ?? [],
      thresholds: [{ label: "Stress line", value: 2.5 }],
      updatedAt: formatTimestampUTC(spreadSignal?.fetched_at ?? treasury.fetched_at),
      insight:
        (spreadSignal?.value ?? 0) > 2.5
          ? "Wider spreads signal tighter credit access; protect runway and avoid fragile launch timing."
          : "Contained spreads support normal execution cadence with standard contingency buffers.",
    },
  ] as const;
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const operationsPlanHref = buildTimeMachineHref("/operations/plan", historicalSelection);
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
  const stageItems = [
    { id: "assess", label: "Assess regime", href: buildTimeMachineHref("/signals#regime-timeline", historicalSelection), status: "completed" as const },
    { id: "decide", label: "Decide posture", href: "#weekly-action-summary", status: "current" as const },
    { id: "guardrails", label: "Set guardrails", href: buildTimeMachineHref("/operations/decisions", historicalSelection), status: "upcoming" as const },
    { id: "owners", label: "Assign owners", href: buildTimeMachineHref("/operations/plan", historicalSelection), status: "upcoming" as const },
    { id: "export", label: "Export brief", href: buildTimeMachineHref("/operations/briefings", historicalSelection), status: "upcoming" as const },
  ];
  const activeBriefingFlowSteps =
    activeRole === "all" ? briefingFlowSteps : roleFlowOverrides[activeRole];

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
      currentPath="/"
      pageSummary="Weekly regime pulse and recommended moves."
      primaryCta={{
        href: "#weekly-action-summary",
        label: "Review weekly actions",
      }}
      secondaryCta={{ href: "#executive-snapshot", label: "Review leadership summary" }}
      stageRail={{ title: "Global decision flow", items: stageItems }}
      decisionBanner={{
        label: "Decide now",
        decision: "Set this week's operating posture before committing scope.",
        horizon: "This week",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#signal-matrix",
      }}
      actionSequence={{
        title: "Recommended sequence",
        items: activeBriefingFlowSteps.map((step) => ({
          title: step.title,
          detail: step.detail,
          href: step.href,
          cta: step.ctaLabel,
        })),
      }}
      roleSwitcher={{
        active: activeRole,
        options: roleOptions.map((role) => ({
          key: role.key,
          label: role.label,
          href: buildRoleHref(role.key),
        })),
      }}
      decisionDiffs={[
        { label: "New this cycle", tone: "neutral" },
        {
          label: `Trust: ${trustStatusLabel}`,
          tone: trustStatusTone === "stable" ? "positive" : "warning",
        },
      ]}
      nextStep={{
        description: "Validate the signal evidence before assigning owners.",
        href: `${appendSearchParamsToRoute("/signals" as Route, resolvedSearchParams)}#regime-timeline`,
      }}
      sidebarVariant="hidden"
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
    >
      <ReturningVisitorDeltaStrip
        assessment={assessment}
        recordDate={treasury.record_date}
      />

      <section
        aria-label="Read this first"
        className="weather-panel space-y-6 px-6 py-6"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Read this first</p>
          <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
            Decision card: what changed, what to do now, and how confident to be.
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">View mode</p>
            <p className="text-xs text-slate-500">Narrative briefing · Dense evidence view</p>
            {[
              { key: "narrative", label: "Narrative" },
              { key: "evidence", label: "Evidence" },
            ].map((option) => {
              const isActive = option.key === activeView;
              return (
                <a
                  key={option.key}
                  href={buildViewHref(option.key as "narrative" | "evidence")}
                  aria-current={isActive ? "page" : undefined}
                  className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
                    isActive
                      ? "border-sky-300/80 text-slate-100"
                      : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </a>
              );
            })}
          </div>
        </div>
        <article className="weather-surface space-y-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What changed</p>
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What to do now</p>
          <p className="text-sm text-slate-200">{trustStatusAction}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confidence and caveat</p>
          <p className="text-sm text-slate-200">
            {trustStatusLabel} · {trustStatusDetail}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#weekly-action-summary"
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-300/80 hover:text-white"
            >
              Execute weekly actions
            </a>
            <a
              href="#signal-matrix"
              className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              Review evidence trail
            </a>
          </div>
        </article>
        <div className="grid gap-3 md:grid-cols-3">
          {commandCenterHighlights.map((item) => (
            <article key={item.label} className="weather-surface space-y-2 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                <span className="mr-1 text-slate-300" aria-hidden="true">
                  {item.glyph}
                </span>
                {item.label}
              </p>
              <p className="text-base font-semibold text-slate-100">{item.value}</p>
              <p className="text-sm text-slate-300">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {activeView === "evidence" ? (
        <section id="evidence-matrix" aria-labelledby="evidence-matrix-title" className="weather-panel space-y-4 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Evidence matrix</p>
            <h2 id="evidence-matrix-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
              High-density macro evidence for weekly operating decisions.
            </h2>
            <p className="text-sm text-slate-300">
              <abbr title="Year-over-year" className="cursor-help no-underline">YoY</abbr>, <abbr title="Basis points" className="cursor-help no-underline">bps</abbr>, and <abbr title="10-year minus 2-year Treasury spread" className="cursor-help no-underline">10Y−2Y</abbr> use inline tooltip definitions.
            </p>
          </div>
          <div className="space-y-3">
            {evidenceRows.map(({ key, ...row }) => (
              <MiniSeriesRow key={key} {...row} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section id="operator-fit" className="weather-panel space-y-4 px-6 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Operator fit</p>
              <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
                Operational guidance for macro-sensitive weeks.
              </h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {operatorFitPrimitives.map((item) => (
                <article key={item.title} className="weather-surface space-y-2 p-4">
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="text-sm text-slate-300">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <ReportGroup
            title="Action priorities"
            description="Lock posture and align on this week's constraints."
          >
            <WeeklyActionSummaryPanel
              assessment={assessment}
              provenance={treasuryProvenance}
              recordDateLabel={recordDateLabel}
            />

            <RegimeSummaryPanel assessment={assessment} provenance={treasuryProvenance} />
          </ReportGroup>

          <ReportGroup
            title="Leadership readout"
            description="Confirm signal health and review this week's guardrails."
          >
            <ExecutiveSnapshotPanel
              treasury={treasury}
              assessment={assessment}
              provenance={treasuryProvenance}
            />

            <ChangeSinceLastReadPanel
              assessment={assessment}
              lastYearComparison={lastYearComparison}
              recordDate={treasury.record_date}
              provenance={treasuryProvenance}
            />
          </ReportGroup>

          <ReportGroup
            title="Alert center"
            description="Review new alerts, then scan the recent log."
          >
            <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

            <RegimeAlertsPanel />
            <WeeklyDigestPanel assessment={assessment} />
          </ReportGroup>

          <ReportGroup
            title="Deep dive signals"
            description="Use these references for full scoring detail."
          >
            <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />

            <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
          </ReportGroup>

          <RelatedReportLinks
            title="Continue through the report system"
            links={[
              {
                href: "/signals",
                label: "Signal evidence",
                description: "Inspect source data, thresholds, and trend context.",
              },
              {
                href: "/operations",
                label: "Action playbook",
                description: "Convert the climate into concrete execution moves.",
              },
              {
                href: "/formulas",
                label: "Methodology",
                description: "Review formulas and official source links.",
              },
            ]}
          />
        </>
      )}
    </ReportShell>
  );
}
