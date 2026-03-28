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
import { PageFlowNav } from "../components/pageFlowNav";
import { decideScrollPlan } from "../../lib/navigation/scrollPlans";
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

  return (
    <HubPageShell width="standard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decision Tools" }]} />
      <HubHero
        eyebrow="Resolve one remaining edge case"
        title="Use Decision Tools only when the weekly brief does not settle the edge case."
        description="If Weekly Brief and Planning already resolved the decision, stop there. Open Decision Tools only when one owner-specific translation or bounded utility still needs work."
        actions={(
          <>
            <Link href="/" className="weather-button inline-flex items-center justify-center">Return to Weekly Brief</Link>
            <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Run ship checklist</Link>
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

      <PageFlowNav
        eyebrow={decideScrollPlan.eyebrow}
        title={decideScrollPlan.title}
        description={decideScrollPlan.description}
        items={decideScrollPlan.items}
      />

      <HubSection
        id="start-from-this-weeks-call"
        title="Start from this week’s live call"
        description="Use the same bounded weekly decision everywhere below so translation never drifts from the canonical brief."
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

      <HubSection
        id="run-this-now"
        title="Fastest bounded tools"
        description="Start with the shortest runnable tool only after the weekly call already tells you the direction and you just need owner-specific translation."
        className="scroll-mt-28"
      >
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
      </HubSection>

      <HubSection
        id="decision-utilities"
        title="Validation utilities"
        description="Use these only when one unresolved move needs bounded validation or company context before you act."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-2">
          <Link href="/decide/ship-checklist" className="weather-hub-link-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
            <p className="text-sm text-slate-300">Get a go / wait / kill recommendation tied to the current regime.</p>
          </Link>
          <Link href="/decide/team-context" className="weather-hub-link-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
            <p className="text-sm text-slate-300">Adjust the weekly call for your company profile without reopening the whole brief.</p>
          </Link>
        </div>
      </HubSection>

      <HubSection
        id="direct-answers"
        title="Answer one exact question"
        description="If the unresolved issue is already crisp, use a single-question answer here instead of widening into a broader browse flow."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-2">
          {featuredAnswerPages.slice(0, 4).map((page) => (
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
        <div className="flex flex-wrap gap-2">
          <Link href="/answers" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Open answers library
          </Link>
        </div>
      </HubSection>

      <HubSection
        id="guided-translation"
        title="Translate the call for one owner or company stage"
        description="Use these paths after the weekly call is directionally settled and you need a reusable framing for one team, function, or company stage."
        className="scroll-mt-28"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Owner-specific paths</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredStakeholders.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}` as Route}
                  className="weather-hub-link-card space-y-2"
                >
                  <h2 className="text-base font-semibold text-slate-100">{guide.title}</h2>
                  <p className="text-sm text-slate-300">{guide.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Company-stage paths</p>
            <div className="grid gap-3">
              {stageGuides.map((stage) => (
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
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/guides" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Open guides library
          </Link>
        </div>
      </HubSection>

      <HubSection
        id="explore-by-role"
        title="Open an owner-specific path"
        description="Use these when the remaining question belongs to one function or executive owner."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-link-card text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </HubSection>

      <HubSection
        id="explore-by-situation"
        title="Open a situation-specific path"
        description="Use these when the remaining question is a concrete operating moment, not a role handoff."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-2">
          {situationUseCaseDefinitions.map((situation) => (
            <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-hub-link-card text-sm text-slate-100">{situation.title}</Link>
          ))}
        </div>
      </HubSection>
    </HubPageShell>
  );
}
