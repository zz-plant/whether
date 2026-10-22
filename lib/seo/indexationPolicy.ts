import type { Metadata } from "next";
import { isPostureArchiveSlug } from "../summary/postureArchive";

export const noindexRobots = {
  index: false,
  follow: true,
} satisfies NonNullable<Metadata["robots"]>;

/**
 * The answer pages submitted for indexing.
 *
 * This list and the quality gate had drifted apart: the gate blocked five of
 * eleven pages with `cluster-duplicate-no-distinct-datapoint-or-interpretation`,
 * and two of those five were on this list — allowlisted here and `noindex` at
 * render, which is the worst of the three possible states. The cause was
 * structural rather than editorial (five decision areas, eight decision-cluster
 * pages, an interpretation label built only from the first mapped rule), and is
 * fixed in `buildAnswerInterpretationLabel`. All eleven now pass, so the list is
 * the full set and `tests/answerIndexationPolicy.test.ts` keeps the two in
 * agreement rather than trusting the next editor to remember.
 */
export const indexableAnswerSlugs = [
  "startup-funding-climate-this-week",
  "is-it-risk-on-or-risk-off-for-startups",
  "should-startups-hire-engineers-right-now",
  "should-startups-slow-roadmap-expansion",
  "should-startups-raise-capital-now",
  "when-should-startups-cut-burn",
  "should-we-freeze-or-selectively-hire",
  "should-we-expand-sales-headcount-now",
  "should-we-delay-new-product-lines",
  "how-fast-should-we-scale-go-to-market",
  "how-to-brief-executives-on-market-conditions",
  "how-much-runway-should-we-have-before-we-raise",
  "what-should-startups-do-before-a-downturn",
  "should-we-hire-our-first-salesperson-now",
] as const;

const indexableAnswerSlugSet = new Set<string>(indexableAnswerSlugs);

export const isIndexableAnswerSlug = (slug: string) => indexableAnswerSlugSet.has(slug);

export const indexableResourceArticleSlugs = [
  "should-we-freeze-hiring-high-interest-rate-environment",
  "how-much-runway-do-we-need-tightening-market",
] as const;

const indexableResourceArticleSlugSet = new Set<string>(indexableResourceArticleSlugs);

export const isIndexableResourceArticleSlug = (slug: string) =>
  indexableResourceArticleSlugSet.has(slug);

/**
 * Posture archive periods are closed historical records. They carry no freshness
 * risk, so the generated set is indexable in full rather than allowlisted by hand.
 */
export const isIndexableArchivePeriodSlug = (slug: string) => isPostureArchiveSlug(slug);

export const indexableResourcePillarSlugs = [
  "capital-discipline-venture-backed-companies",
  "board-level-capital-posture-framework",
  "reversibility-as-governance",
] as const;

const indexableResourcePillarSlugSet = new Set<string>(indexableResourcePillarSlugs);

export const isIndexableResourcePillarSlug = (slug: string) =>
  indexableResourcePillarSlugSet.has(slug);
