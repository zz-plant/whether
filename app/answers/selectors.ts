import { answerPages } from "./decisionPages";
import { isIndexableAnswerSlug } from "../../lib/seo/indexationPolicy";

/**
 * The answers /resolve lists: the editorially ordered set first, then every
 * other indexable answer by title. Two indexable pages had no `featuredOrder`
 * and so were reachable only from sibling answers' related links — a page in
 * the sitemap that the hub above it never named.
 */
export const featuredAnswerPages = [
  ...answerPages
    .filter((page) => typeof page.featuredOrder === "number")
    .sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER)),
  ...answerPages
    .filter((page) => typeof page.featuredOrder !== "number" && isIndexableAnswerSlug(page.slug))
    .sort((a, b) => a.title.localeCompare(b.title)),
];
