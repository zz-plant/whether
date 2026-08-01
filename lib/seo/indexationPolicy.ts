import type { Metadata } from "next";
import { isPostureArchiveSlug } from "../summary/postureArchive";

export const noindexRobots = {
  index: false,
  follow: true,
} satisfies NonNullable<Metadata["robots"]>;

export const withNoindex = <T extends Metadata>(metadata: T): T => ({
  ...metadata,
  robots: noindexRobots,
});

export const indexableAnswerSlugs = [
  "should-startups-hire-engineers-right-now",
  "should-startups-raise-capital-now",
  "when-should-startups-cut-burn",
  "is-it-risk-on-or-risk-off-for-startups",
  "startup-funding-climate-this-week",
  "should-we-freeze-or-selectively-hire",
  "how-to-brief-executives-on-market-conditions",
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
