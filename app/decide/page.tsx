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
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubHero, HubSection } from "../components/hubPageShell";
import { LiteracyAssistRouter } from "../components/literacyAssistControls";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { featuredAnswerPages } from "../answers/selectors";
import { stakeholderGuides } from "../guides/stakeholderGuides";
import { stageGuides } from "../guides/stageGuides";
import { ReportShell } from "../components/reportShell";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { buildGuidedTranslationHref, GuidedTranslationPanels, type GuidedTranslationSearchParams } from "./components/guidedTranslationPanels";
import { ToolkitLibraryPanels } from "./components/toolkitLibraryPanels";

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Tools — resolve one remaining edge case",
  description: "Route one remaining question into the right answer, translation, or toolkit.",
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
      trustStatusDetail="Resolve one remaining question."
      trustStatusAction="Return to Planning once it is resolved."
      trustStatusTone={snapshot.isFallback ? "warning" : "stable"}
      pageTitle="Decision Tools"
      currentPath="/decide"
      pageSummary="Route one remaining question into the right answer, translation, or toolkit."
      pageSummaryLink={{ href: "#unresolved-question-router", label: "Route the question ↓" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      showPageNavigation={true}
      primaryCta={{ href: "#unresolved-question-router", label: "Route my question" }}
      secondaryCta={{ href: "/operations", label: "Return to Planning" }}
      nextStep={{
        href: "/operations",
        description: "Return to Planning next",
      }}
      decisionBanner={{
        label: "Start here",
        decision: "Resolve one remaining team-specific or situation-specific question without reopening the weekly brief.",
        horizon: "This week",
        confidence: homeBriefModel.confidenceLabel,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#unresolved-question-router",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Use Decision Tools to close the one question the weekly brief and plan do not settle.",
        doNow: [
          liveCall.action,
          shouldStartWithChecker
            ? "Run one go / wait / kill check before opening broader libraries."
            : "Open the path that matches the question.",
        ],
        flipConditions: [liveCall.guardrail, liveCall.flip],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
    >
      <OperatorWorkflowRouteTracker />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decision Tools" }]} />
      <HubHero
        eyebrow="Resolve the one question still blocking action"
        title="Route the last open question before you open another library."
        description="Use this page only for the last open question after Weekly Brief and Planning."
        actions={(
          <>
            <Link href="#unresolved-question-router" className="weather-button inline-flex items-center justify-center">Route my question</Link>
            <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Weekly Brief</Link>
          </>
        )}
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Current weekly call</p>
            <p className="text-sm font-semibold text-slate-100">{liveCall.posture}</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="font-semibold text-slate-100">Action now:</span> {liveCall.action}</li>
              <li><span className="font-semibold text-slate-100">Pause if:</span> {liveCall.guardrail}</li>
              <li><span className="font-semibold text-slate-100">Change course if:</span> {liveCall.flip}</li>
            </ul>
          </div>
        )}
      />

      <LiteracyAssistRouter
        title="What do you need translated before you commit?"
        description="Pick the gap that still needs translation."
        targets={{
          decision: { href: shouldStartWithChecker ? "/decide?assist=decision#unresolved-question-router" : `${recommendedPath.href}?assist=decision` },
          evidence: { href: "/signals?assist=evidence&signalsView=detail#decision-summary" },
          trust: { href: "/method?assist=trust" },
          share: { href: "/operations?assist=share#ops-export-briefs" },
        }}
      />

      <HubSection
        id="unresolved-question-router"
        title="What remains unresolved?"
        description="Take the recommended next path first."
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Alternative: direct answer</p>
            <p className="text-sm text-slate-200">For a crisp yes / no question.</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Alternative: team translation</p>
            <p className="text-sm text-slate-200">For one owner- or stage-specific version of the call.</p>
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

      <details className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          More paths
        </summary>
        <div className="mt-4 space-y-6">
          <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More role paths</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">More situation paths</h2>
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
