import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
  serializeJsonLd,
} from "../../../lib/pageMetadata";
import {
  canonicalCapitalDisciplinePath,
  findResourcePillarBySlug,
  resourcePillarPages,
  resourceSupportingPages,
} from "../../../lib/resourcesContent";
import { GovernanceLexiconCallout } from "../components/governanceLexiconCallout";
import { PillarCtaBlock } from "../components/pillarCtaBlock";
import { buildResourceArticleMetadata, ResourceArticlePage } from "../components/resourceArticlePage";
import {
  findResourceArticleBySlug,
  generateStaticParams as generateResourceArticleStaticParams,
} from "../../../lib/resourceArticles";

type Params = { slug: string };

export const dynamicParams = false;

const buildSectionAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const splitParagraphForReadability = (paragraph: string) => {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph];
  const chunks: string[] = [];

  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push(sentences.slice(index, index + 2).join(" ").trim());
  }

  return chunks;
};

export function generateStaticParams() {
  const slugs = new Set<string>([
    ...resourcePillarPages.map((entry) => entry.slug),
    ...generateResourceArticleStaticParams().map((entry) => entry.slug),
  ]);

  return Array.from(slugs, (slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findResourceArticleBySlug(slug);
  if (article) {
    return buildResourceArticleMetadata(article);
  }

  const page = findResourcePillarBySlug(slug);
  if (!page) return {};

  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/resources/${page.slug}`,
    imageAlt: page.h1,
    imageParams: {
      template: "guides",
      title: page.h1,
    },
  });
}

export default async function ResourcePillarPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = findResourceArticleBySlug(slug);
  if (article) {
    return <ResourceArticlePage article={article} />;
  }

  const page = findResourcePillarBySlug(slug);
  if (!page) notFound();

  const canonicalUrl = buildCanonicalUrl(`/resources/${page.slug}`);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.description,
    keywords: [page.keyword, "board governance", "capital discipline"],
    author: {
      "@type": "Organization",
      name: organizationName,
    },
    publisher: {
      "@type": "Organization",
      name: organizationName,
      url: buildCanonicalUrl("/"),
    },
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    isPartOf: buildCanonicalUrl(page.canonicalPath),
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizationName,
    url: buildCanonicalUrl("/"),
    sameAs: [buildCanonicalUrl("/")],
  };

  const midpointIndex = Math.floor(page.sections.length / 2);

  return (
    <main id="top" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }} />

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Primary keyword: {page.keyword}</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.h1}</h1>
        <p className="text-sm text-slate-200">{page.description}</p>
        <p className="text-sm text-slate-300">{page.boardPackContext}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">On this page</h2>
        <ol className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {page.sections.map((section) => {
            const anchor = buildSectionAnchor(section.heading);
            return (
              <li key={section.heading}>
                <Link href={`#${anchor}`} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">
                  {section.heading}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Strategic links</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><Link href={canonicalCapitalDisciplinePath} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Capital Discipline pillar (canonical)</Link></li>
          <li><Link href="/resources/board-level-capital-posture-framework" className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Board Framework page{page.slug === "board-level-capital-posture-framework" ? " (current page)" : ""}</Link></li>
          <li><Link href={resourceSupportingPages.decisionShieldOverview.path as Route} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Decision Shield overview page</Link></li>
          <li><Link href={resourceSupportingPages.capitalPostureTemplate.path as Route} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Capital Posture Template page</Link></li>
        </ul>
      </section>

      {page.sections.map((section, index) => {
        const anchor = buildSectionAnchor(section.heading);

        return (
          <section id={anchor} key={section.heading} className="weather-panel space-y-4 px-6 py-6 scroll-mt-24">
            <h2 className="text-xl font-semibold text-slate-100">{section.heading}</h2>
            {section.paragraphs.flatMap((paragraph) => splitParagraphForReadability(paragraph)).map((paragraphChunk, paragraphIndex) => (
              <p key={`${section.heading}-p-${paragraphIndex}`} className="text-sm leading-7 text-slate-200">
                {paragraphChunk}
              </p>
            ))}

            {index === 0 ? <GovernanceLexiconCallout termSlug="capital-regime" /> : null}
            {index === 1 ? <GovernanceLexiconCallout termSlug="escalation-thresholds" /> : null}
            {index === 2 ? <GovernanceLexiconCallout termSlug="reversibility" /> : null}
            {index === 3 ? <GovernanceLexiconCallout termSlug="30-day-confirmation-logic" /> : null}

            {section.subsections?.map((subsection) => (
              <div key={subsection.heading} className="space-y-3 rounded-lg border border-slate-800/70 bg-slate-900/50 px-4 py-4">
                <h3 className="text-lg font-semibold text-slate-100">{subsection.heading.replace(/^H3:\s*/, "")}</h3>
                {subsection.paragraphs
                  .flatMap((paragraph) => splitParagraphForReadability(paragraph))
                  .map((paragraphChunk, paragraphIndex) => (
                    <p key={`${subsection.heading}-p-${paragraphIndex}`} className="text-sm leading-7 text-slate-200">
                      {paragraphChunk}
                    </p>
                  ))}
              </div>
            ))}

            {index === midpointIndex ? (
              <PillarCtaBlock
                title="Use the board-ready template in your next operating review"
                body="Translate these governance standards into one working artifact your leadership team can review weekly and your board can trust monthly."
                keyword={page.keyword}
                sourceSlug={page.slug}
                downloadLabel={page.midpointCtaLabel}
              />
            ) : null}

            <p className="pt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
              <Link href="#top" className="text-slate-300 underline decoration-slate-500/60 underline-offset-4 hover:text-slate-100">
                Back to top
              </Link>
            </p>
          </section>
        );
      })}

      <PillarCtaBlock
        title="Need an executive-ready board pack?"
        body="Request a board pack walkthrough with conversion hooks included for download, request, and contact/demo events."
        keyword={page.keyword}
        sourceSlug={page.slug}
        downloadLabel="Download Capital Posture Template"
      />
    </main>
  );
}
