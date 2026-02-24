import type { Metadata } from "next";
import {
  resolveTimeMachineSelection,
  parseTimeMachineRequest,
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
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { RelatedReportLinks } from "./components/relatedReportLinks";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const homeSectionSequence = [
  { href: "#weekly-action-summary", label: "Weekly actions" },
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "#signal-matrix", label: "Signal breakdown" },
  { href: "#evidence-matrix", label: "Evidence matrix" },
] as const;

const workspaceQuickActions = [
  {
    href: "#weekly-action-summary",
    label: "Open weekly summary",
    ariaLabel: "Jump to weekly action summary section",
  },
  {
    href: "/operations/plan",
    label: "Open plan board",
    ariaLabel: "Open plan board workspace",
  },
  {
    href: "/signals",
    label: "Open evidence trail",
    ariaLabel: "Open evidence trail workspace",
  },
  {
    href: "/guides",
    label: "Open role guides",
    ariaLabel: "Open stakeholder and stage guides",
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

  const title = "Macro signals for product and engineering planning — Whether";
  const imageUrl = baseUrl.toString();
  const canonicalUrl = buildCanonicalUrl("/");
  const hasTimeMachineParams = Boolean(
    resolvedSearchParams?.month || resolvedSearchParams?.year,
  );

  return {
    title,
    description:
      "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description:
        "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Whether Report Weekly briefing Open Graph",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description:
        "Track Treasury yield curve regime shifts and turn macro signals into clear product, engineering, and operating priorities.",
      images: [imageUrl],
    },
    robots: hasTimeMachineParams
      ? {
          index: false,
          follow: true,
        }
      : undefined,

  };
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sectionLinks = homeSectionSequence.map((section) => ({
    href: section.href,
    label: section.label,
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: organizationName,
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: websiteName,
        url: siteUrl,
        description: defaultSiteDescription,
        inLanguage: "en",
        mainEntityOfPage: `${siteUrl}/`,
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
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${siteUrl}/`,
        },
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        about: {
          "@type": "Thing",
          name: "Treasury yield curve strategy planning",
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
    ? "Use for retrospectives only; avoid live planning calls until you return to current data."
    : isFallback
      ? "Pause irreversible decisions until the live feed returns or you confirm the cache."
      : "Safe to use for near-term planning; proceed with normal approval flow.";
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
      pageTitle="Weekly briefing"
      currentPath="/"
      pageSummary="Weekly regime pulse and recommended moves."
      primaryCta={{
        href: "#weekly-action-summary",
        label: "Review weekly actions",
      }}
      secondaryCta={{
        href: "#executive-snapshot",
        label: "Review leadership summary",
      }}
      sidebarVariant="hidden"
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
    >
      <section
        aria-labelledby="decision-card-title"
        className="weather-panel space-y-6 px-6 py-6"
      >
        <div className="space-y-3">
          <h1
            id="decision-card-title"
            className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl"
          >
            Treasury macro signals for product and engineering planning.
          </h1>
          <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
            Use live Treasury curve shifts to set weekly operating posture, prioritize roadmap risk,
            and align engineering execution with market conditions.
          </p>
        </div>
        <article className="weather-surface space-y-4 p-5" aria-label="Executive takeaways">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Executive takeaways
          </p>
          <ul className="grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
            <li className="rounded-xl border border-slate-700/55 bg-slate-900/45 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Current regime
              </p>
              <p className="mt-2 text-base font-semibold text-slate-100">{statusLabel}</p>
            </li>
            <li className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/85">
                Top risk this week
              </p>
              <p className="mt-2 text-base font-semibold text-amber-50">{trustStatusDetail}</p>
            </li>
            <li className="rounded-xl border border-sky-400/45 bg-sky-500/10 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/90">
                Recommended move
              </p>
              <p className="mt-2 text-base font-semibold text-sky-50">{trustStatusAction}</p>
            </li>
          </ul>
        </article>
        <article className="weather-surface space-y-4 p-5" aria-label="Decision summary">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            What changed
          </p>
          <p className="text-sm text-slate-200">{assessment.description}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            What to do now
          </p>
          <p className="text-sm text-slate-200">{trustStatusAction}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Confidence
          </p>
          <p className="text-sm text-slate-200">
            {trustStatusLabel} · {trustStatusDetail}
          </p>
        </article>
        <article className="weather-surface space-y-4 p-5" aria-labelledby="workspace-jump-title">
          <div className="space-y-1">
            <h2
              id="workspace-jump-title"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300"
            >
              Jump to workspace
            </h2>
            <p className="text-sm text-slate-200">Open the workflow you need in one tap.</p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Workspace quick actions">
            {workspaceQuickActions.map((action) => (
              <li key={action.href}>
                <a
                  href={action.href}
                  aria-label={action.ariaLabel}
                  className="weather-pill inline-flex min-h-[44px] items-center whitespace-nowrap px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {action.label}
                </a>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section
        id="weekly-action-summary"
        aria-label="Weekly action summary"
        className="space-y-8"
      >
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </section>

      <section id="executive-snapshot" aria-label="Leadership summary" className="space-y-8">
        <ExecutiveSnapshotPanel
          treasury={treasury}
          assessment={assessment}
          provenance={treasuryProvenance}
        />
      </section>

      <section id="signal-matrix" aria-label="Signal breakdown" className="space-y-8">
        <SignalMatrixPanel
          assessment={assessment}
          provenance={treasuryProvenance}
        />
      </section>

      <section
        id="evidence-matrix"
        aria-labelledby="evidence-matrix-title"
        className="weather-panel space-y-4 px-6 py-5"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Evidence matrix
          </p>
          <h2
            id="evidence-matrix-title"
            className="text-xl font-semibold text-slate-100 sm:text-2xl"
          >
            Deep evidence has moved to the dedicated Evidence page.
          </h2>
          <p className="text-sm text-slate-300">
            Keep the decide screen focused on action; use Evidence for full macro series,
            thresholds, and source-level methodology.
          </p>
        </header>
        <RelatedReportLinks
          title="Open Evidence"
          links={[
            {
              href: "/signals",
              label: "Evidence",
              description:
                "Inspect the full macro evidence matrix, historical series context, and source links.",
            },
            {
              href: "/solutions/product-roadmapping",
              label: "Product roadmapping",
              description:
                "Apply macro signals to product roadmap sequencing, pricing posture, and launch timing.",
            },
            {
              href: "/solutions/engineering-capacity",
              label: "Engineering capacity planning",
              description:
                "Use regime-aware signals to plan hiring, delivery risk, and reliability investments.",
            },
            {
              href: "/solutions/market-regime-playbook",
              label: "Market regime playbook",
              description:
                "Operational playbook for high, moderate, and low market-stress environments.",
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}
