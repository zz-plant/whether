import type { Metadata } from "next";
import Link from "next/link";
import {
  buildCanonicalUrl,
  buildPageImageUrl,
  buildPageMetadata,
  organizationName,
  withUpdatedMarker,
} from "../../../lib/seo";
import { formatDateUTC } from "../../../lib/formatters";
import { buildAuthorSchema, buildPublisherSchema } from "../../../lib/publisher";
import { graph } from "../../../lib/seo/pageStructuredData";
import { formatDecisionReversal, formatDecisionThreshold, publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { decisionAreaLabel, type BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import type { ResourceArticle, ResourceArticleEmbed } from "../../../lib/resourceArticles";
import { CopyAnchorButton } from "./copyAnchorButton";
import { isIndexableResourceArticleSlug, noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";
import { JsonLdScript } from "../../components/jsonLdScript";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { ActionLink } from "../../components/ui/actionLink";

const boardFrameworkPath = "/resources/board-level-capital-posture-framework";

const canonicalPillarPath = "/resources/capital-discipline-venture-backed-companies";

const buildAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const iframeSrcPattern = /<iframe[^>]*\ssrc=(["'])(.*?)\1/i;
const iframeTitlePattern = /<iframe[^>]*\stitle=(["'])(.*?)\1/i;

const normalizeEmbedUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const resolveImportedEmbed = (embed: ResourceArticleEmbed): { src: string; title: string; caption?: string; provider?: string } | null => {
  const directSrc = normalizeEmbedUrl(embed.src);
  const directTitle = embed.title?.trim();
  if (directSrc) {
    return {
      src: directSrc,
      title: directTitle && directTitle.length > 0 ? directTitle : "Embedded content",
      caption: embed.caption,
      provider: embed.provider,
    };
  }

  if (!embed.html) {
    return null;
  }

  const srcMatch = embed.html.match(iframeSrcPattern);
  const parsedSrc = normalizeEmbedUrl(srcMatch?.[2]);
  if (!parsedSrc) {
    return null;
  }

  const importedTitle = embed.html.match(iframeTitlePattern)?.[2]?.trim();

  return {
    src: parsedSrc,
    title: directTitle && directTitle.length > 0
      ? directTitle
      : importedTitle && importedTitle.length > 0
        ? importedTitle
        : "Embedded content",
    caption: embed.caption,
    provider: embed.provider,
  };
};

/* The guide's own `updatedAt` dates the title, the line under the heading, the
   sitemap and `dateModified`, so all four move together when the copy does. */
export const buildResourceArticleMetadata = (article: ResourceArticle): Metadata =>
  ({
    ...buildPageMetadata({
      title: withUpdatedMarker(article.title, article.updatedAt),
      description: article.description,
      path: `/resources/${article.slug}`,
      imageAlt: article.title,
      imageParams: {
        template: "guides",
        title: article.title,
      },
    }),
    ...(isIndexableResourceArticleSlug(article.slug) ? {} : { robots: noindexRobots }),
  });

type ResourceDecisionArtifact = {
  decisionShiftSummary: string;
  postureSummary: string;
  mappedRules: BoundedDecisionRule[];
  freshnessLabel: string;
  /** The reading's own date; the paste-ready citation printed here ran to three lines of URLs. */
  recordDateLabel: string;
  /** The answer pages that cite this guide: the same question, with this week's guidance. */
  weeklyAnswers?: Array<{ href: string; title: string }>;
};

export function ResourceArticlePage({ article, decisionArtifact }: { article: ResourceArticle; decisionArtifact?: ResourceDecisionArtifact }) {
  const canonicalUrl = buildCanonicalUrl(`/resources/${article.slug}`);
  const pagePath = `/resources/${article.slug}`;
  /* The article and its FAQ in one graph, after the site node, where they were two documents. */
  const structuredData = graph([
    {
      "@type": "Article",
      headline: article.title,
      description: article.description,
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      mainEntityOfPage: canonicalUrl,
      url: canonicalUrl,
      keywords: [article.keyword, "capital posture", "board memo"],
      // Google's Article rich result asks for both dates and an image; the page
      // published neither, so it was eligible for a plain blue link only.
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      image: [buildPageImageUrl(article.title, article.description, { template: "guides", title: article.title })],
    },
    {
      "@type": "FAQPage",
      mainEntity: article.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ]);

  return (
    <ContentPageShell measure="wide" data-content-measurement-root={pagePath}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ContentMeasurementTracker pagePath={pagePath} cluster={article.cluster} intent={article.intent} />
        <JsonLdScript data={structuredData} />

        <div className="space-y-6 print:text-black">
          <Breadcrumbs
            className="print:hidden"
            items={toVisibleBreadcrumbs(
              buildGroupBreadcrumbs(`/resources/${article.slug}`, [{ name: article.title, path: `/resources/${article.slug}` }]),
            )}
          />
          {decisionArtifact ? (
            <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">This week’s guidance</h2>
              <p className="text-sm text-slate-200 print:text-slate-700">{decisionArtifact.postureSummary}</p>
              <p className="text-sm text-slate-200 print:text-slate-700">{decisionArtifact.decisionShiftSummary}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {decisionArtifact.mappedRules.map((rule) => (
                  <article key={rule.area} className="weather-surface space-y-2 px-4 py-4 text-sm">
                    <p className="type-eyebrow">This week&apos;s rule · {decisionAreaLabel(rule.area)}</p>
                    <p className="font-semibold text-slate-100">{rule.recommendation}</p>
                    <p className="text-xs text-rose-200">{publicDecisionLabels.threshold}: {formatDecisionThreshold(rule.pauseTrigger)}</p>
                    <p className="text-xs text-emerald-200">{publicDecisionLabels.reversal}: {formatDecisionReversal(rule.resumeTrigger)}</p>
                  </article>
                ))}
              </div>
              {decisionArtifact.weeklyAnswers && decisionArtifact.weeklyAnswers.length > 0 ? (
                <p className="text-sm text-slate-200 print:text-slate-700">
                  Questions answered this week:{" "}
                  {decisionArtifact.weeklyAnswers.map((answer, index) => (
                    <span key={answer.href}>
                      {index > 0 ? " · " : null}
                      <Link href={answer.href} className="text-sky-200 underline underline-offset-4">{answer.title}</Link>
                    </span>
                  ))}
                </p>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span>Data as of {decisionArtifact.recordDateLabel} · checked {decisionArtifact.freshnessLabel}</span>
                <ActionLink href="/" variant="inline" className="print:hidden">Open this week&apos;s brief</ActionLink>
              </p>
            </section>
          ) : null}

          <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
            <h1 className="text-2xl font-semibold text-slate-100 print:text-slate-900 sm:text-3xl">{article.title}</h1>
            <p className="text-xs text-slate-400">
              Updated <time dateTime={article.updatedAt}>{formatDateUTC(article.updatedAt)}</time>
            </p>
            <p className="text-sm text-slate-200 print:text-slate-700">{article.description}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/resources/decision-shield-overview" className="text-sky-200 underline underline-offset-4">Decision Shield</Link>
              <span className="text-slate-400">•</span>
              <Link href="/resources/capital-posture-template" className="text-sky-200 underline underline-offset-4">Capital Planning Template</Link>
            </div>
          </section>

          <section id="board-facing-summary-block-forwardable" className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
            <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">Summary to forward</h2>
            <ul className="space-y-2 text-sm text-slate-200 print:text-slate-700">
              {article.boardSummary.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </section>

          {article.sections.map((section) => {
            const anchor = section.anchor ?? buildAnchor(section.heading);
            return (
              <section id={anchor} key={section.heading} className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-100 print:text-slate-900">{section.heading}</h2>
                  <CopyAnchorButton anchor={anchor} />
                </div>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-200 print:text-slate-700">{paragraph}</p>)}
                {section.embeds?.map((embed, index) => {
                  const importedEmbed = resolveImportedEmbed(embed);
                  if (!importedEmbed) {
                    return null;
                  }

                  return (
                    <figure key={`${section.heading}-embed-${importedEmbed.src}-${index}`} className="space-y-3">
                      <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/70 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
                        <div className="aspect-video">
                          <iframe
                            src={importedEmbed.src}
                            title={importedEmbed.title}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"
                            className="h-full w-full border-0"
                          />
                        </div>
                      </div>
                      {importedEmbed.provider || importedEmbed.caption ? (
                        <figcaption className="text-xs text-slate-400 print:text-slate-400">
                          {importedEmbed.provider ? `${importedEmbed.provider} embed` : "Imported embed"}
                          {importedEmbed.caption ? ` · ${importedEmbed.caption}` : ""}
                        </figcaption>
                      ) : null}
                    </figure>
                  );
                })}
              </section>
            );
          })}

          <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
            <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">FAQ</h2>
            {article.faqs.map((faq) => (
              <div key={faq.question} className="space-y-1 border-t border-slate-700/80 pt-3 first:border-0 first:pt-0">
                <h3 className="text-sm font-semibold text-slate-100 print:text-slate-900">{faq.question}</h3>
                <p className="text-sm text-slate-200 print:text-slate-700">{faq.answer}</p>
              </div>
            ))}
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="weather-panel sticky top-24 space-y-3 px-5 py-5 print:hidden">
            <h2 className="text-sm type-eyebrow text-slate-300">Next action</h2>
            <Link href={article.toolLink.href} className="weather-button inline-flex w-full items-center justify-center" data-conversion-event="download">
              {article.toolLink.label}
            </Link>
            <Link href="/resources/decision-shield-overview" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100" data-conversion-event="request">
              Open Decision Shield
            </Link>
            <div className="space-y-2 border-t border-slate-700/80 pt-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Related pages</p>
              <Link href={canonicalPillarPath} className="block text-sky-200 underline underline-offset-4">Capital discipline for venture-backed companies</Link>
              <Link href={boardFrameworkPath} className="block text-sky-200 underline underline-offset-4">Board-level Capital Posture Framework</Link>
              <Link href={article.toolLink.href} className="block text-sky-200 underline underline-offset-4">Tool page</Link>
            </div>
          </div>
        </aside>
      </div>
    </ContentPageShell>
  );
}
