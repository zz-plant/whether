import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import {
  decideHomeRecommendedToolkitSlugs,
  findToolkitDefinition,
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

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Tools — resolve one remaining edge case",
  description: "Primary routing surface for one unresolved question after Weekly Brief and Planning. Open direct answers, translations, or toolkits only after the question type is clear.",
  path: "/decide",
  imageAlt: "Whether decision tools",
  imagePath: "/social/decide.svg",
});

export default async function DecidePage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/decide" },
      ]),
    ),
  };
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
    { href: "#toolkit-library", label: "Toolkit library" },
  ];

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={`Confidence ${homeBriefModel.confidenceLabel}`}
      trustStatusDetail="Route one unresolved question into the smallest downstream help."
      trustStatusAction="Return to Weekly Brief or Planning once the question is resolved."
      trustStatusTone={snapshot.isFallback ? "warning" : "stable"}
      pageTitle="Decision Tools"
      currentPath="/decide"
      pageSummary="Route one remaining question into the smallest downstream help: direct answer, translation, or toolkit."
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
        description: "Return to Planning once this edge case is resolved",
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
            : "Open one direct answer, translation, or toolkit path only after the question type is clear.",
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
        description="Start here when Weekly Brief and Planning still leave one edge case open. This page should route you to the smallest help needed. Open Answers, Guides, or Toolkits only after the question type is already clear."
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
        description="Decision Tools can answer four different kinds of gaps. Pick the one that matches your missing literacy instead of browsing the whole library first."
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
        description="Take the recommended next path first. Open a downstream library only when you already know you need a direct answer, a translation, or a runnable instrument."
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
            <p className="text-sm text-slate-200">Use this when the question is already crisp and you want one yes / no answer you can share immediately.</p>
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
            <p className="text-sm text-slate-200">Use this when the weekly call is clear but one owner or stage still needs a tailored version.</p>
            <div className="grid gap-2">
              {recommendedStakeholderGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={{ pathname: "/guides", query: { stakeholder: guide.slug } }}
                  className="weather-hub-link-card space-y-1"
                >
                  <p className="text-sm font-semibold text-slate-100">{guide.title}</p>
                  <p className="text-xs text-slate-300">{guide.tagline}</p>
                </Link>
              ))}
              {recommendedStageGuides.map((stage) => (
                <Link
                  key={stage.slug}
                  href={{ pathname: "/guides", query: { stage: stage.slug } }}
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
      </HubSection>

      <details className="weather-panel scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open downstream libraries only if routing still is not clear
        </summary>
        <div className="mt-4 space-y-6">
          <p className="text-sm text-slate-300">
            These are downstream libraries, not parallel starting points. Use them only after the route above tells you the question needs an instrument, an exact answer, or a team-specific translation.
          </p>
          <section id="toolkit-library" className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Toolkit library</h2>
            <div className="weather-page-grid-3">
              {decideHomeRecommendedToolkitSlugs.map((toolkitSlug) => {
                const toolkit = findToolkitDefinition(toolkitSlug);
                if (!toolkit) return null;

                return (
                  <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-link-card space-y-2 text-sm text-slate-100">
                    <span className="weather-hub-chip w-fit">Toolkit</span>
                    <p className="font-semibold">{toolkit.title}</p>
                    <p className="text-xs text-slate-300">Run this now: {toolkit.decisionThisSession}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Answer library</h2>
            <div className="weather-page-grid-2">
              {featuredAnswerPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/answers/${page.slug}` as Route}
                  className="weather-hub-link-card space-y-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Direct answer</p>
                  <h2 className="text-lg font-semibold text-slate-100">{page.title}</h2>
                  <p className="text-sm text-slate-300">{page.shortAnswer}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Translation library by team</h2>
            <div className="weather-page-grid-3">
              {useCaseRoles.map((role) => (
                <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-link-card text-sm font-semibold text-slate-100">{role.title}</Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Translation library by situation</h2>
            <div className="weather-page-grid-2">
              {situationUseCaseDefinitions.map((situation) => (
                <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-hub-link-card text-sm text-slate-100">{situation.title}</Link>
              ))}
            </div>
          </section>
        </div>
      </details>
    </ReportShell>
  );
}
