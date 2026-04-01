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
import { LiteracyAssistRouter } from "../components/literacyAssistControls";
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
  title: "Decision Tools — translate one open question",
  description: "Translate one open question into the smallest useful help.",
  path: "/decide",
  imageAlt: "Whether decision tools",
  imagePath: "/social/decide.svg",
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
        { path: "/decide" },
      ]),
    ),
  };
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/decide" });
  const { homeBriefModel } = snapshot;
  const recommendedSituation = homeBriefModel.weeklyMovement.direction === "defensive"
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
        href: "/decide/ship-checklist" as Route,
        kicker: "Recommended next path",
        title: "Start with one go / wait / kill check",
        detail: "This week has enough movement that you should pressure-test one concrete decision before widening into broader role translation.",
        cta: "Open ship checklist",
      }
    : {
        href: `/decide/${recommendedSituation.slug}` as Route,
        kicker: "Recommended next path",
        title: `Start with ${recommendedSituation.title}`,
        detail: "The weekly call is clear enough to translate directly into one focused decision path instead of browsing the whole library first.",
        cta: "Open recommended path",
      };
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const recommendedAnswerPages = featuredAnswerPages.slice(0, 2);
  const recommendedStakeholderGuides = featuredStakeholders.slice(0, 2);
  const recommendedStageGuides = stageGuides.slice(0, 2);
  const sectionLinks = [
    { href: "#unresolved-question-router", label: "Question router" },
    { href: "#direct-answers", label: "Direct answers" },
    { href: "#guided-translation", label: "Translations" },
    { href: "#toolkit-library", label: "Toolkit shortlist" },
  ];

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={`Confidence ${homeBriefModel.confidenceLabel}`}
      trustStatusDetail="Translate one open question."
      trustStatusAction="Return to Planning when it is resolved."
      trustStatusTone={snapshot.isFallback ? "warning" : "stable"}
      pageTitle="Translation"
      currentPath="/decide"
      pageSummary="Translate one remaining question into the right help."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Find the help ↓" }}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      primaryCta={{ href: "#unresolved-question-router", label: "Find the right help" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operations",
        description: "Return to Planning next",
      }}
      decisionBanner={{
        label: "Translation",
        decision: "Resolve one remaining question without reopening the weekly brief.",
        horizon: "This week",
        confidence: homeBriefModel.confidenceLabel,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#unresolved-question-router",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use Translation to close the last open question.",
        doNow: [
          liveCall.action,
          shouldStartWithChecker
            ? "Run one go / wait / kill check before opening broader help."
            : "Open the help that matches the question.",
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
        description="Take the recommended path first."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_repeat(2,minmax(0,0.9fr))]">
          <article className="weather-hub-card space-y-4 border-sky-400/30 bg-sky-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{recommendedPath.kicker}</p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-100">{recommendedPath.title}</p>
              <p className="text-sm text-slate-200">{recommendedPath.detail}</p>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
              <p><span className="font-semibold text-slate-100">Current call:</span> {liveCall.posture}</p>
              <p className="mt-2"><span className="font-semibold text-slate-100">Action now:</span> {liveCall.action}</p>
              <p className="mt-2"><span className="font-semibold text-slate-100">Pause if:</span> {liveCall.guardrail}</p>
              <p className="mt-2"><span className="font-semibold text-slate-100">Change course if:</span> {liveCall.flip}</p>
            </div>
            <Link href={recommendedPath.href} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              {recommendedPath.cta}
            </Link>
          </article>

          <article id="direct-answers" className="weather-hub-card scroll-mt-28 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Direct answer</p>
            <p className="text-sm text-slate-200">For a yes / no question.</p>
            <div className="space-y-2">
              {recommendedAnswerPages.map((page) => (
                <Link key={page.slug} href={`/answers/${page.slug}` as Route} className="weather-hub-link-card block space-y-1">
                  <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                  <p className="text-xs text-slate-300">{page.shortAnswer}</p>
                </Link>
              ))}
            </div>
            <Link href="/decide#direct-answers" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open direct answers
            </Link>
          </article>

          <article id="guided-translation" className="weather-hub-card scroll-mt-28 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Role translation</p>
            <p className="text-sm text-slate-200">For one role or stage.</p>
            <div className="grid gap-2">
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
            <Link href="/decide#guided-translation" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open role translations
            </Link>
          </article>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </HubSection>

      <section className="weather-panel space-y-4 px-6 py-6" aria-labelledby="translation-support-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current weekly call</p>
          <h2 id="translation-support-title" className="text-lg font-semibold text-slate-100">Keep the translation anchored to the live brief</h2>
          <p className="text-sm text-slate-300">The recommended path above already carries the live action, guardrail, and flip line. Use the router below only if you need a different kind of help.</p>
        </div>
        <div className="grid gap-3">
          <LiteracyAssistRouter
            title="What still needs translation?"
            description="Pick the help that fits."
            targets={{
              decision: { href: shouldStartWithChecker ? "/decide?assist=decision#unresolved-question-router" : `${recommendedPath.href}?assist=decision` },
              evidence: { href: "/signals?assist=evidence&signalsView=detail#decision-summary" },
              trust: { href: "/method?assist=trust" },
              share: { href: "/operations?assist=share#ops-export-briefs" },
            }}
          />
        </div>
      </section>

      <details className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          More help
        </summary>
        <div className="mt-4 space-y-6">
          <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More role help</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More situation help</h2>
              <div className="flex flex-wrap gap-2">
                {situationUseCaseDefinitions.map((situation) => (
                  <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-hub-chip">
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
