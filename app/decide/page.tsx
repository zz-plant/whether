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
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { featuredAnswerPages } from "../answers/selectors";
import { stakeholderGuides } from "../guides/stakeholderGuides";
import { stageGuides } from "../guides/stageGuides";

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Tools — resolve one remaining edge case",
  description: "Resolve one owner-specific or situation-specific decision only after Weekly Brief and Planning leave a bounded question open.",
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
  const liveCall = {
    posture: homeBriefModel.postureWithStageLabel,
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const recommendedAnswerPages = featuredAnswerPages.slice(0, 2);
  const recommendedStakeholderGuides = featuredStakeholders.slice(0, 2);
  const recommendedStageGuides = stageGuides.slice(0, 2);

  return (
    <HubPageShell width="standard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decision Tools" }]} />
      <HubHero
        eyebrow="Resolve the one question still blocking action"
        title="Find the smallest decision aid that closes this week's remaining gap."
        description="Use this page to get one direct answer, one bounded checker, or one role-specific translation tied to the live weekly call. If that closes the gap, stop here and execute."
        actions={(
          <>
            <Link href="#unresolved-question-router" className="weather-button inline-flex items-center justify-center">Find my next path</Link>
            <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Weekly Brief</Link>
          </>
        )}
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Current weekly call</p>
            <p className="text-sm font-semibold text-slate-100">{liveCall.posture}</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="font-semibold text-slate-100">Do now:</span> {liveCall.action}</li>
              <li><span className="font-semibold text-slate-100">Guardrail:</span> {liveCall.guardrail}</li>
              <li><span className="font-semibold text-slate-100">Flip when:</span> {liveCall.flip}</li>
            </ul>
          </div>
        )}
      />

      <HubSection
        id="unresolved-question-router"
        title="What remains unresolved?"
        description="Choose the plain-language job that still blocks action. This page should route you to one next move, not make you browse the whole library."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <article id="direct-answers" className="weather-hub-card scroll-mt-28 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">I need a yes/no call</p>
            <p className="text-sm text-slate-200">Start here when the question is already crisp and you want one direct answer you can share immediately.</p>
            <div className="space-y-2">
              {recommendedAnswerPages.map((page) => (
                <Link key={page.slug} href={`/answers/${page.slug}` as Route} className="weather-hub-link-card block space-y-1">
                  <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                  <p className="text-xs text-slate-300">{page.shortAnswer}</p>
                </Link>
              ))}
            </div>
            <Link href="/answers" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open direct answers
            </Link>
          </article>
          <article className="weather-hub-card space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">I need a checker before committing</p>
            <p className="text-sm text-slate-200">Use a bounded utility when you know the move but still need a go / wait / kill check before you commit.</p>
            <div className="grid gap-2">
              <Link href="/decide/ship-checklist" className="weather-hub-link-card space-y-1">
                <p className="text-sm font-semibold text-slate-100">Whether to ship checklist</p>
                <p className="text-xs text-slate-300">Get a go / wait / kill recommendation tied to the current regime.</p>
              </Link>
              <Link href="/decide/team-context" className="weather-hub-link-card space-y-1">
                <p className="text-sm font-semibold text-slate-100">Team context profile</p>
                <p className="text-xs text-slate-300">Adjust the weekly call for your company profile without reopening the whole brief.</p>
              </Link>
            </div>
            <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Start with a checker
            </Link>
          </article>
          <article id="guided-translation" className="weather-hub-card scroll-mt-28 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">I need this translated for one team</p>
            <p className="text-sm text-slate-200">Use this when the weekly call is clear but one owner, function, or company stage still needs a tailored operating frame.</p>
            <div className="grid gap-2">
              {recommendedStakeholderGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}` as Route}
                  className="weather-hub-link-card space-y-1"
                >
                  <p className="text-sm font-semibold text-slate-100">{guide.title}</p>
                  <p className="text-xs text-slate-300">{guide.tagline}</p>
                </Link>
              ))}
              {recommendedStageGuides.map((stage) => (
                <Link
                  key={stage.slug}
                  href={`/guides/stage/${stage.slug}` as Route}
                  className="weather-hub-link-card space-y-1"
                >
                  <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                  <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                </Link>
              ))}
            </div>
            <Link href="/guides" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open role translations
            </Link>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="current-call"
        title="Current weekly call"
        description="Keep the live brief visible while you choose a single next path."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-3">
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Posture</p>
            <p className="text-sm font-semibold text-slate-100">{liveCall.posture}</p>
          </article>
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Action now</p>
            <p className="text-sm text-slate-200">{liveCall.action}</p>
          </article>
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Guardrail and flip</p>
            <p className="text-sm text-slate-200">{liveCall.guardrail}</p>
            <p className="text-xs text-slate-400">Flip: {liveCall.flip}</p>
          </article>
        </div>
      </HubSection>

      <details className="weather-panel scroll-mt-28 space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open full edge-case library
        </summary>
        <div className="mt-4 space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Fastest bounded tools</h2>
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Exact answers</h2>
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Owner-specific paths</h2>
            <div className="weather-page-grid-3">
              {useCaseRoles.map((role) => (
                <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-link-card text-sm font-semibold text-slate-100">{role.title}</Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Situation-specific paths</h2>
            <div className="weather-page-grid-2">
              {situationUseCaseDefinitions.map((situation) => (
                <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-hub-link-card text-sm text-slate-100">{situation.title}</Link>
              ))}
            </div>
          </section>
        </div>
      </details>
    </HubPageShell>
  );
}
