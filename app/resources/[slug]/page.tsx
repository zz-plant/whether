import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  buildCanonicalUrl,
  buildPageImageUrl,
  buildPageMetadata,
  organizationName,
} from "../../../lib/seo";
import { buildAuthorSchema, buildPublisherSchema } from "../../../lib/publisher";
import { graph } from "../../../lib/seo/pageStructuredData";
import { revisitDecisionPhrase } from "../../../lib/report/decisionTransmissionCopy";
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
import { ActionLink } from "../../components/ui/actionLink";
import { JsonLdScript } from "../../components/jsonLdScript";

type Params = { slug: string };

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

/* This week's conditions and direction in one sentence, for a page that is not
   the brief: the articles' live-guidance block and the pillars' header both
   print it, so a reader arriving from search meets the current posture before
   the essay (AGENTS.md, "Thin SEO page"). */
const loadPostureLine = async (route: string) => {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  const { homeBriefModel, displayRegime } = snapshot;
  const direction =
    reportData.reportDynamics.directionLabel === "unavailable"
      ? ", with no comparison to last week available"
      : ` and ${reportData.reportDynamics.directionLabel} this week`;
  return {
    reportData,
    snapshot,
    postureSummary: `Conditions are ${displayRegime.label}${direction}; ${revisitDecisionPhrase(homeBriefModel.revisitDecisions)}.`,
  };
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
    const { reportData, snapshot, postureSummary } = await loadPostureLine(`/resources/${article.slug}`);
    const { homeBriefModel } = snapshot;
    const decisionAreas = getResourceArticleDecisionAreas(article);
    const mappedRules = homeBriefModel.decisionRules.filter((rule) => decisionAreas.includes(rule.area)).slice(0, 3);

    /* The link back to the brief is inside the article's live-guidance block.
       It was a pair of pills ("Start from Weekly Brief", "Return to Planning")
       rendered above the page's <main>, outside the landmark and off its column. */
    return (
      <ResourceArticlePage
        article={article}
        decisionArtifact={{
          decisionShiftSummary: homeBriefModel.decisionShiftSummary,
          postureSummary,
          mappedRules,
          freshnessLabel: reportData.fetchedAtLabel,
          recordDateLabel: reportData.recordDateLabel,
        }}
      />
    );
  }

  const page = findResourcePillarBySlug(slug);
  if (!page) notFound();

  const canonicalUrl = buildCanonicalUrl(`/resources/${page.slug}`);
  const articleSchema = graph([
    {
      "@type": "Article",
      headline: page.h1,
      description: page.description,
      keywords: [page.keyword, "board governance", "capital discipline"],
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      isPartOf: buildCanonicalUrl(page.canonicalPath),
      datePublished: page.publishedAt,
      dateModified: page.updatedAt,
      image: [buildPageImageUrl(page.title, page.description, { template: "guides", title: page.h1 })],
    },
  ]);


  const { reportData, postureSummary } = await loadPostureLine(`/resources/${page.slug}`);
  /* The guide's argument reads straight through; its reference material
     (checklists, agendas, appendices) follows, folded. Open, the reference ran
     to two-thirds of the page, and four of those sections were the same text
     on all three guides, 945 words printed on three URLs. They live on the
     parent guide now, and the other two link to them. */
  const argumentSections = page.sections.filter((section) => !section.reference);
  const referenceSections = page.sections.filter((section) => section.reference);
  const isParentGuide = `/resources/${page.slug}` === canonicalCapitalDisciplinePath;
  const relatedPages = [
    { href: canonicalCapitalDisciplinePath, label: "Capital discipline for venture-backed companies" },
    { href: "/resources/board-level-capital-posture-framework", label: "Board-level capital posture framework" },
    { href: "/resources/reversibility-as-governance", label: "Reversibility as governance" },
    { href: resourceSupportingPages.decisionShieldOverview.path, label: "Decision Shield overview" },
    { href: resourceSupportingPages.capitalPostureTemplate.path, label: "Capital Posture Template" },
  ].filter((link) => link.href !== `/resources/${page.slug}`);
  const linkClass = "text-sky-200 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100";
  const lexiconByIndex = ["capital-regime", "escalation-thresholds", "reversibility", "30-day-confirmation-logic"] as const;

  return (
    <ContentPageShell data-content-measurement-root={`/resources/${page.slug}`}>
      <ContentMeasurementTracker
        pagePath={`/resources/${page.slug}`}
        cluster={page.cluster}
        intent={page.intent}
      />
      <JsonLdScript data={articleSchema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: page.h1 },
        ]}
      />

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <p className="type-eyebrow">Governance guide</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.h1}</h1>
        <p className="text-sm text-slate-200">{page.description}</p>
        <p className="text-sm text-slate-300">{page.boardPackContext}</p>
        {/* The week the guide is being read in. Two pill buttons ("Start from
            Weekly Brief", "Return to Planning") sat above the title instead,
            and the page never said what conditions were. */}
        <div className="space-y-1 border-l-2 border-[var(--border-subtle)] pl-3">
          <p className="type-eyebrow">This week</p>
          <p className="text-sm text-slate-200">{postureSummary}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>As of {reportData.recordDateLabel}</span>
            <ActionLink href="/" variant="inline">Open this week&apos;s brief</ActionLink>
          </p>
        </div>
      </section>

      <nav aria-labelledby="pillar-index-heading" className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 id="pillar-index-heading" className="text-lg font-semibold text-slate-100">On this page</h2>
        <ol className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {argumentSections.map((section) => (
            <li key={section.heading}>
              <Link href={`#${buildSectionAnchor(section.heading)}`} className={linkClass}>
                {section.heading}
              </Link>
            </li>
          ))}
        </ol>
        {referenceSections.length > 0 ? (
          <p className="text-sm text-slate-300">
            <Link href="#reference" className={linkClass}>Reference</Link>: {referenceSections.map((section) => section.heading).join(" · ")}
          </p>
        ) : null}
      </nav>

      {argumentSections.map((section, index) => {
        const anchor = buildSectionAnchor(section.heading);
        const lexicon = lexiconByIndex[index];
        return (
          <section id={anchor} key={section.heading} className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
            <h2 className="text-xl font-semibold text-slate-100">{section.heading}</h2>
            {/* As written. A splitter re-cut every paragraph into two-sentence
                chunks on ".", "!" and "?", which broke quoted questions and
                printed a lone "," or "'" as a paragraph of its own. */}
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-slate-200">
                {paragraph}
              </p>
            ))}
            {lexicon ? <GovernanceLexiconCallout termSlug={lexicon} /> : null}
            {section.subsections?.map((subsection) => (
              <div key={subsection.heading} className="space-y-3 rounded-lg border border-slate-800/70 bg-slate-900/50 px-4 py-4">
                <h3 className="text-lg font-semibold text-slate-100">{subsection.heading.replace(/^H3:\s*/, "")}</h3>
                {subsection.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-200">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </section>
        );
      })}

      {/* After the argument, where a reader who finished it decides. It sat
          mid-page, which on the parent guide put it inside the reference. */}
      <PillarCtaBlock
        title="Use the board-ready template in your next operating review"
        body="Turn these standards into one document: reviewed weekly by the team, read monthly by the board."
        keyword={page.keyword}
        sourceSlug={page.slug}
        downloadLabel={page.midpointCtaLabel}
      />

      {referenceSections.length > 0 ? (
        <section id="reference" aria-labelledby="reference-heading" className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 id="reference-heading" className="text-xl font-semibold text-slate-100">Reference</h2>
          <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {referenceSections.map((section) => (
              <details id={buildSectionAnchor(section.heading)} key={section.heading} className="weather-auto-chevron py-3">
                <summary className="cursor-pointer select-none text-base font-semibold text-slate-100">{section.heading}</summary>
                <div className="space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-200">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {isParentGuide ? null : (
            <p className="text-sm text-slate-300">
              The board Q&amp;A, the anti-patterns, the 12-month cadence and the director checklist are in{" "}
              <Link href={`${canonicalCapitalDisciplinePath}#reference`} className={linkClass}>the parent guide</Link>.
            </p>
          )}
        </section>
      ) : null}

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Related pages</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {relatedPages.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>

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
