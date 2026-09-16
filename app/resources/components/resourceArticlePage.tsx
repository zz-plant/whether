import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
} from "../../../lib/seo";
import { buildAuthorSchema } from "../../../lib/publisher";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { decisionAreaLabel, type BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import type { ResourceArticle, ResourceArticleEmbed, ResourceArticleSection } from "../../../lib/resourceArticles";
import { CopyAnchorButton } from "./copyAnchorButton";
import { isIndexableResourceArticleSlug, noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { JsonLdScript } from "../../components/jsonLdScript";

const boardFrameworkPath = "/resources/board-level-capital-posture-framework";

const sharedDeepDiveSections: ResourceArticleSection[] = [
  {
    heading: "Implementation operating cadence (weeks 1-12)",
    paragraphs: [
      "Week 1 should produce one source-of-truth decision inventory. List every meaningful commitment across hiring, roadmap, vendor spend, and channel investment. For each item, document owner, expected business effect, time-to-evidence, and reversal path. Most organizations skip this step because it feels administrative, but without it you cannot prioritize risk. In high-pressure periods, invisible commitments become the real source of runway erosion because they continue by inertia. By forcing a complete inventory early, leadership converts diffuse anxiety into a tractable operating map.",
      "Weeks 2 through 4 should establish threshold design and meeting cadence. Select a small set of indicators that are decision-relevant and resistant to vanity inflation: retention quality, conversion efficiency, delivery reliability, burn multiple movement, and forecast error. Then assign explicit breach duration rules. A single weak week should trigger diagnostic review, not wholesale posture change. Two or more persistent breaches should trigger escalation. The discipline here is consistency, not prediction perfection. Consistent trigger application is what allows teams to make hard calls without re-litigating governance every cycle.",
      "Weeks 5 through 8 should focus on tranche execution. Every RISKY item should move in bounded increments with kill criteria, while SAFE items continue through a lighter approval path. This period is where most teams discover mismatches between declared posture and practical behavior. Expect to adjust owner maps, escalation SLAs, and reporting format. Weeks 9 through 12 should emphasize retrospective quality: which triggers fired, which decisions reversed, how quickly rollback happened, and what friction slowed action. The board does not need perfect outcomes; it needs evidence that the operating system is becoming more reliable under stress.",
    ],
  },
  {
    heading: "Failure modes to avoid while pressure is high",
    paragraphs: [
      "Failure mode one is precision theater: adding more dashboards, more scoring columns, and more committees without improving decision speed or quality. Complexity often masquerades as rigor. A good governance system should lower ambiguity and reduce meeting debt. If your process takes longer each week while confidence remains flat, simplify aggressively. Keep the metric set short, the escalation rules explicit, and the artifact format reusable. Leadership attention is a scarce resource; spending it on reporting choreography instead of corrective action is a hidden cost of poor posture design.",
      "Failure mode two is exception creep. Teams begin with clear SAFE / RISKY / DANGEROUS classes, then gradually grant ad hoc exceptions because each request sounds urgent in isolation. Over time, policy dissolves while everyone still claims discipline. Prevent this by forcing all exceptions into the same log with business rationale, owner, expiry date, and review checkpoint. Expired exceptions should auto-escalate rather than silently persist. This one habit dramatically improves board trust because it shows not only what was approved but also how temporary risk decisions are being managed.",
      "Failure mode three is delayed reversal. Leaders often wait for certainty before stopping a decision stream, especially when reputational stakes are high. In tightening conditions, delayed reversals are usually more expensive than imperfect reversals. Build social permission for early correction: separate process quality from outcome quality, publish reversal learnings without blame language, and reward teams for disciplined stops that preserve capital for better bets. The organization that can reverse calmly and quickly has a structural advantage over one that only knows how to commit and defend.",
    ],
  },
];

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

export const buildResourceArticleMetadata = (article: ResourceArticle): Metadata =>
  ({
    ...buildPageMetadata({
      title: article.title,
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

export const composeArticleSections = (article: ResourceArticle) =>
  article.includeSharedDeepDive ? [...article.sections, ...sharedDeepDiveSections] : article.sections;

type ResourceDecisionArtifact = {
  decisionShiftSummary: string;
  postureSummary: string;
  mappedRules: BoundedDecisionRule[];
  freshnessLabel: string;
  citation: string;
};

export function ResourceArticlePage({ article, decisionArtifact }: { article: ResourceArticle; decisionArtifact?: ResourceDecisionArtifact }) {
  const canonicalUrl = buildCanonicalUrl(`/resources/${article.slug}`);
  const pagePath = `/resources/${article.slug}`;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: buildAuthorSchema(),
    publisher: { "@type": "Organization", name: organizationName },
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    keywords: [article.keyword, "capital posture", "board memo"],
  };

  return (
    <main
      className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px]"
      data-content-measurement-root={pagePath}
    >
      <ContentMeasurementTracker pagePath={pagePath} cluster={article.cluster} intent={article.intent} />
      <JsonLdScript data={articleSchema} />
      <JsonLdScript data={faqSchema} />

      <div className="space-y-6 print:text-black">
        <Breadcrumbs
          className="print:hidden"
          items={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: article.title },
          ]}
        />
        {decisionArtifact ? (
          <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
            <p className="type-eyebrow">This week&apos;s call</p>
            <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">What the live call says before you read on</h2>
            <p className="text-sm text-slate-200 print:text-slate-700">{decisionArtifact.postureSummary}</p>
            <p className="text-sm text-slate-200 print:text-slate-700">{decisionArtifact.decisionShiftSummary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {decisionArtifact.mappedRules.map((rule) => (
                <article key={rule.area} className="weather-surface space-y-2 px-4 py-4 text-sm">
                  <p className="type-eyebrow text-sky-200">Bounded rule · {decisionAreaLabel(rule.area)}</p>
                  <p className="font-semibold text-slate-100">{rule.recommendation}</p>
                  <p className="text-xs text-rose-200">{publicDecisionLabels.threshold}: {rule.pauseTrigger}</p>
                  <p className="text-xs text-emerald-200">{publicDecisionLabels.reversal}: {rule.resumeTrigger}</p>
                </article>
              ))}
            </div>
            <p className="text-xs text-slate-400">{decisionArtifact.citation} · Freshness: {decisionArtifact.freshnessLabel}</p>
          </section>
        ) : null}

        <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
          <p className="type-eyebrow">Operating brief</p>
          <h1 className="text-2xl font-semibold text-slate-100 print:text-slate-900 sm:text-3xl">{article.title}</h1>
          <p className="text-sm text-slate-200 print:text-slate-700">{article.description}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/resources/decision-shield-overview" className="text-sky-200 underline underline-offset-4">Decision Shield</Link>
            <span className="text-slate-400">•</span>
            <Link href="/resources/capital-posture-template" className="text-sky-200 underline underline-offset-4">Capital Posture Template</Link>
          </div>
        </section>

        <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
          <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">Summary to forward to the board</h2>
          <ul className="space-y-2 text-sm text-slate-200 print:text-slate-700">
            {article.boardSummary.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>

        {composeArticleSections(article).map((section) => {
          const anchor = buildAnchor(section.heading);
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
          <Link href={article.toolLink.href as Route} className="weather-button inline-flex w-full items-center justify-center" data-conversion-event="download">
            {article.toolLink.label}
          </Link>
          <Link href="/resources/decision-shield-overview" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100" data-conversion-event="request">
            Open Decision Shield
          </Link>
          <div className="space-y-2 border-t border-slate-700/80 pt-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">Related pages</p>
            <Link href={canonicalPillarPath} className="block text-sky-200 underline underline-offset-4">Capital Discipline pillar</Link>
            <Link href={boardFrameworkPath} className="block text-sky-200 underline underline-offset-4">Board-level Capital Posture Framework</Link>
            <Link href={article.toolLink.href as Route} className="block text-sky-200 underline underline-offset-4">Tool page</Link>
          </div>
        </div>
      </aside>
    </main>
  );
}
