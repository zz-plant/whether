import type { Metadata } from "next";
import { Details } from "../components/details";
import { ReportSection } from "../components/reportSection";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import {
  situationUseCaseDefinitions,
  useCaseRoles,
} from "../../lib/decisionDomainCatalog";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { featuredAnswerPages } from "../answers/selectors";
import { stakeholderGuides } from "../guides/stakeholderGuides";
import { stageGuides } from "../guides/stageGuides";
import { ReportShell } from "../components/reportShell";
import { buildGuidedTranslationHref, GuidedTranslationPanels, type GuidedTranslationSearchParams } from "./components/guidedTranslationPanels";
import { ToolkitLibraryPanels } from "./components/toolkitLibraryPanels";

/** Typed route for a direct-answer page; the dynamic segment is `[slug]`. */
const answerPageHref = (slug: string): Route => `/answers/${slug}`;

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Resolve a Decision — By Role, Situation, or Toolkit",
  description: "One focused path per open decision: route by role, company stage, single answer, or a reusable toolkit.",
  path: "/resolve",
  imageAlt: "Whether decision tools",
  imagePath: "/social/resolve.svg",
});

export default async function DecidePage({
  searchParams,
}: {
  searchParams?: Promise<GuidedTranslationSearchParams & { toolkitQuery?: string }>;
}) {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/resolve" },
      ]),
    ),
  };
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/resolve" });
  const { homeBriefModel } = snapshot;
  const liveCall = {
    posture: homeBriefModel.postureWithStageLabel,
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const recommendedStakeholderGuides = featuredStakeholders.slice(0, 2);
  const recommendedStageGuides = stageGuides.slice(0, 2);
  const sectionLinks = [
    { href: "#direct-answers", label: "Direct answers" },
    { href: "#decide-secondary-paths", label: "Browse the library" },
  ];

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={`Confidence ${homeBriefModel.confidenceLabel}`}
      trustStatusDetail="One decision, closed with a bounded rule."
      trustStatusAction="Return to Planning after the decision is closed."
      trustStatusTone={snapshot.isFallback ? "warning" : "stable"}
      pageTitle="Resolve one open decision"
      currentPath="/resolve"
      pageSummary="One yes-or-no answer per open decision, under this week's call."
      pageSummaryLink={{ href: "#direct-answers", label: "Read the answers ↓" }}
      sectionLinks={sectionLinks.slice(0, 2)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#direct-answers", label: "Direct answers" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operate",
        description: "Return to Planning next",
      }}
      decisionBanner={{
        label: "Help options",
        decision: "Close the last open decision, then return to planning.",
        horizon: "This week",
        confidence: homeBriefModel.confidenceLabel,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#direct-answers",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Work one decision at a time.",
        doNow: [
          liveCall.action,
          "Find your question below; each answer links to the rule behind it.",
        ],
        flipConditions: [liveCall.guardrail, liveCall.flip],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
      >
        <OperatorWorkflowRouteTracker />
      {/* The page is the answers. The old router asked "which decision is still
          open?" and offered a recommended path, two answers, two roles, two
          stages, a toolkit filter and a library — a taxonomy to navigate before
          anything was answered. Most readers arrive with "should I hire?". */}
      <ReportSection
        id="direct-answers"
        title="Direct answers"
        description={`Under this week's call: ${liveCall.action}`}
      >
        <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
          {featuredAnswerPages.map((page) => (
            <li key={page.slug}>
              <Link
                href={answerPageHref(page.slug)}
                className="flex min-h-[44px] items-center justify-between gap-3 py-3 no-underline hover:bg-slate-900/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-100">{page.title}</span>
                  <span className="block text-xs text-slate-400">{page.shortAnswer}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-slate-500">›</span>
              </Link>
            </li>
          ))}
        </ul>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </ReportSection>

      <Details id="decide-secondary-paths" className="weather-panel px-6 py-6"
        summary={<span className="text-sm type-eyebrow text-sky-200">Browse the library — by role, stage, situation, or toolkit</span>}
      >
          <section className="grid gap-4 lg:grid-cols-2">
            <nav id="guided-translation" aria-labelledby="guided-translation-title" className="space-y-3">
              <h2 id="guided-translation-title" className="text-sm type-eyebrow text-slate-300">By role or stage</h2>
              <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
                {recommendedStakeholderGuides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: resolvedSearchParams?.stage })}
                      className="flex min-h-[44px] items-center justify-between gap-3 py-2.5 no-underline hover:bg-slate-900/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-100">{guide.title}</span>
                        <span className="block text-xs text-slate-400">{guide.tagline}</span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-slate-500">›</span>
                    </Link>
                  </li>
                ))}
                {recommendedStageGuides.map((stage) => (
                  <li key={stage.slug}>
                    <Link
                      href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: resolvedSearchParams?.stakeholder })}
                      className="flex min-h-[44px] items-center justify-between gap-3 py-2.5 no-underline hover:bg-slate-900/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-100">{stage.title}</span>
                        <span className="block text-xs text-slate-400">{stage.primaryValue}</span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-slate-500">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm type-eyebrow text-slate-300">Help by role</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/resolve/${role.slug}`} className="weather-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm type-eyebrow text-slate-300">Help by situation</h2>
              <div className="flex flex-wrap gap-2">
                {situationUseCaseDefinitions.map((situation) => (
                  <Link key={situation.slug} href={`/resolve/${situation.slug}`} className="weather-chip">
                    {situation.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
      </Details>
    </ReportShell>
  );
}
