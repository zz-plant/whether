import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/pageMetadata";
import { resourceArticles } from "../../lib/resourceArticles";
import { resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { featuredAnswerPages } from "../answers/selectors";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { Tag } from "../components/ui/tag";

export const metadata: Metadata = buildPageMetadata({
  title: "Resources — deeper governance artifacts",
  description:
    "Deeper governance artifacts for operators who need board-ready material after this week’s posture and plan are already set.",
  path: "/resources",
  imageAlt: "Whether resources hub",
  imagePath: "/social/resources.svg",
});

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
        title="Deeper governance artifacts"
        description="Use Planning for the live approval and export workflow. Open Resources only when leadership needs deeper board, governance, or reversibility material behind that weekly plan."
        actions={(
          <>
            <ButtonLink href="/" variant="primary">
              Weekly Brief
            </ButtonLink>
            <ButtonLink href="/operations" variant="pill">
              Planning
            </ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection
        eyebrow="This week before long-form reading"
        title="Decision extract for leadership reviews"
      >
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
      </SecondaryPageSection>

      <SecondaryPageSection eyebrow="Deeper planning artifacts" title="Start from the operating question">
        <p className="text-sm text-slate-300">
          Use Planning for live approval and export. If you need a deeper artifact or a one-question governance answer, open one of the focused resources below.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/operations" variant="pill">
            Return to Planning
          </ButtonLink>
        </div>
      </SecondaryPageSection>

      <section className="grid gap-3 sm:grid-cols-2">
        {resourcePillarPages.map((pillar) => (
          <Link key={pillar.slug} href={`/resources/${pillar.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <Tag tone="amber">Pillar</Tag>
            <h2 className="text-base font-semibold text-slate-100">{pillar.h1}</h2>
            <p className="text-sm text-slate-200">{pillar.description}</p>
          </Link>
        ))}
      </section>

      <SecondaryPageSection title="Templates and supporting pages">
        <ul className="space-y-2 text-sm text-slate-200">
          {toolPages.map((page) => (
            <li key={page.path}>
              <Link href={page.path} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </SecondaryPageSection>

      <details className="weather-panel space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open extended governance library ({resourceArticles.length + authorityPages.length})
        </summary>
        <div className="mt-4 space-y-6">
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

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Direct answers</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredAnswerPages.slice(0, 4).map((page) => (
                <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface space-y-2 px-4 py-4">
                  <p className="text-base font-semibold text-slate-100">{page.title}</p>
                  <p className="text-sm text-slate-300">{page.shortAnswer}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </details>
    </SecondaryPageShell>
  );
}
