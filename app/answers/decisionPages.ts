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

const normalizeQuestion = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu, " ").replace(/\s+/g, " ").trim();

const answerPageByQuestion = new Map(answerPages.flatMap((page) =>
  [page.title, page.keyword, ...page.askedAs].map((question) => [normalizeQuestion(question), page] as const),
));

/* Words that carry no topic: a question's grammar, and the words every answer shares
   ("startups", "now", "this week"). Left in, they would let "should we raise" match any
   page whose title starts with "Should". */
const QUERY_STOPWORDS = new Set([
  "a", "about", "am", "an", "and", "any", "are", "as", "at", "be", "can", "company", "could", "do", "does",
  "for", "from", "get", "given", "good", "how", "i", "if", "in", "is", "it", "its", "me", "mean", "my",
  "now", "of", "on", "or", "our", "right", "should", "so", "startup", "startups", "still", "that", "the",
  "this", "time", "to", "us", "wait", "we", "week", "what", "when", "will", "with", "would", "yet", "you",
]);

/* One spelling per word, so "hiring", "hires" and "hire" are one term, and "engineering" and
   "engineers" another. Crude on purpose: both sides of a match go through it, so it only has to
   be consistent, not correct English. It leaves "-er" alone, which would make "engineer" "engine". */
const stemQueryWord = (word: string) => {
  const suffix = ["ing", "ies", "es", "ed", "s"].find(
    (candidate) => word.endsWith(candidate) && word.length - candidate.length >= 3,
  );
  let stem = suffix ? word.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "") : word;
  if (stem.length > 3 && stem.endsWith("e")) stem = stem.slice(0, -1);
  return stem.replace(/([bdgmnpt])\1$/, "$1");
};

/** Each topic word in the text, stemmed, with how many times it appears. */
const queryTerms = (text: string) => {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word.length === 0 || QUERY_STOPWORDS.has(word)) continue;
    const term = stemQueryWord(word);
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
};

const answerPageTerms = answerPages.map((page) => ({
  page,
  terms: queryTerms([page.slug, page.keyword, page.title, ...page.askedAs].join(" ")),
  about: queryTerms([page.slug, page.keyword, page.title].join(" ")),
}));

/* How much a term says about which page is meant: "hire" is on four pages and says less
   than "runway", which is on one. */
const pagesWithTerm = new Map<string, number>();
for (const { terms } of answerPageTerms) {
  for (const term of terms.keys()) pagesWithTerm.set(term, (pagesWithTerm.get(term) ?? 0) + 1);
}
const termWeight = (term: string) => Math.log(1 + answerPages.length / (pagesWithTerm.get(term) ?? answerPages.length));

/**
 * Finds the decision page matching a slug, part of one, or a question as someone asked it.
 * Used by agent tool calling and API endpoints so callers can look up guidance by question or topic.
 *
 * An agent passes the user's own words ("should I hire a second engineer?"), which name a
 * topic without repeating a page's title. Until 2026-10-28 a question matched only when every
 * word in it appeared in one page's slug, keyword or title, and 10 of 11 such questions were
 * refused. Each page now carries the ways people ask it (`askedAs`); an exact question goes to
 * its declared page before topic scoring. Other questions go to a page that shares two of their
 * topic words, or more than half their weight in a word of its own title, the one most about those words when several do: "should we hire" is the
 * hiring-freeze answer, which says "hire" most, not the first salesperson's, whose title happens
 * to begin that way. A slug's words are among its terms, so
 * part of a slug ("cut-burn") matches the same way. A question no page shares that much with
 * ("bridge round") is refused, with the list of what there is.
 */
export const matchDecisionPage = (query: string): DecisionPageDefinition | undefined => {
  /* Strip punctuation so a caller's natural-language question ("should we freeze
     hiring?") matches the same as its words would: the trailing "?" otherwise
     survives into "hiring?" and misses every slug and term. */
  const normalized = normalizeQuestion(query);
  if (!normalized) return undefined;

  const direct = answerPageBySlug.get(normalized) ?? answerPageByQuestion.get(normalized);
  if (direct) return direct;

  /* Only words some page uses count: "two", "14" and "quarter" in "should I hire two more
     engineers this quarter with 14 months of runway" say nothing about which page is meant,
     and an agent adds the company's details to the question as often as not. */
  const asked = [...queryTerms(normalized).keys()].filter((term) => pagesWithTerm.has(term));
  const askedWeight = asked.reduce((sum, term) => sum + termWeight(term), 0);
  if (askedWeight === 0) return undefined;

  let best: { page: DecisionPageDefinition; rank: number } | undefined;
  for (const { page, terms, about } of answerPageTerms) {
    const shared = asked.filter((term) => terms.has(term));
    const sharedWeight = shared.reduce((sum, term) => sum + termWeight(term), 0);
    /* One shared word has to be what the page is about, not a way someone once asked it: "start"
       in a phrasing sent "should I start a company now" to the new-product-lines answer, and
       "offer" sent a question about a customer's discount to compensation. */
    if (shared.length < 2 && (sharedWeight / askedWeight <= 0.5 || !shared.every((term) => about.has(term)))) continue;
    const rank = shared.reduce((sum, term) => sum + termWeight(term) * (1 + Math.log(terms.get(term) ?? 1)), 0);
    if (rank > (best?.rank ?? 0)) best = { page, rank };
  }
  return best?.page;
};

/**
 * The decision answer that leads with this area, for a surface that offers one
 * answer per area (the homepage's first-visit picker). A page counts only when
 * the area is the first it maps: every page lists spending among its areas, and
 * "the answer about raising money" is the one whose subject is raising money.
 */
export const findLeadAnswerForArea = (area: DecisionArea) =>
  answerPages.find((page) => page.category === "decision" && page.mappedDecisionAreas[0] === area);
