import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import {
  conceptAudiences,
  conceptFocuses,
  getFeaturedConceptArticles,
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
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { formatConceptPublishedLabel } from "../../lib/formatters";

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
  const featuredArticles = getFeaturedConceptArticles().slice(0, 3);

  const canonicalDistribution = productConceptArticles.reduce(
    (acc, article) => {
      const macroContext = getMacroContextForArticle(article);
      acc.total += 1;

      if (!macroContext) {
        acc.unmapped += 1;
        return acc;
      }

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
      unmapped: 0,
    },
  );


  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/concepts" },
      ]),
    ),
  };

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
    <HubPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(conceptCollectionStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }}
      />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Concepts" }]} />
      <HubHero
        eyebrow="Product canon in context"
        title="Use the canon to translate this week&apos;s delta into operating calls."
        description="The canon is useful when a team needs language for a decision already implied by the weekly brief. It should sharpen the call, not replace it."
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <h2 className="text-base font-semibold text-white">Use this canon when…</h2>
            <ul className="space-y-1 text-sm text-slate-200">
              <li>Hiring: decide if role approvals stay selective or reopen in tranches this week.</li>
              <li>Product: decide whether to push core delivery or cut speculative roadmap branches.</li>
              <li>Finance: decide whether to hold spend, raise now, or trigger burn-control thresholds.</li>
            </ul>
            {currentRegime ? (
              <p className="text-xs text-slate-300">Current regime baseline: {currentRegime.regimeLabel}.</p>
            ) : null}
          </div>
        )}
      />
      <HubSection title="Decision translation sequence" description="Anchor on the current regime first, then choose the framework or essay that best tightens the operating call.">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="weather-hub-card rounded-md px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">1 · What changed</p>
            <p className="mt-1 text-slate-100">Anchor on this week&apos;s macro shift before applying any framework.</p>
          </div>
          <div className="weather-hub-card rounded-md px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">2 · Tighten or loosen</p>
            <p className="mt-1 text-slate-100">Convert concepts into clear calls on hiring pace, roadmap scope, and spend.</p>
          </div>
          <div className="weather-hub-card rounded-md px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">3 · What flips the call</p>
            <p className="mt-1 text-slate-100">Define the threshold that triggers pause, resume, or reversal.</p>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/" className="weather-hub-link-card rounded-md px-3 py-2">
            Open weekly brief
          </Link>
          <Link
            href="/answers/should-startups-hire-engineers-right-now"
            className="weather-hub-link-card rounded-md px-3 py-2"
          >
            Hiring decision answer
          </Link>
          <Link
            href="/answers/should-startups-slow-roadmap-expansion"
            className="weather-hub-link-card rounded-md px-3 py-2"
          >
            Product scope decision answer
          </Link>
          <Link
            href="/answers/when-should-startups-cut-burn"
            className="weather-hub-link-card rounded-md px-3 py-2"
          >
            Burn threshold decision answer
          </Link>
        </div>
      </HubSection>

      <HubSection title="High-signal concepts to revisit first" description="Use these pages for quick decision translation, then expand into the full canon.">
        <div className="grid gap-3 md:grid-cols-3">
          {featuredArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/concepts/${article.slug}`}
              className="weather-hub-link-card space-y-2"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{article.focus}</p>
              <p className="text-sm font-semibold text-slate-100">{article.title}</p>
              <p className="text-xs text-slate-300">{article.audience}</p>
            </Link>
          ))}
        </div>
      </HubSection>

      <HubSection title="Canon distribution by regime">
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
          {canonicalDistribution.unmapped > 0 ? (
            <p>
              Outside coverage window: {Math.round((canonicalDistribution.unmapped / canonicalDistribution.total) * 100)}%
            </p>
          ) : null}
        </div>
        <p className="text-xs text-slate-300">
          Most PM frameworks in this canon emerged under looser-capital conditions, which can over-index the default playbook toward expansion assumptions.
        </p>
      </HubSection>

      <HubSection title="Find relevant concepts faster">
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
      </HubSection>


      <HubSection title="Explore concept maps">
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
      </HubSection>
      <HubSection title="Jump to era">
        <div className="flex flex-wrap gap-2">
          {productConceptEras.map((eraOption) => (
            <a
              key={eraOption}
              href={`#${toEraId(eraOption)}`}
              className="weather-hub-chip"
            >
              {eraOption}
            </a>
          ))}
        </div>
      </HubSection>

      {productConceptEras.map((eraOption) => {
        const articles = filteredArticles
          .filter((article) => article.era === eraOption)
          .sort((a, b) => a.publishedYear - b.publishedYear || a.publishedMonth - b.publishedMonth);

        if (articles.length === 0) {
          return null;
        }

        return (
          <HubSection
            id={toEraId(eraOption)}
            key={eraOption}
            title={eraOption}
            description={eraIntro[eraOption]}
          >
            <ol className="space-y-3">
              {articles.map((article) => {
                const macroContext = getMacroContextForArticle(article);
                const macroReadout = getMacroInstrumentReadout(article);
                const volatilityClass = getConceptVolatility(article);
                const publicationRegime = getConceptPublicationRegime(article);
                const regimeStatus = getConceptRegimeStatus(article, currentRegime?.regime ?? null);

                return (
                  <li key={article.slug} className="weather-hub-card space-y-3 px-4 py-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-100">{article.title}</h3>
                      <p className="text-sm text-slate-300">{article.author} · {formatConceptPublishedLabel(article.publishedYear, article.publishedMonth)}</p>
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
          </HubSection>
        );
      })}
    </HubPageShell>
  );
}
