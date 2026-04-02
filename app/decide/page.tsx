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
    { href: "#unresolved-question-router", label: "Recommended path" },
    { href: "#translation-support", label: "Fallback router" },
    { href: "#decide-secondary-paths", label: "Browse library" },
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
      pageTitle="Resolve one question"
      currentPath="/decide"
      pageSummary="Take the smallest useful path for the one question that is still open."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Start with the recommended path ↓" }}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      primaryCta={{ href: "#unresolved-question-router", label: "Start with the recommended path" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operations",
        description: "Return to Planning next",
      }}
      decisionBanner={{
        label: "Resolve one question",
        decision: "Resolve one remaining question without reopening the weekly brief.",
        horizon: "This week",
        confidence: homeBriefModel.confidenceLabel,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#unresolved-question-router",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use this route to close the last open question.",
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="weather-hub-card space-y-4 border-sky-400/30 bg-sky-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{recommendedPath.kicker}</p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-100">{recommendedPath.title}</p>
              <p className="text-sm text-slate-200">{recommendedPath.detail}</p>
            </div>
            <p className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
              {shouldStartWithChecker
                ? "Start with the concrete go / wait / kill check instead of reopening the weekly brief."
                : "Use the recommended path to translate the live call into one role- or situation-specific decision."}
            </p>
            <Link href={recommendedPath.href} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              {recommendedPath.cta}
            </Link>
          </article>

          <article className="weather-hub-card scroll-mt-28 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Alternative paths</p>
              <p className="text-sm text-slate-200">Use one of these only if the recommended path above does not fit the question.</p>
            </div>
            <div id="direct-answers" className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Direct answer</p>
              <p className="mt-2 text-sm text-slate-200">For a yes / no question with a short answer.</p>
              <div className="mt-3 space-y-2">
                {recommendedAnswerPages.map((page) => (
                  <Link key={page.slug} href={`/answers/${page.slug}` as Route} className="weather-hub-link-card block space-y-1">
                    <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                    <p className="text-xs text-slate-300">{page.shortAnswer}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div id="guided-translation" className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Role or stage translation</p>
              <p className="mt-2 text-sm text-slate-200">For one role, one stage, or one team-specific interpretation.</p>
              <div className="mt-3 grid gap-2">
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
            </div>
          </article>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </HubSection>

      <section id="translation-support" className="weather-panel space-y-4 px-6 py-6" aria-labelledby="translation-support-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fallback router</p>
          <h2 id="translation-support-title" className="text-lg font-semibold text-slate-100">Need a different kind of help?</h2>
          <p className="text-sm text-slate-300">Use this only if the recommended path above does not close the question.</p>
        </div>
        <div className="grid gap-3">
          <LiteracyAssistRouter
            title="Pick the smallest useful fallback"
            description="Choose the help that matches the unresolved question."
            targets={{
              decision: { href: shouldStartWithChecker ? "/decide?assist=decision#unresolved-question-router" : `${recommendedPath.href}?assist=decision` },
              evidence: { href: "/signals?assist=evidence&signalsView=detail#decision-summary" },
              trust: { href: "/method?assist=trust" },
              share: { href: "/operations?assist=share#ops-export-briefs" },
            }}
          />
        </div>
      </section>

      <details id="decide-secondary-paths" className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Browse full library
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
