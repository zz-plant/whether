import type { Metadata } from "next";
import { ReportSection } from "../components/reportSection";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { buildHomeAreaRows, describePauseLineCount } from "../../lib/report/home/homeSectionModel";
import { describeAnswerStanding } from "../../lib/report/answerStanding";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
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
import { ActionLink } from "../components/ui/actionLink";
import { buildGuidedTranslationHref, GuidedTranslationPanels, type GuidedTranslationSearchParams } from "./components/guidedTranslationPanels";
import { ToolkitLibraryPanels } from "./components/toolkitLibraryPanels";

/** Typed route for a direct-answer page; the dynamic segment is `[slug]`. */
const answerPageHref = (slug: string): Route => `/answers/${slug}`;

type AnswerStanding = NonNullable<ReturnType<typeof describeAnswerStanding>>;

/* A stamp, not a pill (ui-ux-standards §XIV): the row's answer for this week is
   a fact, so it takes the sharp tier. Caution ink for a crossed pause line, the
   neutral border for a distance, and the week's weather word in the regime ink
   and the stamp face it prints in everywhere else (§XVI, §XVIII). */
const STAMP_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-fluid-nano font-semibold leading-tight tabular-nums";
const STAMP_TONE_CLASS = {
  crossed: "border-semantic-caution-border/60 bg-semantic-caution-bg text-semantic-caution-fg",
  distance: "border-[var(--border-default)] text-slate-300",
  conditions: "type-stamp border-[var(--border-default)] text-[color:var(--regime-ink)]",
} as const;

const AnswerStandingStamp = ({ standing, className }: { standing: AnswerStanding; className: string }) => {
  const tone = standing.kind === "conditions" ? "conditions" : standing.crossed ? "crossed" : "distance";
  return (
    <span data-answer-standing={tone} className={`${STAMP_CLASS} ${STAMP_TONE_CLASS[tone]} ${className}`}>
      {standing.text}
    </span>
  );
};

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Resolve a decision by role, situation or toolkit",
  description: "One focused path per open decision: route by role, company stage, single answer, or a reusable toolkit.",
  path: "/resolve",
  imageAlt: "Whether: resolve a decision",
  imageParams: {
    template: "solutions",
    title: "Resolve a decision",
    subtitle: "One focused path per open decision: by role, company stage, single answer, or a reusable toolkit.",
  },
});

