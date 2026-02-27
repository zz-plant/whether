import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../../../lib/seo";
import {
  conceptFocuses,
  findConceptFocusBySlug,
  getArticlesByFocus,
  getMacroContextForArticle,
  regimeToneByKey,
  toConceptTaxonomySlug,
} from "../../../../lib/productCanon";

type FocusPageProps = {
  params: Promise<{ focus: string }>;
};

const formatPublishedLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

export function generateStaticParams() {
  return conceptFocuses.map((focus) => ({ focus: toConceptTaxonomySlug(focus) }));
}

export async function generateMetadata({ params }: FocusPageProps): Promise<Metadata> {
  const { focus } = await params;
  const resolvedFocus = findConceptFocusBySlug(focus);

  if (!resolvedFocus) {
    return buildPageMetadata({
      title: "Concept focus not found — Whether",
      description: "Requested concept focus collection was not found.",
      path: "/concepts",
      imageAlt: "Concept focus not found",
    });
  }

  return buildPageMetadata({
    title: `${resolvedFocus} concept map — Whether`,
    description: `Browse ${resolvedFocus.toLowerCase()} product-management essays and their macro regime context.`,
    path: `/concepts/focus/${focus}`,
    imageAlt: `${resolvedFocus} concept map`,
    imageParams: {
      template: "guides",
      eyebrow: "PM concept focus",
      title: `${resolvedFocus} essays`,
      subtitle: "Mapped to the market regimes where each framework spread.",
      kicker: "Whether concept maps",
    },
  });
}

export default async function ConceptFocusPage({ params }: FocusPageProps) {
  const { focus } = await params;
  const resolvedFocus = findConceptFocusBySlug(focus);

  if (!resolvedFocus) {
    notFound();
  }

  const articles = getArticlesByFocus(resolvedFocus);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${resolvedFocus} product concept map`,
    url: buildCanonicalUrl(`/concepts/focus/${focus}`),
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Concept focus map</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{resolvedFocus} essays in context</h1>
        <p className="text-sm text-slate-300">
          Explore high-signal essays tagged for <span className="font-semibold text-slate-100">{resolvedFocus}</span>,
          then review the macro posture around each publication date.
        </p>
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
}
