import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveTimeMachineSelection, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
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
  const siteDescription =
    "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
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

  return {
    title,
    description: siteDescription,
    openGraph: {
      type: "website",
      url: siteUrl,
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
    { href: "#operator-fit", label: "Start here" },
    { href: "#weekly-action-summary", label: "1) Decide this week" },
    { href: "#regime-summary", label: "2) Confirm market posture" },
    { href: "#executive-snapshot", label: "3) Align leadership" },
    { href: "#regime-alerts", label: "4) Review alerts" },
    { href: "#regime-assessment", label: "5) Open the deep dive" },
    { href: "#signal-matrix", label: "Signal details" },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Whether — Market Climate Station",
    url: siteUrl,
    description:
      "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Whether"
    }
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
      pageSummary="A step-by-step weekly briefing: decide the move, align the team, then inspect details only if needed."
      primaryCta={{
        href: "/operations/briefings#ops-export-briefs",
        label: "Copy-ready leadership brief",
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
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Start here</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            One clear flow for fast decisions under changing macro conditions.
          </h2>
          <p className="max-w-3xl text-sm text-slate-300">
            Use this page in order: decide what to do this week, align leaders on guardrails, then open
            supporting diagnostics only when you need more proof.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            {
              title: "Step 1 · Decide",
              detail: "Start with this week’s recommended posture and one-week bet.",
            },
            {
              title: "Step 2 · Align",
              detail: "Use leadership summaries to confirm constraints before approving spend and scope.",
            },
            {
              title: "Step 3 · Verify",
              detail: "Open alerts and score detail only when a decision needs deeper evidence.",
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
        title="Step 1: Decide this week"
        description="Pick the weekly move first, then confirm posture and constraints."
      >
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />

        <RegimeSummaryPanel assessment={assessment} provenance={treasuryProvenance} />
      </ReportGroup>

      <ReportGroup
        title="Step 2: Align leadership"
        description="Share a concise readout so teams operate from the same guardrails."
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
        title="Step 3: Check alerts"
        description="Scan change alerts to catch anything that should alter this week’s plan."
      >
        <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

        <RegimeAlertsPanel />
      </ReportGroup>

      <ReportGroup
        title="Step 4: Open deep dive (optional)"
        description="Use score math and signal breakdown only when stakeholders need full justification."
      >
        <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />

        <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
      </ReportGroup>
    </ReportShell>
  );
}