export default async function DecidePage({
  searchParams,
}: {
  searchParams?: Promise<GuidedTranslationSearchParams & { toolkitQuery?: string }>;
}) {
  const breadcrumbStructuredData = graph([buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/resolve" }]))]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/resolve" });
  const { homeBriefModel, weeklyDecisionCardModel } = snapshot;
  const liveCall = {
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };
  /* Each answer's standing this week, from the area rows the homepage's "What
     are you deciding?" choices print, fed the way app/page.tsx feeds them and
     from the snapshot this page already loaded. No reader calibration: the
     answer page a row opens reads the published lines too, so the row and the
     page it leads to say the same thing. */
  const { currentScores } = weeklyDecisionCardModel.diagnostics;
  const areaRows = buildHomeAreaRows({
    actionStripItems: weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: weeklyDecisionCardModel.decision.decisionMovement,
    scores: { tightness: currentScores.tightness, riskAppetite: currentScores.riskAppetite },
  });
  const pauseLineCount = describePauseLineCount(areaRows);
  const conditionsLabel = getRegimePublicLabel(reportData.assessment.regime);
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const recommendedStakeholderGuides = featuredStakeholders.slice(0, 2);
  const recommendedStageGuides = stageGuides.slice(0, 2);
  const sectionLinks = [
    { href: "#direct-answers", label: "Direct answers" },
    { href: "#decide-secondary-paths", label: "Browse by role or stage" },
  ];

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: reportData.statusLabel,
          regime: reportData.assessment.regime,
          recordDateLabel: reportData.recordDateLabel,
          fetchedAtLabel: reportData.fetchedAtLabel,
        },
        page: {
          pageTitle: "Resolve one open decision",
          pageSummary: "One yes-or-no answer per open decision, under this week's guidance.",
          sectionLinks: sectionLinks.slice(0, 2),
        },
        trust: {
          trustStatusTone: snapshot.isFallback ? "warning" : "stable",
        },
        chrome: {
          sidebarVariant: "hidden",
        },
        actions: {
          nextStep: {
            href: "/operate",
            description: "Set this week's rules for the rest of the plan.",
            label: "Open the plan",
          },
        },
        payloads: {
          structuredData: breadcrumbStructuredData,
        },
      }}
    >
        <OperatorWorkflowRouteTracker />
      {/* The page is the answers. The old router asked "which decision is still
          open?" and offered a recommended path, two answers, two roles, two
          stages, a toolkit filter and a library — a taxonomy to navigate before
          anything was answered. Most readers arrive with "should I hire?". */}
      <ReportSection
        id="direct-answers"
        title="Direct answers"
        description={`Under this week's guidance: ${liveCall.action}`}
      >
        {/* The tally over the list, as the homepage prints it over its five
            choices: the count a reader would otherwise assemble by opening
            the answers one by one. */}
        {pauseLineCount ? (
          <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
            {pauseLineCount}
          </p>
        ) : null}
        <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
          {featuredAnswerPages.map((page) => {
            const standing = describeAnswerStanding({ page, areaRows, conditionsLabel });
            return (
              <li key={page.slug}>
                {/* The title is the anchor's own first child, not nested in a
                    wrapper, because that is what the underline rule in
                    decision-flow.css keys on: `a:has(p)` clears the inherited
                    underline and `a:has(p) > :first-child` puts it back on the
                    title alone. Written with wrapper spans, every row rendered as
                    two underlined lines and read as two links — the exact defect
                    that rule was added to fix on /answer. The grid keeps the
                    chevron beside both lines without a wrapper.

                    The week's standing sits under the title on a phone and in a
                    column of its own from `sm`, so the answers line up and a
                    reader can scan them without reading the questions twice. */}
                <Link
                  href={answerPageHref(page.slug)}
                  className={`grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 hover:bg-slate-900/40 ${
                    standing ? "sm:grid-cols-[minmax(0,1fr)_auto_auto]" : ""
                  }`}
                >
                  <p className="col-start-1 row-start-1 text-sm font-semibold text-slate-100">{page.title}</p>
                  {standing ? (
                    <AnswerStandingStamp
                      standing={standing}
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
        </ul>
        {/* Two references the answers lean on, linked under the list they
            serve. They were two chip-boxed buttons floating between the list
            and the browse disclosure, belonging to neither. */}
        <nav aria-label="Context for these answers" className="flex flex-wrap items-center gap-x-5">
          <ActionLink href="/comps" variant="inline">Public SaaS valuation context</ActionLink>
          <ActionLink href="/history/compare" variant="inline">Compare historical funding conditions</ActionLink>
        </nav>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </ReportSection>

      {/* A row like the evidence page's disclosures: the question is the
          control, ruled off by the report row, no box. It was a `weather-surface`
          whose padding the report row zeroes, so the closed state drew a
          16px-radius bar hugging a one-line summary with its text against the
          border — a pill-shaped control (§XIV). The shared chevron contract
          comes from `weather-auto-chevron`. */}
      <details id="decide-secondary-paths" className="weather-auto-chevron weather-panel">
        <summary className="select-none text-base font-semibold text-slate-100">
          Browse by role, company stage, situation or toolkit
        </summary>
        <div className="mt-4 space-y-6">
          <section className="grid gap-4 lg:grid-cols-2">
            <nav id="guided-translation" aria-labelledby="guided-translation-title" className="space-y-3">
              <h2 id="guided-translation-title" className="text-sm type-eyebrow text-slate-300">By role or stage</h2>
              <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
                {recommendedStakeholderGuides.map((guide) => (
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
                {recommendedStageGuides.map((stage) => (
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
              <h2 className="text-sm type-eyebrow text-slate-300">Help by role</h2>
              <div className="flex flex-wrap gap-2">
                {useCaseRoles.map((role) => (
                  <Link key={role.slug} href={`/resolve/${role.slug}`} className="weather-hub-chip">
                    {role.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm type-eyebrow text-slate-300">Help by situation</h2>
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
