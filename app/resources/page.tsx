import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { buildPageMetadata } from "../../lib/seo";
import { buildResourceHubEntries } from "../../lib/resourceHub";
import { resourceSupportingPages } from "../../lib/resourcesContent";
import { PageShell } from "../components/pageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { ActionLink } from "../components/ui/actionLink";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { weeklyHeadline } from "../../lib/report/reportEvidence";
import { buildHomeAreaRows, describePauseLineCount } from "../../lib/report/home/homeSectionModel";
import { describeAnswerStanding } from "../../lib/report/answerStanding";
import { decisionAreaLabel, decisionAreaOrder } from "../../lib/report/boundedDecisionRules";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { situationUseCaseDefinitions, toolkitDefinitions, useCaseRoles } from "../../lib/decisionDomainCatalog";
import { featuredAnswerPages } from "../answers/selectors";
import { stakeholderGuides } from "../guides/stakeholderGuides";
import { stageGuides } from "../guides/stageGuides";
import { AnswerStandingStamp } from "./components/answerStandingStamp";
import { AreaIcon } from "../components/ui/conceptIcons";
import {
  buildGuidedTranslationHref,
  GuidedTranslationPanels,
  type GuidedTranslationSearchParams,
} from "./components/guidedTranslationPanels";
import { ToolkitLibraryPanels } from "./components/toolkitLibraryPanels";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides",
  description:
    "The most-asked decision guides, and long-form guides on capital planning, board governance, and reversibility.",
  path: "/resources",
  imageAlt: "Whether guides",
});

/** Typed route for a direct-answer page; the dynamic segment is `[slug]`. */
const answerPageHref = (slug: string): Route => `/answers/${slug}`;

const featuredStakeholderSlugs: readonly string[] = ["founders-ceos", "heads-of-product", "finance-leaders"];

const ROW_CLASS = "grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 hover:bg-slate-900/40";

/*
 * Guides: the answers and the long-form guides for each decision area, the
 * frameworks behind them, and the tools that sit outside the five areas.
 *
 * Until 2026-10-08 these were three places. The eleven direct answers (fourteen since the runway, downturn-prep and first-sales pages joined) were the
 * body of /resolve, the guides were this page, and neither had a header tab —
 * both were reachable only from Plan or Resolve. The answers keep this week's
 * standing beside each question, as /resolve printed it, so the page states the
 * current posture before the click. The browse-by-role, stage, situation and
 * toolkit paths sit at the foot under "More tools": they answer questions the
 * product's promise (hiring, roadmap, fundraising, spending, new bets) does not.
 */
