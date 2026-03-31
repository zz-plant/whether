import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/pageMetadata";
import { resourceArticles } from "../../lib/resourceArticles";
import { resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { Tag } from "../components/ui/tag";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Resources — deeper governance artifacts",
  description:
    "Downstream governance artifact library for operators who need board-ready material after Planning is already set.",
  path: "/resources",
  imageAlt: "Whether resources hub",
  imagePath: "/social/resources.svg",
});

metadata.robots = noindexRobots;

const authorityPages: Array<{
  path: Route;
  title: string;
  description: string;
}> = [
  {
    path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
    title: "How VC firms can enforce capital discipline across portfolios",
    description: "Portfolio-wide framework + implementation model + board-forwardable artifact language.",
  },
];

const toolPages = [
  resourceSupportingPages.capitalPostureTemplate,
  resourceSupportingPages.reversalTriggerChecklist,
  resourceSupportingPages.quarterlyCapitalPostureMemoExample,
  resourceSupportingPages.decisionShieldOverview,
];

export default async function ResourcesPage() {
  const { snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/resources" });
  const topRule = snapshot.homeBriefModel.decisionRules[0];

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/resources" },
      ]),
    ),
  };

  return (
    <SecondaryPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Resources" }]} />
      <SecondarySurfaceStartBlock surface="resources" />
      <SecondaryPageHeader
        title="Use this only for deeper governance artifacts after Planning."
        description="This page is for board, governance, and reversibility material after the weekly plan is already clear. It should not compete with Decision Tools or direct-answer routing."
        actions={(
          <>
            <ButtonLink href="/operations" variant="primary">
              Return to Planning
            </ButtonLink>
            <ButtonLink href="#resource-decision-extract" variant="pill">
              Open decision extract
            </ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection
        className="scroll-mt-28"
        eyebrow="This week before long-form reading"
        title="Decision extract for leadership reviews"
      >
        <div id="resource-decision-extract" className="space-y-3">
          <p className="text-sm text-slate-200">{snapshot.homeBriefModel.decisionShiftSummary}</p>
          {topRule ? (
            <article className="weather-surface space-y-2 px-4 py-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Bounded rule · {decisionAreaLabel(topRule.area)}</p>
              <p className="font-semibold text-slate-100">{topRule.recommendation}</p>
              <p className="text-xs text-rose-200">Pause: {topRule.pauseTrigger}</p>
              <p className="text-xs text-emerald-200">Resume: {topRule.resumeTrigger}</p>
            </article>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/" variant="ghost">
              Open Weekly Brief
            </ButtonLink>
            <ButtonLink href="/operations#ops-export-briefs" variant="pill">
              Open export briefs
            </ButtonLink>
          </div>
        </div>
      </SecondaryPageSection>

      <SecondaryPageSection eyebrow="Deeper planning artifacts" title="Start from the operating question">
        <p className="text-sm text-slate-300">
          If you need deeper material, open one focused governance artifact below instead of browsing the whole library first. For direct answers or routing help, go back to Planning or Decision Tools.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/operations" variant="pill">
            Return to Planning
          </ButtonLink>
        </div>
      </SecondaryPageSection>

      <details className="weather-panel weather-auto-chevron space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open deeper governance library ({resourcePillarPages.length + toolPages.length + resourceArticles.length + authorityPages.length})
        </summary>
        <div className="mt-4 space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Governance pillars</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {resourcePillarPages.map((pillar) => (
                <Link key={pillar.slug} href={`/resources/${pillar.slug}`} className="weather-panel space-y-2 px-4 py-4">
                  <Tag tone="amber">Pillar</Tag>
                  <h2 className="text-base font-semibold text-slate-100">{pillar.h1}</h2>
                  <p className="text-sm text-slate-200">{pillar.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Templates and supporting pages</h2>
            <ul className="space-y-2 text-sm text-slate-200">
              {toolPages.map((page) => (
                <li key={page.path}>
                  <Link href={page.path} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Authority briefs</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {authorityPages.map((page) => (
                <Link key={page.path} href={page.path} className="weather-panel space-y-2 px-4 py-4">
                  <Tag tone="cyan">VC authority</Tag>
                  <h2 className="text-base font-semibold text-slate-100">{page.title}</h2>
                  <p className="text-sm text-slate-200">{page.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Extended briefs</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {resourceArticles.map((article) => (
                <Link key={article.slug} href={`/resources/${article.slug}`} className="weather-panel space-y-2 px-4 py-4" data-page-cluster={article.cluster} data-page-intent={article.intent}>
                  <Tag tone="rose">
                    {article.format === "case-example" ? "Case example" : article.cluster === "vc" ? "VC brief" : "Pain-driven brief"}
                  </Tag>
                  <h2 className="text-base font-semibold text-slate-100">{article.title}</h2>
                  <p className="text-sm text-slate-200">{article.description}</p>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </details>
    </SecondaryPageShell>
  );
}
