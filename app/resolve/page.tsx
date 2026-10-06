import type { Metadata } from "next";
import { Details } from "../components/details";
import { ReportSection } from "../components/reportSection";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
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
import { buildGuidedTranslationHref, GuidedTranslationPanels, type GuidedTranslationSearchParams } from "./components/guidedTranslationPanels";
import { ToolkitLibraryPanels } from "./components/toolkitLibraryPanels";

/** Typed route for a direct-answer page; the dynamic segment is `[slug]`. */
const answerPageHref = (slug: string): Route => `/answers/${slug}`;

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Resolve a decision by role, situation or toolkit",
  description: "One focused path per open decision: route by role, company stage, single answer, or a reusable toolkit.",
  path: "/resolve",
  imageAlt: "Whether decision tools",
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
  const { homeBriefModel } = snapshot;
  const liveCall = {
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };
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
        <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
          {featuredAnswerPages.map((page) => (
            <li key={page.slug}>
              {/* The title is the anchor's own first child, not nested in a
                  wrapper, because that is what the underline rule in
                  decision-flow.css keys on: `a:has(p)` clears the inherited
                  underline and `a:has(p) > :first-child` puts it back on the
                  title alone. Written with wrapper spans, every row rendered as
                  two underlined lines and read as two links — the exact defect
                  that rule was added to fix on /answer. The grid keeps the
                  chevron beside both lines without a wrapper. */}
              <Link
                href={answerPageHref(page.slug)}
                className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 hover:bg-slate-900/40"
              >
                <p className="text-sm font-semibold text-slate-100">{page.title}</p>
                <span aria-hidden="true" className="row-span-2 shrink-0 text-slate-500">›</span>
                <p className="text-xs text-slate-400">{page.shortAnswer}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/comps" className="weather-hub-chip">Public SaaS valuation context</Link>
          <Link href="/history/compare" className="weather-hub-chip">Compare historical funding conditions</Link>
        </div>
        <GuidedTranslationPanels searchParams={resolvedSearchParams} />
      </ReportSection>

      <Details id="decide-secondary-paths" className="weather-panel px-6 max-sm:px-0 py-6"
        summary={<span className="text-sm font-semibold text-sky-200">Browse by role, company stage, situation or toolkit</span>}
      >
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
      </Details>
    </ReportShell>
  );
}
