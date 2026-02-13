import type { Metadata } from "next";
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
  { href: "#briefing-flow", label: "Recommended read order" },
  { href: "#weekly-action-summary", label: "This week's actions" },
  { href: "#weekly-handoff", label: "Next recommended action" },
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "#regime-alerts", label: "New alerts" },
  { href: "#weekly-digest", label: "Weekly digest" },
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
  },
  {
    label: "Decision horizon",
    value: "2-6 weeks",
    detail: "Staffing, roadmap, budget timing",
  },
  {
    label: "Evidence model",
    value: "Treasury + trend checks",
    detail: "Regime score + alert status",
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
        href: "/onboarding",
        label: "Start onboarding",
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
        aria-label="Command center"
        className="weather-panel space-y-6 px-6 py-6"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Command center</p>
          <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
            Weekly planning view with current macro context.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="#weekly-action-summary"
            className="inline-flex min-h-[44px] items-center rounded-full border border-sky-300/70 bg-sky-300/10 px-4 text-xs font-semibold tracking-[0.12em] text-sky-100 transition-colors hover:bg-sky-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
          >
            Review weekly briefing
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {commandCenterHighlights.map((item) => (
            <article key={item.label} className="weather-surface space-y-2 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{item.label}</p>
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
            Operating guidance for macro-sensitive weeks.
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

      <section id="briefing-flow" className="weather-panel space-y-4 px-6 py-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Read order</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">Briefing sequence</h2>
        </div>
        <ol className="grid gap-3 lg:grid-cols-3">
          {briefingFlowSteps.map((item, index) => (
            <li key={item.title} className="weather-surface space-y-3 p-4">
              <div className="inline-flex min-h-[44px] items-center gap-2">
                <span className="weather-pill inline-flex h-7 min-w-7 items-center justify-center px-2 text-[11px] font-semibold tracking-[0.14em] text-slate-200">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              </div>
              <p className="text-sm text-slate-300">{item.detail}</p>
              <a
                href={item.href}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500/80 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {item.ctaLabel}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <CadenceChecklist
        cadence="weekly"
        storageKey="whether-weekly-review-checklist"
        title="Weekly review ritual"
        subtitle="Complete before execution calls."
        items={[
          {
            id: "weekly-actions",
            label: "Confirm this week's actions",
            href: "#weekly-action-summary",
          },
          {
            id: "leadership-summary",
            label: "Align leadership summary",
            href: "#executive-snapshot",
          },
          {
            id: "signal-alerts",
            label: "Validate alerts and signals",
            href: "#regime-alerts",
          },
        ]}
      />


      <section id="weekly-handoff" className="weather-panel space-y-3 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Next recommended action</p>
        <h2 className="text-lg font-semibold text-slate-100">Weekly interpretation complete?</h2>
        <a
          href={operationsPlanHref}
          className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500/80 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          Open plan workspace
        </a>
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
        <WeeklyDigestPanel />
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
    </ReportShell>
  );
}
