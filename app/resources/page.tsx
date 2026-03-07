import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/pageMetadata";
import { resourceArticles } from "../../lib/resourceArticles";
import { resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildHomeBriefModel } from "../../lib/report/homeBriefModel";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";

export const metadata: Metadata = buildPageMetadata({
  title: "Resources — board governance pillars",
  description:
    "Board-facing long-form resources on capital discipline, posture frameworks, pain-driven operating decisions, and practical templates.",
  path: "/resources",
  imageAlt: "Whether resources hub",
  imageParams: {
    template: "guides",
  },
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
  const reportResult = await loadReportDataSafe(undefined, { route: "/resources" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const topRule = homeBriefModel.decisionRules[0];

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Resources" }]} />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Resources</h1>
        <p className="text-sm text-slate-300">
          Board-ready governance resources for capital allocation, escalation controls, reversibility discipline, and operating strategy under pressure.
          For formulas, source transparency, and model mechanics, use Reference.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">This week before long-form reading</p>
        <h2 className="text-lg font-semibold text-slate-100">Decision extract for leadership reviews</h2>
        <p className="text-sm text-slate-200">{homeBriefModel.decisionShiftSummary}</p>
        <article className="weather-surface space-y-2 px-4 py-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Bounded rule · {decisionAreaLabel(topRule.area)}</p>
          <p className="font-semibold text-slate-100">{topRule.recommendation}</p>
          <p className="text-xs text-rose-200">Pause: {topRule.pauseTrigger}</p>
          <p className="text-xs text-emerald-200">Resume: {topRule.resumeTrigger}</p>
        </article>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="weather-button inline-flex min-h-[44px] items-center justify-center">Open Weekly Brief</Link>
          <Link href="/operations#ops-export-briefs" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">Open export briefs</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {resourcePillarPages.map((pillar) => (
          <Link key={pillar.slug} href={`/resources/${pillar.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <span className="inline-flex w-fit items-center rounded-full border border-amber-300/45 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">
              Pillar
            </span>
            <h2 className="text-base font-semibold text-slate-100">{pillar.h1}</h2>
            <p className="text-sm text-slate-200">{pillar.description}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {authorityPages.map((page) => (
          <Link key={page.path} href={page.path} className="weather-panel space-y-2 px-4 py-4">
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-300/45 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
              VC authority
            </span>
            <h2 className="text-base font-semibold text-slate-100">{page.title}</h2>
            <p className="text-sm text-slate-200">{page.description}</p>
          </Link>
        ))}
      </section>

      <details className="weather-panel space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open extended briefs ({resourceArticles.length})
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {resourceArticles.map((article) => (
            <Link key={article.slug} href={`/resources/${article.slug}`} className="weather-panel space-y-2 px-4 py-4" data-page-cluster={article.cluster} data-page-intent={article.intent}>
              <span className="inline-flex w-fit items-center rounded-full border border-rose-300/45 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">
                {article.format === "case-example" ? "Case example" : article.cluster === "vc" ? "VC brief" : "Pain-driven brief"}
              </span>
              <h2 className="text-base font-semibold text-slate-100">{article.title}</h2>
              <p className="text-sm text-slate-200">{article.description}</p>
            </Link>
          ))}
        </div>
      </details>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Tools and supporting pages</h2>
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
    </main>
  );
}
