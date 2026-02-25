import type { Metadata } from "next";
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
import {
  BeginnerGlossaryPanel,
  FirstTimeGuidePanel,
  HistoricalBanner,
} from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { OnboardingChecklistProgress } from "./components/onboardingChecklistProgress";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Onboarding & glossary",
  description:
    "Get oriented with the Whether Report: a quick guide to reading the signals and a plain-English glossary.",
  path: "/onboarding",
  imageAlt: "Whether Report onboarding and glossary overview",
  imageParams: {
    template: "guides",
    eyebrow: "Onboarding",
    title: "Get fluent in the weekly macro briefing",
    subtitle:
      "Learn the signal vocabulary, reading flow, and operating cues used across Whether.",
    kicker: "Start here for first-time and returning users.",
  },
});

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeExperience =
    resolvedSearchParams?.experience === "returning" ? "returning" : "new";
  const buildExperienceHref = (experience: "new" | "returning") => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "experience") {
          params.set(key, value);
        }
      });
    }
    if (experience === "returning") {
      params.set("experience", "returning");
    }
    const query = params.toString();
    return query ? `/onboarding?${query}` : "/onboarding";
  };
  const onboardingSteps = [
    {
      title: "Orient to the report",
      detail:
        activeExperience === "new"
          ? "Three questions: current regime, favored moves, and avoidances."
          : "Refresh the regime, confidence cue, and operating posture.",
      href: "#first-time-guide",
      cta: "View orientation steps",
      emphasis: "primary",
    },
    {
      title: "Decode the vocabulary",
      detail:
        activeExperience === "new"
          ? "Translate macro terms into product, engineering, and finance decisions."
          : "Skim only terms that changed since your last memo.",
      href: "#beginner-glossary",
      cta: "Open the glossary",
      emphasis: "secondary",
    },
    {
      title: "Apply the signals",
      detail:
        activeExperience === "new"
          ? "Open signal-level evidence when someone asks why the posture changed."
          : "Jump straight to evidence and thresholds when you need to defend a decision quickly.",
      href: "/signals",
      cta: "Open signal evidence",
      emphasis: "secondary",
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/onboarding#webpage`,
        name: "Whether Report — Onboarding & glossary",
        url: `${siteUrl}/onboarding`,
        description:
          "Get oriented with the Whether Report: a quick guide to reading the signals and a plain-English glossary.",
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
        { name: "Onboarding & glossary", path: "/onboarding" },
      ]),
    ],
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
    ? "Use for retrospectives only; return to live data for real-time planning."
    : isFallback
      ? "Hold critical decisions until live signals return or you validate the cache."
      : "No signal instability detected. Safe for planning decisions.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

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
      pageTitle="Onboarding & glossary"
      currentPath="/onboarding"
      pageSummary="Learn the core questions Whether answers before diving into signal-level detail."
      pageSummaryLink={{
        href: "#onboarding-checklist",
        label: "View onboarding overview",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      showPageNavigation={false}
      primaryCta={{ href: "#first-time-guide", label: "Start orientation steps" }}
      secondaryCta={undefined}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/onboarding"
          />
        ) : null
      }
    >
      <section
        id="onboarding-checklist"
        aria-labelledby="onboarding-checklist-title"
        className="weather-panel space-y-4 px-6 py-5"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Overview
          </p>
          <h2 id="onboarding-checklist-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Start onboarding with three focused steps.
          </h2>
          <p className="text-sm text-slate-300">
            {activeExperience === "new"
              ? "~3 minutes to get a clear weekly action read."
              : "~90 seconds to refresh context and jump to evidence."}
          </p>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold tracking-[0.14em] text-slate-400">Experience mode</legend>
            <p id="experience-mode-help" className="text-xs text-slate-500">Choose the lens that matches your familiarity. The checklist text adapts instantly.</p>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-describedby="experience-mode-help">
              {[
                { key: "new", label: "I’m new" },
                { key: "returning", label: "I’m returning" },
              ].map((option) => {
                const isActive = option.key === activeExperience;
                return (
                  <a
                    key={option.key}
                    href={buildExperienceHref(option.key as "new" | "returning")}
                    role="radio"
                    aria-checked={isActive}
                    aria-current={isActive ? "page" : undefined}
                    className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
                      isActive
                        ? "border-sky-300/80 bg-sky-500/10 text-slate-100"
                        : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                    }`}
                  >
                    {option.label}
                  </a>
                );
              })}
            </div>
          </fieldset>
        </header>
        <OnboardingChecklistProgress steps={onboardingSteps} />
      </section>



      <FirstTimeGuidePanel
        statusLabel={statusLabel}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
      />

      <BeginnerGlossaryPanel />

      <section aria-labelledby="apply-concepts-title" className="weather-panel space-y-4 px-6 py-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Apply each concept
          </p>
          <h2 id="apply-concepts-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Jump from concepts to live report sections.
          </h2>
        </header>
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            {
              concept: "Cash availability (tightness)",
              href: "/signals#sensor-array",
              label: "Open live sensor feed",
            },
            {
              concept: "Market risk appetite",
              href: "/signals#thresholds",
              label: "Open threshold logic",
            },
            {
              concept: "Regime call and actions",
              href: "/operations/plan#ops-playbook",
              label: "Open action playbook",
            },
          ].map((item) => (
            <li
              key={item.concept}
              className="weather-surface flex flex-col gap-3 p-4"
            >
              <p className="text-sm font-semibold text-slate-100">
                {item.concept}
              </p>
              <a
                href={item.href}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <RelatedReportLinks
        title="Where to go after onboarding"
        links={[
          {
            href: "/signals",
            label: "Signal evidence",
            description:
              "Apply the glossary with live source data and threshold diagnostics.",
          },
          {
            href: "/operations",
            label: "Action playbook",
            description:
              "Turn the regime readout into concrete execution guidance.",
          },
          {
            href: "/methodology",
            label: "Methodology",
            description:
              "Explore the exact formula logic and original data providers.",
          },
        ]}
      />
    </ReportShell>
  );
}
