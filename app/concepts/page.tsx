import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import {
  getMacroContextForArticle,
  productConceptArticles,
  productConceptEras,
  regimeToneByKey,
} from "../../lib/productCanon";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Product management canon in macro context — Whether",
  description:
    "Plot widely read PM essays against the macro regime history to explain why specific frameworks spread when they did.",
  path: "/concepts",
  imageAlt: "Product management concept timeline with macro context",
  imageParams: {
    template: "guides",
    eyebrow: "PM canon timeline",
    title: "Product essays in market context",
    subtitle: "See how famous PM ideas align with changing macro regimes.",
    kicker: "From feature shipping to outcome and AI-native strategy.",
  },
});

const formatPublishedLabel = (year: number, month: number) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const eraIntro: Record<(typeof productConceptEras)[number], string> = {
  "Foundational classics":
    "Role-definition essays that established the modern PM identity in software organizations.",
  "Process & strategy shifters":
    "Frameworks that shifted teams from output tracking toward outcome accountability.",
  "Modern AI era":
    "Operating models for uncertainty, model risk, and principle-led product execution.",
  "Career & identity frameworks":
    "Cult classics PMs share to calibrate role expectations, growth, and career progression.",
  "Behavioral psychology & user growth":
    "Behavior and retention frameworks used to improve engagement and long-term value capture.",
  "Tactical masterclasses":
    "Practical playbooks PMs use for interviews, docs, and product-market-fit diagnostics.",
  "Institutional friction":
    "Pieces focused on translating strategy into execution inside real organizational constraints.",
};

const toEraId = (era: (typeof productConceptEras)[number]) =>
  era.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type ProductConceptTimelinePageProps = {
  searchParams: Promise<{
    q?: string;
    era?: string;
    audience?: string;
    regime?: string;
  }>;
};

export default async function ProductConceptTimelinePage({
  searchParams,
}: ProductConceptTimelinePageProps) {
  const { q = "", era = "all", audience = "all", regime = "all" } = await searchParams;

  const searchQuery = q.trim().toLowerCase();
  const audienceOptions = [...new Set(productConceptArticles.map((article) => article.audience))].sort();
  const regimeOptions = [
    ...new Set(
      productConceptArticles
        .map((article) => getMacroContextForArticle(article)?.primary.summary.regimeLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  ].sort();

  const filteredArticles = productConceptArticles.filter((article) => {
    const articleMacroContext = getMacroContextForArticle(article);
    const matchesSearch =
      searchQuery.length === 0 ||
      [article.title, article.author, article.focus].join(" ").toLowerCase().includes(searchQuery);
    const matchesEra = era === "all" || article.era === era;
    const matchesAudience = audience === "all" || article.audience === audience;
    const matchesRegime =
      regime === "all" || articleMacroContext?.primary.summary.regimeLabel === regime;

    return matchesSearch && matchesEra && matchesAudience && matchesRegime;
  });

  const totalMatches = filteredArticles.length;


  const conceptCollectionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Product management concept timeline in macro context",
    url: buildCanonicalUrl("/concepts"),
    description:
      "A curated timeline of product-management concepts mapped to macro regime context and guidance signals.",
    isPartOf: {
      "@type": "WebSite",
      name: "Whether",
      url: buildCanonicalUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: filteredArticles.slice(0, 30).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildCanonicalUrl(`/concepts/${article.slug}`),
        name: article.title,
      })),
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(conceptCollectionStructuredData) }}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Product canon in context
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Why famous PM ideas spread when they did
        </h1>
        <p className="text-sm text-slate-200">
          This timeline pairs widely read product-management essays with Whether&apos;s
          historical macro posture. It now includes foundational essays plus cult-classic
          career, growth-psychology, and tactical operating frameworks. Each article page
          explains what was said, why teams adopted it, and which market conditions likely
          reinforced the idea.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Find relevant concepts faster</h2>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action="/concepts" method="get">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Search
            <input
              name="q"
              defaultValue={q}
              placeholder="Title, author, focus"
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Era
            <select
              name="era"
              defaultValue={era}
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            >
              <option value="all">All eras</option>
              {productConceptEras.map((eraOption) => (
                <option key={eraOption} value={eraOption}>
                  {eraOption}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Audience
            <select
              name="audience"
              defaultValue={audience}
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            >
              <option value="all">All audiences</option>
              {audienceOptions.map((audienceOption) => (
                <option key={audienceOption} value={audienceOption}>
                  {audienceOption}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Regime
            <select
              name="regime"
              defaultValue={regime}
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            >
              <option value="all">All regime labels</option>
              {regimeOptions.map((regimeOption) => (
                <option key={regimeOption} value={regimeOption}>
                  {regimeOption}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              Apply filters
            </button>
            <Link
              href="/concepts"
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
            >
              Reset
            </Link>
            <p className="inline-flex min-h-[44px] items-center text-sm text-slate-300">
              {totalMatches} concept{totalMatches === 1 ? "" : "s"} matched.
            </p>
          </div>
        </form>
      </section>

      <section className="weather-panel space-y-3 px-6 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Jump to era</h2>
        <div className="flex flex-wrap gap-2">
          {productConceptEras.map((eraOption) => (
            <a
              key={eraOption}
              href={`#${toEraId(eraOption)}`}
              className="weather-pill inline-flex min-h-[38px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
            >
              {eraOption}
            </a>
          ))}
        </div>
      </section>

      {productConceptEras.map((eraOption) => {
        const articles = filteredArticles
          .filter((article) => article.era === eraOption)
          .sort((a, b) => a.publishedYear - b.publishedYear || a.publishedMonth - b.publishedMonth);

        if (articles.length === 0) {
          return null;
        }

        return (
          <section id={toEraId(eraOption)} key={eraOption} className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">{eraOption}</h2>
            <p className="text-sm text-slate-300">{eraIntro[eraOption]}</p>
            <ol className="space-y-3">
              {articles.map((article) => {
                const macroContext = getMacroContextForArticle(article);

                return (
                  <li key={article.slug} className="weather-surface space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                        {formatPublishedLabel(article.publishedYear, article.publishedMonth)}
                      </p>
                      {macroContext ? (
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${regimeToneByKey[macroContext.primary.summary.regime]}`}
                        >
                          {macroContext.primary.summary.regimeLabel}
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-500/80 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                          Macro snapshot unavailable
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-100">{article.title}</h3>
                      <p className="text-sm text-slate-300">
                        {article.author} · Focus: {article.focus} · {article.sourceType} · ~
                        {article.readMins} min read
                      </p>
                      <p className="text-sm text-slate-200">{article.summary}</p>
                      {macroContext ? (
                        <p className="text-xs text-slate-300">
                          Guidance signal at publication: {macroContext.primary.summary.guidance}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-300">
                          Historical monthly snapshots currently begin in 2012, so no direct regime
                          match is available for this publication date.
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/concepts/${article.slug}`}
                      className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
                    >
                      Open contextual breakdown
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