export default async function ResourcesHubPage({
  searchParams,
}: {
  searchParams?: Promise<GuidedTranslationSearchParams & { toolkitQuery?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const entries = buildResourceHubEntries();
  const frameworks = entries.filter((entry) => entry.kind !== "article");
  const articles = entries.filter((entry) => entry.kind === "article");
  const templates = [
    resourceSupportingPages.capitalPostureTemplate,
    resourceSupportingPages.reversalTriggerChecklist,
    resourceSupportingPages.quarterlyCapitalPostureMemoExample,
    resourceSupportingPages.decisionShieldOverview,
  ];

  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/resources" });
  const { weeklyDecisionCardModel } = snapshot;
  /* The week's headline action, from the source the homepage h1 reads. */
  const liveAction = weeklyHeadline(snapshot.weeklyCall).composed;
  /* Each answer's standing this week, from the area rows the homepage's "What
     are you deciding?" choices print, fed the way app/page.tsx feeds them. No
     reader calibration: the answer page a row opens reads the published lines
     too, so the row and the page it leads to say the same thing. */
  const { currentScores } = weeklyDecisionCardModel.diagnostics;
  const areaRows = buildHomeAreaRows({
    actionStripItems: weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: weeklyDecisionCardModel.decision.decisionMovement,
    scores: { tightness: currentScores.tightness, riskAppetite: currentScores.riskAppetite },
  });
  const pauseLineCount = describePauseLineCount(areaRows);
  const regime = reportData.assessment.regime;
  const conditionsLabel = getRegimePublicLabel(regime);

  /* One group per area, in the order every surface lists the five. An answer
     files under the area it argues first (`findLeadAnswerForArea` reads it the
     same way); a guide under the area it is about. */
  const areaGroups = decisionAreaOrder
    .map((area) => ({
      area,
      answers: featuredAnswerPages.filter((page) => page.mappedDecisionAreas[0] === area),
      guides: articles.filter((entry) => entry.decisionArea === area),
    }))
    .filter((group) => group.answers.length > 0 || group.guides.length > 0);

  const featuredStakeholders = stakeholderGuides.filter((guide) => featuredStakeholderSlugs.includes(guide.slug));
  const hasToolSelection = Boolean(
    resolvedSearchParams?.stakeholder
    || resolvedSearchParams?.stage
    || resolvedSearchParams?.library
    || resolvedSearchParams?.toolkitQuery,
  );

  return (
    <PageShell backdropVariant="hub">
      <OperatorWorkflowRouteTracker />
      <Breadcrumbs items={toVisibleBreadcrumbs(buildGroupBreadcrumbs("/resources"))} />
      <article className="weather-panel space-y-8 px-5 max-sm:px-0 py-5">
        {/* No emblem: the "Governance Pillars" glyph beside the title was
            decoration from when the page was "Governance resources", and the
            only image on the page said nothing about guides (2026-10-09). */}
        <header>
          <div className="space-y-2 max-w-2xl">
            {/* "Guides" (2026-10-09): what the page holds, in the reader's word. The
                header's label for this page belongs to the navigation and is
                changed there. */}
            <h1 className="text-fluid-2xl font-semibold text-slate-100">Guides</h1>
            {/* No "evergreen" claim: the answers listed here carry this week's
                standing, so the page is not free of week-to-week change. */}
            <p className="text-sm text-slate-300">
              Answers to the decisions operators ask about most, each marked with where it stands this week.
            </p>
          </div>
        </header>

        <section id="answers" aria-labelledby="resources-answers-heading" className="space-y-4">
          <div className="space-y-1">
            <h2 id="resources-answers-heading" className="type-eyebrow">This week&apos;s answers, by area</h2>
            <p className="text-sm text-slate-300">Under this week&apos;s guidance: {liveAction}</p>
            {/* The tally over the list, as the homepage prints it over its five
                choices: the count a reader would otherwise assemble by opening
                the answers one by one. */}
            {pauseLineCount ? (
              <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
                {pauseLineCount}
              </p>
            ) : null}
          </div>

          {areaGroups.map((group) => {
            /* The area's standing once, beside its name (2026-10-09). Every decision
               answer in a group argues that area first, so each of its rows printed
               the same stamp: "Pause line crossed" three times under Hiring. A row
               keeps a stamp only when it says something else, the conditions word
               on a climate answer. */
            const areaStanding = group.answers
              .map((page) => describeAnswerStanding({ page, areaRows, conditionsLabel }))
              .find((standing) => standing?.kind === "area");
            return (
              <section key={group.area} id={`area-${group.area}`} aria-labelledby={`area-${group.area}-heading`} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h3 id={`area-${group.area}-heading`} className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                    <AreaIcon area={group.area} />
                    {decisionAreaLabel(group.area)}
                  </h3>
                  {areaStanding ? <AnswerStandingStamp standing={areaStanding} regime={regime} className="" /> : null}
                </div>
                <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
                  {group.answers.map((page) => {
                    const answerStanding = describeAnswerStanding({ page, areaRows, conditionsLabel });
                    const standing = answerStanding?.kind === "conditions" ? answerStanding : undefined;
                    return (
                      <li key={page.slug}>
                        {/* The title is the anchor's own first child, not nested in a
                            wrapper, because that is what the underline rule in
                            decision-flow.css keys on: `a:has(p)` clears the inherited
                            underline and `a:has(p) > :first-child` puts it back on the
                            title alone. The week's standing sits under the title on a
                            phone and in a column of its own from `sm`. */}
                        <Link
                          href={answerPageHref(page.slug)}
                          className={`${ROW_CLASS} ${standing ? "sm:grid-cols-[minmax(0,1fr)_auto_auto]" : ""}`}
                        >
                          <p className="col-start-1 row-start-1 text-sm font-semibold text-slate-100">{page.title}</p>
                          {standing ? (
                            <AnswerStandingStamp
                              standing={standing}
                              regime={regime}
                              className="col-start-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end"
                            />
                          ) : null}
                          <span
                            aria-hidden="true"
                            className={`col-start-2 row-start-1 shrink-0 text-slate-500 ${
                              standing ? "row-span-3 sm:col-start-3 sm:row-span-2" : "row-span-2"
                            }`}
                          >
                            ›
                          </span>
                          <p className={`col-start-1 text-xs text-slate-400 ${standing ? "row-start-3 sm:row-start-2" : "row-start-2"}`}>
                            {page.shortAnswer}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                  {group.guides.map((entry) => (
                    <li key={entry.href}>
                      <Link href={entry.href} className={ROW_CLASS}>
                        <p className="col-start-1 row-start-1 text-sm font-semibold text-slate-100">{entry.title}</p>
                        <span aria-hidden="true" className="col-start-2 row-span-2 row-start-1 shrink-0 text-slate-500">›</span>
                        <p className="col-start-1 row-start-2 text-xs text-slate-400">{entry.description}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* Two references the answers lean on, linked under the list they serve. */}
          <nav aria-label="Context for these answers" className="flex flex-wrap items-center gap-x-5">
            <ActionLink href="/comps" variant="inline">SaaS valuation multiples</ActionLink>
            <ActionLink href="/history/compare" variant="inline">Compare historical funding conditions</ActionLink>
          </nav>
        </section>

        <section aria-labelledby="resources-pillars-heading" className="space-y-3">
          <h2 id="resources-pillars-heading" className="type-eyebrow">Governance frameworks</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {frameworks.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} className="weather-surface block space-y-1 px-4 py-4 text-sm text-slate-100 hover:border-sky-500/50">
                  <span className="block font-semibold">{entry.title}</span>
                  <span className="block text-fluid-xs text-slate-400">{entry.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          {/* The four templates the plan page listed under "Resource templates and
              guides" until 2026-10-08; that block repeated this page. */}
          <div className="flex flex-wrap gap-2">
            {templates.map((resource) => (
              <Link
                key={resource.path}
                href={resource.path}
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
              >
                {resource.title}
              </Link>
            ))}
          </div>
        </section>

        {/* Moved down from /resolve, where they sat beside the direct answers.
            Help by role and by situation ("Measure PMF", "Pricing Change",
            "AI Claims") answer questions outside the five areas; their pages
            keep their addresses. Open when a link arrives with a selection. */}
        <section id="more-tools" aria-labelledby="resources-more-tools-heading" className="space-y-3">
          <h2 id="resources-more-tools-heading" className="type-eyebrow">More tools</h2>
          {/* The worksheets by name, outside the fold (2026-10-27). They were
              listed only inside the closed disclosure below, so a reader who
              did not open it never learned the site had them. */}
          <p className="text-sm text-slate-300">
            One-decision worksheets:{" "}
            {toolkitDefinitions.map((toolkit, index) => (
              <Fragment key={toolkit.slug}>
                {index > 0 ? <span aria-hidden="true"> · </span> : null}
                <Link href={`/toolkits/${toolkit.slug}`} className="text-[var(--accent-action)] underline underline-offset-4">
                  {toolkit.title.replace(/ Toolkit$/, "")}
                </Link>
              </Fragment>
            ))}
          </p>
          <GuidedTranslationPanels searchParams={resolvedSearchParams} />
          <details className="weather-auto-chevron weather-panel" open={hasToolSelection}>
            <summary className="select-none text-base font-semibold text-slate-100">
              Browse by role, company stage, situation or toolkit
            </summary>
            <div className="mt-4 space-y-6">
              <section className="grid gap-4 lg:grid-cols-2">
                <nav id="guided-translation" aria-labelledby="guided-translation-title" className="space-y-3">
                  <h3 id="guided-translation-title" className="text-sm type-eyebrow text-slate-300">By role or stage</h3>
                  <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
                    {featuredStakeholders.slice(0, 2).map((guide) => (
                      <li key={guide.slug}>
                        <Link
                          href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: resolvedSearchParams?.stage })}
                          className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 hover:bg-slate-900/40"
                        >
                          <p className="text-sm font-semibold text-slate-100">{guide.title}</p>
                          <span aria-hidden="true" className="row-span-2 shrink-0 text-slate-500">›</span>
                          <p className="text-xs text-slate-400">{guide.tagline}</p>
                        </Link>
                      </li>
                    ))}
                    {stageGuides.slice(0, 2).map((stage) => (
                      <li key={stage.slug}>
                        <Link
                          href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: resolvedSearchParams?.stakeholder })}
                          className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 hover:bg-slate-900/40"
                        >
                          <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                          <span aria-hidden="true" className="row-span-2 shrink-0 text-slate-500">›</span>
                          <p className="text-xs text-slate-400">{stage.primaryValue}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <ToolkitLibraryPanels query={resolvedSearchParams?.toolkitQuery} />
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm type-eyebrow text-slate-300">Help by role</h3>
                  <div className="flex flex-wrap gap-2">
                    {useCaseRoles.map((role) => (
                      <Link key={role.slug} href={`/resolve/${role.slug}`} className="weather-hub-chip">
                        {role.title}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm type-eyebrow text-slate-300">Help by situation</h3>
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
        </section>
      </article>
    </PageShell>
  );
}
