import { WHETHER_AGENT_MANIFEST_PATH } from "../agent/discovery";
import { answerPageContent } from "../answerContentSource";
import { resourceArticles } from "../resourceArticles";
import { resourcePillarPages } from "../resourcesContent";
import { TERM_DEFINITIONS } from "../report/reportCopy";
import { canonicalPositioningLine } from "../seo";
import {
  isIndexableAnswerSlug,
  isIndexableResourceArticleSlug,
  isIndexableResourcePillarSlug,
} from "./indexationPolicy";

/**
 * The editorial corpus as one Markdown document.
 *
 * `llms.txt` is a map: it tells an agent which endpoints exist and which to
 * prefer. It carries no content, so an agent that wants to know what this site
 * actually says has to crawl sixteen HTML pages and strip them. `llms-full.txt`
 * is the convention's other half — the text itself, in one fetch.
 *
 * Built from the content sources rather than by rendering the routes. The pages
 * are data (`content/answers/pages.json`, `content/resources/*.json`) rendered
 * through builders, so assembling the Markdown from the same data costs one
 * import instead of thirty route renders at the edge, and cannot drift from what
 * the pages show because there is no second copy of the words.
 *
 * **Indexable pages only.** A page held back by the quality gates is held back
 * from a crawler too; publishing it here would be a side door around the
 * decision `indexationPolicy` exists to make. The weekly call is deliberately
 * absent as well — it changes under one URL and `/brief.md` already serves it,
 * dated, which is the copy a citation should point at.
 */

const heading = (level: number, text: string) => `${"#".repeat(level)} ${text}`;

const section = (lines: Array<string | null | undefined>) =>
  lines.filter((line): line is string => Boolean(line && line.trim())).join("\n\n");

export const buildLlmsFullCorpus = (baseUrl: string): string => {
  const answers = answerPageContent.filter((page) => isIndexableAnswerSlug(page.slug));
  const pillars = resourcePillarPages.filter((page) => isIndexableResourcePillarSlug(page.slug));
  const articles = resourceArticles.filter((page) => isIndexableResourceArticleSlug(page.slug));

  const preamble = section([
    heading(1, "Whether — full text corpus"),
    `Whether is weekly operating guidance for startup leaders. ${canonicalPositioningLine}`,
    [
      "This file is the site's stable editorial content in one document. It does **not** carry this week's guidance.",
      `That changes weekly under one URL: fetch ${baseUrl}/brief.md for it, or ${baseUrl}/api/agent for JSON.`,
      `A dated, citable copy of a past week lives at ${baseUrl}/brief/<year>-w<week>.`,
    ].join(" "),
    `Endpoint map: ${baseUrl}/llms.txt · Agent manifest: ${baseUrl}${WHETHER_AGENT_MANIFEST_PATH}`,
  ]);

  const answerBlock = answers.length === 0 ? null : section([
    heading(2, "Decision answers"),
    "Each answers one operating question. The reading behind them moves weekly; the framing does not.",
    ...answers.map((page) =>
      section([
        heading(3, page.title),
        `URL: ${baseUrl}/answers/${page.slug}`,
        `Question: ${page.keyword}`,
        `Audience: ${page.audience}`,
        `Short answer: ${page.shortAnswer}`,
        `What to do: ${page.directAnswer}`,
        heading(4, page.contextHeading),
        page.context,
        `Company inputs to check: ${page.companyInputs.join(" ")}`,
        `Decision note to complete: ${page.decisionNote}`,
        `References: ${page.supportingLinks.map((link) => `${link.label}: ${link.href.startsWith("/") ? `${baseUrl}${link.href}` : link.href}`).join("; ")}`,
        `Decision areas: ${page.mappedDecisionAreas.join(", ")}`,
      ]),
    ),
  ]);

  const pillarBlock = pillars.length === 0 ? null : section([
    heading(2, "Frameworks"),
    ...pillars.map((page) =>
      section([
        heading(3, page.h1 ?? page.title),
        `URL: ${baseUrl}${page.canonicalPath}`,
        page.description,
        ...(page.sections ?? []).map((entry) =>
          section([heading(4, entry.heading), ...(entry.paragraphs ?? [])]),
        ),
      ]),
    ),
  ]);

  const articleBlock = articles.length === 0 ? null : section([
    heading(2, "Articles"),
    ...articles.map((page) =>
      section([
        heading(3, page.title),
        `URL: ${baseUrl}/resources/${page.slug}`,
        page.description,
        /* `boardSummary` is `z.array(z.string())`, not a string: interpolated
           directly it rendered the bullets comma-joined into one line, which is
           what `restrict-template-expressions` was pointing at. Each bullet gets
           its own paragraph, the way every other multi-value field here does. */
        page.boardSummary?.length ? section([heading(4, "Board summary"), ...page.boardSummary]) : null,
        ...(page.sections ?? []).map((entry) =>
          section([heading(4, entry.heading), ...(entry.paragraphs ?? [])]),
        ),
        ...(page.faqs ?? []).map((faq) => section([heading(4, faq.question), faq.answer])),
      ]),
    ),
  ]);

  /* The vocabulary, because every other block above uses it. An agent reading
     "funding pressure 77" with no scale cannot do anything with the number. */
  const termsBlock = section([
    heading(2, "Terms"),
    ...TERM_DEFINITIONS.map((entry) => section([heading(3, entry.term), entry.summary])),
  ]);

  return `${section([preamble, answerBlock, pillarBlock, articleBlock, termsBlock])}\n`;
};
