import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPublishedLabel } from "../../../lib/formatters";
import type { ProductConceptArticle } from "../../../lib/productCanon";
import { getMacroContextForArticle, regimeToneByKey } from "../../../lib/productCanon";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../../lib/seo";

export type ConceptTaxonomyKind = "audience" | "focus";

export type ConceptTaxonomyCopy<TTaxonomy extends string> = {
  metadataNotFoundTitle: string;
  metadataNotFoundDescription: string;
  metadataNotFoundImageAlt: string;
  metadataDescription: (resolvedTaxonomy: TTaxonomy) => string;
  metadataImageAlt: (resolvedTaxonomy: TTaxonomy) => string;
  metadataImageParams: (resolvedTaxonomy: TTaxonomy) => {
    template: "guides";
    eyebrow: string;
    title: string;
    subtitle: string;
    kicker: string;
  };
  structuredDataName: (resolvedTaxonomy: TTaxonomy) => string;
  eyebrow: string;
  heading: (resolvedTaxonomy: TTaxonomy) => string;
  description: (resolvedTaxonomy: TTaxonomy) => string;
};

type ConceptTaxonomyPageConfig<TTaxonomy extends string> = {
  taxonomyKind: ConceptTaxonomyKind;
  slug: string;
  resolveBySlug: (slug: string) => TTaxonomy | undefined;
  listByTaxonomy: (value: TTaxonomy) => ProductConceptArticle[];
  copy: ConceptTaxonomyCopy<TTaxonomy>;
};

const buildTaxonomyPath = (taxonomyKind: ConceptTaxonomyKind, slug: string) =>
  `/concepts/${taxonomyKind}/${slug}`;

export const buildConceptTaxonomyMetadata = <TTaxonomy extends string>({
  taxonomyKind,
  slug,
  resolveBySlug,
  copy,
}: Omit<ConceptTaxonomyPageConfig<TTaxonomy>, "listByTaxonomy">): Metadata => {
  const resolvedTaxonomy = resolveBySlug(slug);

  if (!resolvedTaxonomy) {
    return buildPageMetadata({
      title: copy.metadataNotFoundTitle,
      description: copy.metadataNotFoundDescription,
      path: "/concepts",
      imageAlt: copy.metadataNotFoundImageAlt,
    });
  }

  return buildPageMetadata({
    title: `${resolvedTaxonomy} concept map — Whether`,
    description: copy.metadataDescription(resolvedTaxonomy),
    path: buildTaxonomyPath(taxonomyKind, slug),
    imageAlt: copy.metadataImageAlt(resolvedTaxonomy),
    imageParams: copy.metadataImageParams(resolvedTaxonomy),
  });
};

export const ConceptTaxonomyPage = <TTaxonomy extends string>({
  taxonomyKind,
  slug,
  resolveBySlug,
  listByTaxonomy,
  copy,
}: ConceptTaxonomyPageConfig<TTaxonomy>) => {
  const resolvedTaxonomy = resolveBySlug(slug);

  if (!resolvedTaxonomy) {
    notFound();
  }

  const articles = listByTaxonomy(resolvedTaxonomy);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.structuredDataName(resolvedTaxonomy),
    url: buildCanonicalUrl(buildTaxonomyPath(taxonomyKind, slug)),
    isPartOf: {
      "@type": "WebSite",
      name: "Whether",
      url: buildCanonicalUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildCanonicalUrl(`/concepts/${article.slug}`),
        name: article.title,
      })),
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.eyebrow}</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{copy.heading(resolvedTaxonomy)}</h1>
        <p className="text-sm text-slate-300">{copy.description(resolvedTaxonomy)}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Articles</h2>
        <ol className="space-y-3">
          {articles.map((article) => {
            const macroContext = getMacroContextForArticle(article);

            return (
              <li key={article.slug} className="weather-surface space-y-3 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                  {formatPublishedLabel(article.publishedYear, article.publishedMonth)}
                </p>
                <h3 className="text-base font-semibold text-slate-100">{article.title}</h3>
                <p className="text-sm text-slate-300">{article.summary}</p>
                {macroContext ? (
                  <p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${regimeToneByKey[macroContext.primary.summary.regime]}`}
                    >
                      {macroContext.primary.summary.regimeLabel}
                    </span>
                  </p>
                ) : null}
                <Link
                  href={`/concepts/${article.slug}`}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100"
                >
                  Open concept page →
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="weather-panel px-6 py-6">
        <Link
          href="/concepts"
          className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
        >
          Back to full concept timeline
        </Link>
      </section>
    </main>
  );
};
