import type { Metadata } from "next";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { ReportShell } from "../components/reportShell";
import {
  BeginnerGlossaryPanel,
  FirstTimeGuidePanel,
  HistoricalBanner,
} from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Onboarding",
  description:
    "Get oriented with the Whether Report: a quick guide to reading the signals and a plain-English glossary.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const onboardingSteps = [
    {
      title: "Orient to the report",
      detail: "Scan the weekly summary, confidence score, and operating constraints.",
      href: "#first-time-guide",
      cta: "Start the guide",
      emphasis: "primary",
    },
    {
      title: "Decode the vocabulary",
      detail: "Use the glossary to translate macro terms into product implications.",
      href: "#beginner-glossary",
      cta: "Open the glossary",
      emphasis: "secondary",
    },
    {
      title: "Apply the signals",
      detail: "Move to the signals page when you need line-item evidence.",
      href: "/signals",
      cta: "Go to signals",
      emphasis: "secondary",
    },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Onboarding",
    url: `${siteUrl}/onboarding`,
    description:
      "Get oriented with the Whether Report: a quick guide to reading the signals and a plain-English glossary.",
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
  const sectionLinks = [
    { href: "#first-time-guide", label: "Orientation steps" },
    { href: "#beginner-glossary", label: "Plain-English glossary" },
  ];

  const {
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    statusLabel,
    treasury,
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
    ? "Use for retrospectives only; return to live data for real-time planning."
    : isFallback
      ? "Hold critical decisions until live signals return or you validate the cache."
      : "Safe to use for onboarding; proceed with normal planning workflows.";
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
      pageTitle="Onboarding"
      pageSummary="Start with the basics, then decode the signals in plain English."
      pageSummaryLink={{ href: "#first-time-guide", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#first-time-guide", label: "Start orientation" }}
      secondaryCta={undefined}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/onboarding" />
        ) : null
      }
    >
      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Recommended onboarding path
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Start with the three-step baseline, then branch out as needed.
            </h2>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {onboardingSteps.map((step, index) => (
            <article key={step.title} className="weather-surface flex h-full flex-col gap-3 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Step {index + 1} of {onboardingSteps.length}
                </p>
                <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                <p className="text-sm text-slate-300">{step.detail}</p>
              </div>
              {step.emphasis === "primary" ? (
                <a
                  href={step.href}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta}
                </a>
              ) : (
                <a
                  href={step.href}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-slate-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {step.cta} →
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <FirstTimeGuidePanel
        statusLabel={statusLabel}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
      />

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
