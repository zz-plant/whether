import type { Metadata } from "next";
import { Details } from "../components/details";
import { ButtonLink } from "../components/ui/buttonLink";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
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
        href: "/resolve/ship-checklist" as Route,
        kicker: "Best next step",
        title: "Start with one decision check",
        detail: "This week moved enough to check one decision before opening broader guidance.",
        cta: "Open decision check",
      }
    : {
        href: `/resolve/${recommendedSituation.slug}` as Route,
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
  const hasGuidedTranslationSelection = Boolean(
    resolvedSearchParams?.stakeholder || resolvedSearchParams?.stage,
  );
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
      pageTitle="Resolve"
      currentPath="/resolve"
      pageSummary="Answer one decision without re-reading the whole brief."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Start with the best next step ↓" }}
      sectionLinks={sectionLinks.slice(0, 2)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#unresolved-question-router", label: "Open the recommended decision" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/planning",
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
      <section id="unresolved-question-router" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Which decision is still open?</p>
        <p className="text-sm text-slate-300">Start with the recommended next step.</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="weather-surface space-y-4 px-4 py-4">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{recommendedPath.kicker}</p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-100">{recommendedPath.title}</p>
              <p className="text-sm text-slate-200">{recommendedPath.detail}</p>
            </div>
            <ButtonLink href={recommendedPath.href} variant="primary">
              {recommendedPath.cta}
            </ButtonLink>
          </article>

          <div className="weather-surface scroll-mt-28 px-4 py-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Alternative paths</p>
              <p className="text-sm text-slate-300">If the recommended step isn&apos;t the decision you need.</p>
            </div>
            <div className="space-y-4">
              <div id="direct-answers" className="rounded-md border border-slate-700/70 bg-slate-950/50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Single answer</p>
                <p className="mt-1 text-fluid-xs text-slate-300">A direct yes-or-no decision.</p>
                <div className="mt-3 space-y-2">
                  {recommendedAnswerPages.map((page) => (
                    <Link key={page.slug} href={`/answers/${page.slug}` as Route} className="weather-surface block space-y-1">
                      <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                      <p className="text-xs text-slate-300">{page.shortAnswer}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <div
                id="guided-translation"
                className="rounded-md border border-slate-700/70 bg-slate-950/50 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Need this tailored to a role or company stage?</p>
                <p className="mt-1 text-fluid-xs text-slate-300">For a role or company-stage lens.</p>
                <div className="mt-3 grid gap-2">
                  {recommendedStakeholderGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: resolvedSearchParams?.stage })}
                      className="weather-surface space-y-1"
                    >
                      <p className="text-sm font-semibold text-slate-100">{guide.title}</p>
                      <p className="text-xs text-slate-300">{guide.tagline}</p>
                    </Link>
                  ))}
                  {recommendedStageGuides.map((stage) => (
                    <Link
                      key={stage.slug}
                      href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: resolvedSearchParams?.stakeholder })}
                      className="weather-surface space-y-1"
                    >
                      <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                      <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </section>

      <Details id="decide-secondary-paths" variant="auto-chevron" className="weather-panel px-6 py-6"
        summary={<span className="text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">Browse more options</span>}
      >
          <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More team help</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/resolve/${role.slug}`} className="weather-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More situation help</h2>
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
