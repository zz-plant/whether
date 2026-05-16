import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import {
  situationUseCaseDefinitions,
  useCaseRoles,
} from "../../lib/decisionDomainCatalog";
import { HubSection } from "../components/hubPageShell";
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
  title: "Get help with one decision",
  description: "Pick the right next help for one open question without needing the full site map.",
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
        detail: "Go straight to the path that fits the question.",
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
      trustStatusDetail="Pick the narrowest path that answers the question."
      trustStatusAction="Return to Planning after the question is answered."
      trustStatusTone={snapshot.isFallback ? "warning" : "stable"}
      pageTitle="Choose the right help"
      currentPath="/resolve"
      pageSummary="Resolve one open question without reopening the whole weekly brief."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Start with the best next step ↓" }}
      sectionLinks={sectionLinks.slice(0, 2)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#unresolved-question-router", label: "Start with the recommended path" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/planning",
        description: "Return to Planning next",
      }}
      decisionBanner={{
        label: "Choose the right help",
        decision: "Close one remaining question, then return to planning.",
        horizon: "This week",
        confidence: homeBriefModel.confidenceLabel,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#unresolved-question-router",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use this page to close the last open question.",
        doNow: [
          liveCall.action,
          shouldStartWithChecker
            ? "Run one decision check before opening broader help."
            : "Open the path that matches the question.",
        ],
        flipConditions: [liveCall.guardrail, liveCall.flip],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
      >
        <OperatorWorkflowRouteTracker />
      <HubSection
        id="unresolved-question-router"
        title="What still needs help?"
        description="Start with the best next step."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="weather-hub-card space-y-4 border-sky-400/30 bg-sky-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{recommendedPath.kicker}</p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-100">{recommendedPath.title}</p>
              <p className="text-sm text-slate-200">{recommendedPath.detail}</p>
            </div>
            <Link href={recommendedPath.href} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              {recommendedPath.cta}
            </Link>
          </article>

          <details
            className="weather-hub-card weather-auto-chevron scroll-mt-28 px-4 py-4"
            open={hasGuidedTranslationSelection}
          >
            <summary className="cursor-pointer list-none">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">If the first path does not fit</p>
                <p className="text-sm text-slate-200">If the recommended next step doesn&apos;t fit.</p>
              </div>
            </summary>
            <div className="mt-4 space-y-4">
              <div id="direct-answers" className="rounded-md border border-slate-700/70 bg-slate-950/50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Single answer</p>
                <p className="mt-2 text-sm text-slate-200">For a yes-or-no question.</p>
                <div className="mt-3 space-y-2">
                  {recommendedAnswerPages.map((page) => (
                    <Link key={page.slug} href={`/answers/${page.slug}` as Route} className="weather-hub-link-card block space-y-1">
                      <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                      <p className="text-xs text-slate-300">{page.shortAnswer}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <details
                id="guided-translation"
                className="rounded-md border border-slate-700/70 bg-slate-950/50 px-4 py-4"
                open={hasGuidedTranslationSelection}
              >
                <summary className="cursor-pointer list-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Need this tailored to a role or company stage?</p>
                  <p className="mt-2 text-sm text-slate-200">For role-specific or company-stage views.</p>
                </summary>
                <div className="mt-4 grid gap-2">
                  {recommendedStakeholderGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: resolvedSearchParams?.stage })}
                      className="weather-hub-link-card space-y-1"
                    >
                      <p className="text-sm font-semibold text-slate-100">{guide.title}</p>
                      <p className="text-xs text-slate-300">{guide.tagline}</p>
                    </Link>
                  ))}
                  {recommendedStageGuides.map((stage) => (
                    <Link
                      key={stage.slug}
                      href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: resolvedSearchParams?.stakeholder })}
                      className="weather-hub-link-card space-y-1"
                    >
                      <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                      <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </details>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </HubSection>

      <details id="decide-secondary-paths" className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Browse more options
        </summary>
        <div className="mt-4 space-y-6">
          <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More team help</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/resolve/${role.slug}`} className="weather-hub-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More situation help</h2>
              <div className="flex flex-wrap gap-2">
                {situationUseCaseDefinitions.map((situation) => (
                  <Link key={situation.slug} href={`/resolve/${situation.slug}`} className="weather-hub-chip">
                    {situation.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </details>
    </ReportShell>
  );
}
