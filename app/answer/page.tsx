import type { Metadata } from "next";
import { Details } from "../components/details";
import { ReportSection } from "../components/reportSection";
import { ButtonLink } from "../components/ui/buttonLink";
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
  path: "/answer",
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
        { path: "/answer" },
      ]),
    ),
  };
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/answer" });
  const { homeBriefModel } = snapshot;
  const recommendedSituation = homeBriefModel.weeklyMovement.direction === "tightening"
    ? (situationUseCaseDefinitions.find((entry) => entry.slug === "avoid-premature-scaling") ?? situationUseCaseDefinitions[0])
    : (situationUseCaseDefinitions.find((entry) => entry.slug === "roadmap-focus") ?? situationUseCaseDefinitions[0]);
  const shouldStartWithChecker = homeBriefModel.revisitDecisions;
  const liveCall = {
    posture: homeBriefModel.postureWithStageLabel,
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };
  const recommendedPath = shouldStartWithChecker
    ? {
        href: "/answer/ship-checklist",
        kicker: "Best next step",
        title: "Start with one decision check",
        detail: "This week moved enough to check one decision before opening broader guidance.",
        cta: "Open decision check",
      }
    : {
        href: `/answer/${recommendedSituation.slug}`,
        kicker: "Best next step",
        title: `Start with ${recommendedSituation.title}`,
        detail: "Go straight to the decision that fits.",
        cta: "Open focused path",
      };
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const recommendedAnswerPages = featuredAnswerPages.slice(0, 2);
  const recommendedStakeholderGuides = featuredStakeholders.slice(0, 2);
  const recommendedStageGuides = stageGuides.slice(0, 2);
  const sectionLinks = [
    { href: "#unresolved-question-router", label: "Best next step" },
    { href: "#decide-secondary-paths", label: "More options" },
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
      currentPath="/answer"
      pageSummary="Answer one decision without re-reading the whole brief."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Start with the best next step ↓" }}
      sectionLinks={sectionLinks.slice(0, 2)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#unresolved-question-router", label: "Open the recommended decision" }}
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
        evidenceHref: "#unresolved-question-router",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Work one decision at a time.",
        doNow: [
          liveCall.action,
          shouldStartWithChecker
            ? "Run one decision check before opening broader help."
            : "Open the decision that matches the situation.",
        ],
        flipConditions: [liveCall.guardrail, liveCall.flip],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
      >
        <OperatorWorkflowRouteTracker />
      <ReportSection
        id="unresolved-question-router"
        title="Which decision is still open?"
        description="Start with the recommended next step."
      >
        {/* Stacked, not side by side. The recommended path is three lines and a
            button; the starting-points list is six links in two groups. Racing
            them as columns gave the least content the widest track and stretched
            the short card to the tall one's height. The recommendation now runs
            full width as a banner — copy left, action right — and the
            alternatives sit below it as a pair. */}
        <div className="space-y-4">
          <article className="weather-surface flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="type-eyebrow text-sky-200">{recommendedPath.kicker}</p>
              <h3 className="text-lg font-semibold text-slate-100">{recommendedPath.title}</h3>
              <p className="text-sm text-slate-200">{recommendedPath.detail}</p>
            </div>
            <ButtonLink href={recommendedPath.href} variant="primary" className="lg:shrink-0">
              {recommendedPath.cta}
            </ButtonLink>
          </article>

          {/* Two menus, not two panels of cards. The alternatives are six links;
              boxing each in a surface inside a surface inside the section made a
              link list read as a dashboard with nothing on it. A divided list
              with a chevron is what a menu looks like. */}
          <div className="scroll-mt-28 space-y-3">
            <div className="space-y-1">
              <p className="type-eyebrow">Other starting points</p>
              <p className="text-sm text-slate-300">If the recommended step isn&apos;t the decision you need.</p>
            </div>
            <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
              <nav id="direct-answers" aria-labelledby="direct-answers-title">
                <p id="direct-answers-title" className="type-eyebrow text-amber-200">Direct answers</p>
                <ul className="mt-1 divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
                  {recommendedAnswerPages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={answerPageHref(page.slug)}
                        className="flex min-h-[44px] items-center justify-between gap-3 py-2.5 no-underline hover:bg-slate-900/40"
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
              </nav>
              <nav id="guided-translation" aria-labelledby="guided-translation-title">
                <p id="guided-translation-title" className="type-eyebrow text-violet-200">By role or stage</p>
                <ul className="mt-1 divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
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
            </div>
          </div>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </ReportSection>

      <Details id="decide-secondary-paths" className="weather-panel px-6 py-6"
        summary={<span className="text-sm type-eyebrow text-sky-200">Browse more options</span>}
      >
          <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm type-eyebrow text-slate-300">Help by role</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/answer/${role.slug}`} className="weather-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm type-eyebrow text-slate-300">Help by situation</h2>
              <div className="flex flex-wrap gap-2">
                {situationUseCaseDefinitions.map((situation) => (
                  <Link key={situation.slug} href={`/answer/${situation.slug}`} className="weather-chip">
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
