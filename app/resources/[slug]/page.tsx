import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
} from "../../../lib/seo";
import { buildAuthorSchema, buildPublisherSchema } from "../../../lib/publisher";
import {
  canonicalCapitalDisciplinePath,
  findResourcePillarBySlug,
  resourcePillarPages,
  resourceSupportingPages,
} from "../../../lib/resourcesContent";
import { GovernanceLexiconCallout } from "../components/governanceLexiconCallout";
import { PillarCtaBlock } from "../components/pillarCtaBlock";
import {
  buildDownloadableResourceMetadata,
  DownloadableResourcePage,
} from "../components/downloadableResourcePage";
import { buildResourceArticleMetadata, ResourceArticlePage } from "../components/resourceArticlePage";
import {
  findResourceArticleBySlug,
  getResourceArticleDecisionAreas,
  isRetiredResourceArticleSlug,
} from "../../../lib/resourceArticles";
import {
  findDownloadableResourceBySlug,
  downloadableResources,
} from "../../../lib/downloadableResources";
import { resourceArticles } from "../../../lib/resourceArticles";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import {
  isIndexableResourceArticleSlug,
  isIndexableResourcePillarSlug,
  noindexRobots,
} from "../../../lib/seo/indexationPolicy";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { JsonLdScript } from "../../components/jsonLdScript";

type Params = { slug: string };
const RESOURCES_RETURN_HREF = "/operate" as const;
const RESOURCES_RETURN_LABEL = "Return to Planning";

export const revalidate = 21600;

/*
 * No `resourceSupportingPages` here. Three of the four are downloadables, which
 * the next line already emits; the fourth — decision-shield-overview — is
 * neither a pillar, a downloadable nor an article, so this route reaches
 * `notFound()` for it. Its own static segment shadows the dynamic one, which is
 * why nothing showed. Emitting a slug this route cannot render is a trap for
 * whoever next tries to delete that sibling on the belief that `[slug]` covers
 * it: the page would 404 and the build would not object.
 */
export function generateStaticParams(): Array<{ slug: string }> {
  return [
    ...resourcePillarPages.map((page) => ({ slug: page.slug })),
    ...Object.keys(downloadableResources).map((slug) => ({ slug })),
    ...resourceArticles.map((article) => ({ slug: article.slug })),
  ].filter((entry): entry is { slug: string } => entry.slug.length > 0);
}

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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  if (isRetiredResourceArticleSlug(slug)) {
    return {
      ...buildPageMetadata({
        title: "Governance resource moved",
        description: "This resource has been retired. The remaining guides are on the Resources page.",
        path: "/resources",
        imageAlt: "Whether resources",
      }),
      robots: noindexRobots,
    };
  }
  const downloadableResource = findDownloadableResourceBySlug(slug);
  if (downloadableResource) {
    return {
      ...buildDownloadableResourceMetadata(downloadableResource.metadata),
      robots: noindexRobots,
    };
  }

  const article = findResourceArticleBySlug(slug);
  if (article) {
    const metadata = buildResourceArticleMetadata(article);
    if (!isIndexableResourceArticleSlug(article.slug)) {
      metadata.robots = noindexRobots;
    }
    return metadata;
  }

  const page = findResourcePillarBySlug(slug);
  if (!page) return {};

  const metadata = buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/resources/${page.slug}`,
    imageAlt: page.h1,
    imageParams: {
      template: "guides",
      title: page.h1,
    },
  });

  if (!isIndexableResourcePillarSlug(page.slug)) {
    metadata.robots = noindexRobots;
  }

  return metadata;
}

export default async function ResourcePillarPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (isRetiredResourceArticleSlug(slug)) {
    permanentRedirect("/planning#ops-export-briefs");
  }
  const downloadableResource = findDownloadableResourceBySlug(slug);
  if (downloadableResource) {
    return <DownloadableResourcePage config={downloadableResource} />;
  }

  const article = findResourceArticleBySlug(slug);
  if (article) {
    const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: `/resources/${article.slug}` });
    const { homeBriefModel, displayRegime, callCitation } = snapshot;
    const decisionAreas = getResourceArticleDecisionAreas(article);
    const mappedRules = homeBriefModel.decisionRules.filter((rule) => decisionAreas.includes(rule.area)).slice(0, 3);

    return (
      <>
        <section className="mx-auto mt-6 flex w-full max-w-4xl flex-wrap gap-2 px-4 sm:px-6">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Start from Weekly Brief
          </Link>
          <Link
            href={RESOURCES_RETURN_HREF}
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
          >
            {RESOURCES_RETURN_LABEL}
          </Link>
        </section>
        <ResourceArticlePage
          article={article}
          decisionArtifact={{
            decisionShiftSummary: homeBriefModel.decisionShiftSummary,
            postureSummary: `Conditions are ${displayRegime.label}${reportData.reportDynamics.directionLabel === "unavailable" ? ", with no comparison to last week available" : ` and ${reportData.reportDynamics.directionLabel} this week`}; ${homeBriefModel.revisitDecisions ? "recheck last week's approvals" : "last week's approvals stand"}.`,
            mappedRules,
            freshnessLabel: reportData.fetchedAtLabel,
            citation: callCitation,
          }}
        />
      </>
    );
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
    author: buildAuthorSchema(),
    publisher: buildPublisherSchema(organizationName),
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
    <ContentPageShell data-content-measurement-root={`/resources/${page.slug}`}>
      <ContentMeasurementTracker
        pagePath={`/resources/${page.slug}`}
        cluster={page.cluster}
        intent={page.intent}
      />
      <JsonLdScript data={articleSchema} />
      <JsonLdScript data={organizationSchema} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: page.h1 },
        ]}
      />

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Start from Weekly Brief
          </Link>
          <Link
            href={RESOURCES_RETURN_HREF}
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
          >
            {RESOURCES_RETURN_LABEL}
          </Link>
        </div>
        <p className="type-eyebrow">Governance guide</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.h1}</h1>
        <p className="text-sm text-slate-200">{page.description}</p>
        <p className="text-sm text-slate-300">{page.boardPackContext}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
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

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Related pages</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><Link href={canonicalCapitalDisciplinePath} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Capital discipline for venture-backed companies</Link></li>
          <li><Link href="/resources/board-level-capital-posture-framework" className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Board-level capital posture framework{page.slug === "board-level-capital-posture-framework" ? " (this page)" : ""}</Link></li>
          <li><Link href={resourceSupportingPages.decisionShieldOverview.path} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Decision Shield overview</Link></li>
          <li><Link href={resourceSupportingPages.capitalPostureTemplate.path} className="text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100">Capital Posture Template</Link></li>
        </ul>
      </section>

      {page.sections.map((section, index) => {
        const anchor = buildSectionAnchor(section.heading);

        return (
          <section id={anchor} key={section.heading} className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
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
                body="Turn these standards into one document: reviewed weekly by the team, read monthly by the board."
                keyword={page.keyword}
                sourceSlug={page.slug}
                downloadLabel={page.midpointCtaLabel}
              />
            ) : null}

            <p className="pt-1 type-eyebrow">
              <Link href="#main-content" className="text-slate-300 underline decoration-slate-500/60 underline-offset-4 hover:text-slate-100">
                Back to top
              </Link>
            </p>
          </section>
        );
      })}

      <PillarCtaBlock
        title="Need the board pack itself?"
        body="Ask for a walkthrough of the board pack."
        keyword={page.keyword}
        sourceSlug={page.slug}
        downloadLabel="Download Capital Posture Template"
      />
    </ContentPageShell>
  );
}
