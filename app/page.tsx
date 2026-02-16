import type { Metadata } from "next";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  resolveTimeMachineSelection,
  parseTimeMachineRequest,
  buildTimeMachineHref,
} from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
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
import { ChangeSinceLastReadPanel } from "./components/changeSinceLastReadPanel";
import { RegimeAlertsPanel } from "./components/regimeAlertsPanel";
import { WeeklyDigestPanel } from "./components/weeklyDigestPanel";
import { ReportShell } from "./components/reportShell";
import { RelatedReportLinks } from "./components/relatedReportLinks";
import { CadenceChecklist } from "./components/cadenceChecklist";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { appendSearchParamsToRoute } from "../lib/navigation/routeSearchParams";

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
  const activeView = resolvedSearchParams?.view === "summary" ? "summary" : "full";
  const buildViewHref = (view: "summary" | "full") => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "view") {
          params.set(key, value);
        }
      });
    }
    if (view === "summary") {
      params.set("view", "summary");
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
  } = await loadReportData(resolvedSearchParams);
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
            <p className="text-xs text-slate-500">Summary ≈ 2 min · Full report ≈ 8 min</p>
            {[
              { key: "summary", label: "Summary" },
              { key: "full", label: "Full report" },
            ].map((option) => {
              const isActive = option.key === activeView;
              return (
                <a
                  key={option.key}
                  href={buildViewHref(option.key as "summary" | "full")}
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

      {activeView === "summary" ? (
        <details className="weather-panel group space-y-4 px-6 py-5">
          <summary className="inline-flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.16em] text-slate-300 marker:content-none">
            Open alerts, deep-dive signals, and continuation links
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M7 10l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>
          <div className="space-y-10 pt-2">
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
          </div>
        </details>
      ) : (
        <>
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
