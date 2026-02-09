import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveTimeMachineSelection, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";
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
import { ReportShell } from "./components/reportShell";
import { RelatedReportLinks } from "./components/relatedReportLinks";
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

export const generateMetadata = ({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
}): Metadata => {
  const siteName = "Whether — Market Climate Station";
  const siteDescription = defaultSiteDescription;
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
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const sectionLinks = [
    { href: "#operator-fit", label: "Who this is for" },
    { href: "#weekly-action-summary", label: "This week's actions" },
    { href: "#regime-summary", label: "Market climate summary" },
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "#regime-alerts", label: "New alerts" },
    { href: "#regime-assessment", label: "What the scores mean" },
    { href: "#signal-matrix", label: "Signal breakdown" },
  ];
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
      pageSummary="Weekly regime pulse and recommended moves."
      primaryCta={{
        href: "/onboarding",
        label: "Start here: onboarding",
      }}
      secondaryCta={{ href: "#weekly-action-summary", label: "Start with this week" }}
      exportCta={{ href: "#executive-snapshot", label: "See leadership summary" }}
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
      <section id="operator-fit" className="weather-panel space-y-4 px-6 py-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Operator fit</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Fast operating guidance for macro-driven weeks.
          </h2>
          <p className="max-w-3xl text-sm text-slate-300">
            Answer three questions quickly: what regime are we in, what should we do now, and what
            should wait.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            {
              title: "Read the regime",
              detail: "Convert Treasury and macro data into an operating posture.",
            },
            {
              title: "Validate key bets",
              detail: "Pressure-test roadmap, hiring, pricing, and spend before lock-in.",
            },
            {
              title: "Brief leadership quickly",
              detail: "Export source-linked guidance for weekly and monthly reviews.",
            },
          ].map((item) => (
            <article key={item.title} className="weather-surface space-y-2 p-4">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="text-sm text-slate-300">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <ReportGroup
        title="Action priorities"
        description="Lock posture, pick the weekly bet, and align on the constraints before you dig deeper."
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
        description="Confirm the live signal health, then scan the executive snapshot for the week’s guardrails."
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
        description="Review new regime alerts first, then scan the recent alert log for context."
      >
        <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

        <RegimeAlertsPanel />
      </ReportGroup>

      <ReportGroup
        title="Deep dive signals"
        description="Use these references when you need the full scoring detail and signal breakdown."
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
            description: "Inspect every macro source, threshold, and trend behind this week's regime call.",
          },
          {
            href: "/operations",
            label: "Action playbook",
            description: "Convert the current climate into specific execution moves, shields, and briefings.",
          },
          {
            href: "/formulas",
            label: "Methodology",
            description: "Review the exact formulas and official source links used in scoring.",
          },
        ]}
      />
    </ReportShell>
  );
}
