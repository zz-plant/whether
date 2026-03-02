import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import {
  conceptAudiences,
  conceptFocuses,
  getConstraintRegimeLabel,
  getMacroContextForArticle,
  getMacroInstrumentReadout,
  getConceptVolatility,
  getOperatingLensLabel,
  productConceptArticles,
  productConceptEras,
  regimeToneByKey,
  toConceptTaxonomySlug,
} from "../../lib/productCanon";
import { getConceptPublicationRegime, getConceptRegimeStatus, getCurrentRegimeContext } from "../../lib/conceptRegime";

export const dynamic = "force-static";

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

const whySpreadByEra: Record<(typeof productConceptEras)[number], string> = {
  "Foundational classics": "Role scope was still fluid, so teams needed shared PM definitions to coordinate execution.",
  "Process & strategy shifters": "Coordination load rose with scale, making output-heavy planning too expensive to sustain.",
  "Modern AI era": "Assumption half-lives shortened and model risk increased, so principle-led operating systems outpaced static roadmaps.",
  "Career & identity frameworks": "PM orgs matured and required explicit ladders, hiring signals, and role boundaries across levels.",
  "Behavioral psychology & user growth": "Acquisition got pricier, so retention and behavior design became a higher-leverage growth system.",
  "Tactical masterclasses": "Execution pressure stayed high, so teams adopted reusable playbooks for PMF and decision quality.",
  "Institutional friction": "Cross-functional complexity increased, forcing clearer mechanisms for turning strategy into shipped outcomes.",
};

const toEraId = (era: (typeof productConceptEras)[number]) =>
  era.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type ProductConceptTimelinePageProps = {
  searchParams: Promise<{
    q?: string;
    era?: string;
    audience?: string;
    regime?: string;
    volatility?: string;
  }>;
};

