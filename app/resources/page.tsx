import type { Metadata } from "next";
import Link from "next/link";
import { StaticHubNav } from "../components/staticHubNav";
import { buildPageMetadata } from "../../lib/pageMetadata";
import { resourceArticles } from "../../lib/resourceArticles";
import { resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";

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

const authorityPages = [
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

export default function ResourcesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <StaticHubNav currentPath="/resources" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Resources</h1>
        <p className="text-sm text-slate-300">
          Board-ready governance resources for capital allocation, escalation controls, reversibility discipline, and operating strategy under pressure.
        </p>
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

      <section className="grid gap-3 sm:grid-cols-2">
        {resourceArticles.map((article) => (
          <Link key={article.slug} href={`/resources/${article.slug}`} className="weather-panel space-y-2 px-4 py-4" data-page-cluster={article.cluster} data-page-intent={article.intent}>
            <span className="inline-flex w-fit items-center rounded-full border border-rose-300/45 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">
              {article.format === "case-example" ? "Case example" : article.cluster === "vc" ? "VC brief" : "Pain-driven brief"}
            </span>
            <h2 className="text-base font-semibold text-slate-100">{article.title}</h2>
            <p className="text-sm text-slate-200">{article.description}</p>
          </Link>
        ))}
      </section>

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
