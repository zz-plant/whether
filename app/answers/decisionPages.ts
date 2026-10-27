import type { DecisionArea } from "../../lib/report/boundedDecisionRules";
import type { ContentCluster, ContentIntent } from "../../lib/contentMeasurement";
import type { AnswerPageData } from "../../lib/answerContentSource";
import { answerPageContent } from "../../lib/answerContentSource";

type AnswerCategory = "climate" | "decision" | "explanation";

export type DecisionPageDefinition = AnswerPageData & {
  mappedDecisionAreas: DecisionArea[];
};

const resolveIntentFromAudience = (audience: string): ContentIntent => {
  const normalizedAudience = audience.toLowerCase();

  if (normalizedAudience.includes("vc")) {
    return "vc-partner";
  }

  if (normalizedAudience.includes("board") || normalizedAudience.includes("chief of staff")) {
    return "board";
  }

  if (normalizedAudience.includes("cfo") || normalizedAudience.includes("finance")) {
    return "cfo";
  }

  return "vp-product";
};

export const getDecisionPageContentMeasurement = (
  page: Pick<DecisionPageDefinition, "category" | "audience">,
): { cluster: ContentCluster; intent: ContentIntent } => ({
  cluster:
    page.category === "decision"
      ? "tool"
      : page.category === "climate"
        ? "pain"
        : "authority",
  intent: resolveIntentFromAudience(page.audience),
});

const retiredAnswerSlugs = [
  "startup-market-outlook",
  "is-venture-funding-recovering",
  "tech-funding-environment",
  "startup-hiring-trends",
  "should-startups-slow-product-development",
  "product-strategy-in-a-risk-off-market",
  "how-to-operate-in-expansion-mode-startup",
  "startup-strategy-during-capital-scarcity",
  "product-strategy-during-downturn",
  "product-strategy-during-expansion",
  "when-to-expand-startup-hiring",
  "from-hiring-freeze-to-selective-offense",
  "startup-strategy-in-uncertain-markets",
  "when-should-we-run-a-bridge-round",
  "should-we-cut-contractor-spend-first",
  "how-macro-conditions-affect-startups",
  "how-interest-rates-affect-startups",
  "venture-funding-cycle-explained",
  "how-macro-affects-product-strategy",
] as const;

export const answerPages: DecisionPageDefinition[] = answerPageContent.map((page) => ({
  ...page,
  mappedDecisionAreas: [...page.mappedDecisionAreas] as DecisionArea[],
}));

const retiredAnswerSlugSet = new Set<string>(retiredAnswerSlugs);

export const isRetiredAnswerSlug = (slug: string) => retiredAnswerSlugSet.has(slug);


const HIGH_VALUE_STATIC_CATEGORIES: readonly AnswerCategory[] = ["decision", "climate"] as const;

const highValueStaticAnswerPages = answerPages.filter((page) =>
  HIGH_VALUE_STATIC_CATEGORIES.includes(page.category),
);
export const highValueStaticAnswerSlugs = highValueStaticAnswerPages.map((page) => page.slug);
export const highValueAnswerStaticParams = highValueStaticAnswerPages.map((page) => ({ slug: page.slug }));

const answerPageBySlug = new Map(answerPages.map((page) => [page.slug, page]));


export const findDecisionPage = (slug: string) => answerPageBySlug.get(slug);

/**
 * Finds the decision page matching an exact slug, a partial slug, or a natural language query.
 * Used by agent tool calling and API endpoints so callers can look up guidance by question or topic.
 */
export const matchDecisionPage = (query: string): DecisionPageDefinition | undefined => {
  /* Strip punctuation so a caller's natural-language question ("should we freeze
     hiring?") matches the same as its words would: the trailing "?" otherwise
     survives into "hiring?" and misses every slug, keyword, title and token. */
  const normalized = query.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;

  const direct = answerPageBySlug.get(normalized);
  if (direct) return direct;

  /* A natural-language phrase matches a slug fragment once spaces read as hyphens
     ("cut burn" → "when-should-startups-cut-burn"); the keyword and title checks below
     handle the rest of the natural language. */
  const hyphenated = normalized.replace(/\s+/g, "-");
  const slugMatch = answerPages.find((page) => page.slug === hyphenated || page.slug.includes(hyphenated));
  if (slugMatch) return slugMatch;

  const keywordMatch = answerPages.find((page) => page.keyword.toLowerCase().includes(normalized));
  if (keywordMatch) return keywordMatch;

  const titleMatch = answerPages.find((page) => page.title.toLowerCase().includes(normalized));
  if (titleMatch) return titleMatch;

  const tokens = normalized.split(/\s+/).filter((word) => word.length >= 3);
  if (tokens.length > 0) {
    return answerPages.find((page) => {
      const pageText = `${page.slug} ${page.keyword} ${page.title}`.toLowerCase();
      return tokens.every((token) => pageText.includes(token));
    });
  }

  return undefined;
};

/**
 * The decision answer that leads with this area, for a surface that offers one
 * answer per area (the homepage's first-visit picker). A page counts only when
 * the area is the first it maps: every page lists spending among its areas, and
 * "the answer about raising money" is the one whose subject is raising money.
 */
export const findLeadAnswerForArea = (area: DecisionArea) =>
  answerPages.find((page) => page.category === "decision" && page.mappedDecisionAreas[0] === area);