export default async function ProductConceptTimelinePage({
  searchParams,
}: ProductConceptTimelinePageProps) {
  const { q = "", era = "all", audience = "all", regime = "all", volatility = "all" } = await searchParams;

  const searchQuery = q.trim().toLowerCase();
  const currentRegime = getCurrentRegimeContext();
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
    const articleVolatility = getConceptVolatility(article);
    const matchesVolatility = volatility === "all" || articleVolatility === volatility;

    return matchesSearch && matchesEra && matchesAudience && matchesRegime && matchesVolatility;
  });

  const totalMatches = filteredArticles.length;

  const canonicalDistribution = productConceptArticles.reduce(
    (acc, article) => {
      const macroContext = getMacroContextForArticle(article);
      if (!macroContext) {
        return acc;
      }

      acc.total += 1;
      acc.byRegime[macroContext.primary.summary.regime] += 1;
      return acc;
    },
    {
      total: 0,
      byRegime: {
        SCARCITY: 0,
        DEFENSIVE: 0,
        VOLATILE: 0,
        EXPANSION: 0,
      },
    },
  );


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
        <p className="type-kicker uppercase tracking-[0.2em]">
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
        {currentRegime ? (
          <p className="text-xs text-slate-300">Current regime baseline: {currentRegime.regimeLabel}.</p>
        ) : null}
      </section>

      <section className="weather-panel space-y-3 px-6 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Canon distribution by regime</h2>
        <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {(["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"] as const).map((regimeKey) => {
            const count = canonicalDistribution.byRegime[regimeKey];
            const share = canonicalDistribution.total > 0 ? Math.round((count / canonicalDistribution.total) * 100) : 0;

            return (
              <p key={regimeKey}>
                {getConstraintRegimeLabel(regimeKey)}: {share}%
              </p>
            );
          })}
        </div>
        <p className="text-xs text-slate-300">
          Most PM frameworks in this canon emerged under looser-capital conditions, which can over-index the default playbook toward expansion assumptions.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Find relevant concepts faster</h2>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" action="/concepts" method="get">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Search
            <input
              name="q"
              defaultValue={q}
              placeholder="Title, author, focus"
              className="weather-control rounded-md border-slate-700 bg-slate-900"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Era
            <select
              name="era"
              defaultValue={era}
              className="weather-control rounded-md border-slate-700 bg-slate-900"
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
              className="weather-control rounded-md border-slate-700 bg-slate-900"
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
              className="weather-control rounded-md border-slate-700 bg-slate-900"
            >
              <option value="all">All regime labels</option>
              {regimeOptions.map((regimeOption) => (
                <option key={regimeOption} value={regimeOption}>
                  {regimeOption}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Volatility lens
            <select
              name="volatility"
              defaultValue={volatility}
              className="weather-control rounded-md border-slate-700 bg-slate-900"
            >
              <option value="all">All volatility states</option>
              <option value="stable">Stable assumptions</option>
              <option value="volatile">Volatile assumptions</option>
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              Apply filters
            </button>
            <Link
              href="/concepts"
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 type-kicker text-slate-100 tracking-[0.1em]"
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Explore concept maps</h2>
        <Link
          href="/concepts/conflicts"
          className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
        >
          Open conflict map
        </Link>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">By focus</p>
            <div className="flex flex-wrap gap-2">
              {conceptFocuses.map((focusOption) => (
                <Link
                  key={focusOption}
                  href={`/concepts/focus/${toConceptTaxonomySlug(focusOption)}`}
                  className="weather-pill inline-flex min-h-[38px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
                >
                  {focusOption}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">By audience</p>
            <div className="flex flex-wrap gap-2">
              {conceptAudiences.map((audienceOption) => (
                <Link
                  key={audienceOption}
                  href={`/concepts/audience/${toConceptTaxonomySlug(audienceOption)}`}
                  className="weather-pill inline-flex min-h-[38px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
                >
                  {audienceOption}
                </Link>
              ))}
            </div>
          </div>
        </div>
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
                const macroReadout = getMacroInstrumentReadout(article);
                const volatilityClass = getConceptVolatility(article);
                const publicationRegime = getConceptPublicationRegime(article);
                const regimeStatus = getConceptRegimeStatus(article, currentRegime?.regime ?? null);

                return (
                  <li key={article.slug} className="weather-surface space-y-3 px-4 py-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-100">{article.title}</h3>
                      <p className="text-sm text-slate-300">{article.author} · {formatPublishedLabel(article.publishedYear, article.publishedMonth)}</p>
                      {macroContext && macroReadout ? (
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-500/70 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">Capital: {macroReadout.capital}</span>
                          <span className="rounded-full border border-slate-500/70 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">Risk: {macroReadout.risk}</span>
                          <span className="rounded-full border border-slate-500/70 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">Distance to boundary: {macroReadout.boundaryDistance}</span>
                          <span className="rounded-full border border-violet-400/60 bg-violet-900/30 px-2 py-1 text-xs font-semibold text-violet-100">
                            {volatilityClass === "volatile" ? "Assumption half-life: Short" : "Assumption half-life: Long"}
                          </span>
                          <span className="rounded-full border border-slate-500/70 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                            {getOperatingLensLabel(macroContext.primary.summary.regime, volatilityClass)}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full border border-slate-500/80 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                          Macro snapshot unavailable
                        </span>
                      )}
                      <p className="text-sm text-slate-200">Why this idea spread: {whySpreadByEra[article.era]}</p>
                      {regimeStatus === "mismatch" && publicationRegime && currentRegime ? (
                        <p className="rounded-md border border-amber-300/80 bg-amber-900/40 px-3 py-2 text-xs font-semibold text-amber-100">
                          ⚠ Written for {getConstraintRegimeLabel(publicationRegime.regime)} conditions. You are currently in {getConstraintRegimeLabel(currentRegime.regime)}.
                        </p>
                      ) : null}
                      {macroContext ? (
                        <p className="text-xs text-slate-300">
                          ↗ Publication guidance: {macroContext.primary.summary.guidance}
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
