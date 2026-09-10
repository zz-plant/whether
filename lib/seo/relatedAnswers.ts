import type { DecisionArea } from "../report/boundedDecisionRules";

/**
 * Which other answers belong beside this one.
 *
 * The previous rule filtered for a *different* category and took the first three
 * in file order. With a corpus of eight `decision` pages, two `climate` and one
 * `explanation`, that made the block a constant: every decision page emitted the
 * same three links, because those were the only three candidates that existed.
 * Eleven pages, one related-links block, and no topical signal in any of them —
 * while `mappedDecisionAreas`, `thresholdFocus` and `audience` sat unread on
 * every page.
 *
 * Ranking on shared decision areas is what the data was for. Kept here rather
 * than in the component so the ordering is testable without rendering.
 */

export type RelatedAnswerCandidate = {
  slug: string;
  title: string;
  category: string;
  audience: string;
  thresholdFocus: string;
  mappedDecisionAreas: readonly DecisionArea[];
};

const overlapCount = (a: readonly DecisionArea[], b: readonly DecisionArea[]) => {
  const set = new Set<string>(a);
  return b.filter((area) => set.has(area)).length;
};

/**
 * The strongest neighbours first.
 *
 * Shared decision areas dominate, because two pages that move the same lever are
 * the pair a reader most wants next. `thresholdFocus` breaks ties — two hiring
 * pages that both hinge on risk appetite are closer than two that do not — and
 * audience breaks the remainder, so a CFO page prefers another CFO page.
 *
 * Ties fall back to slug order rather than input order, so the block does not
 * silently reshuffle when someone appends a page to the JSON.
 */
export const selectRelatedAnswers = <T extends RelatedAnswerCandidate>(
  page: T,
  candidates: readonly T[],
  {
    limit = 3,
    isEligible = () => true,
  }: { limit?: number; isEligible?: (slug: string) => boolean } = {},
): T[] =>
  candidates
    .filter((candidate) => candidate.slug !== page.slug && isEligible(candidate.slug))
    .map((candidate) => ({
      candidate,
      areas: overlapCount(page.mappedDecisionAreas, candidate.mappedDecisionAreas),
      threshold: candidate.thresholdFocus === page.thresholdFocus ? 1 : 0,
      audience: candidate.audience === page.audience ? 1 : 0,
    }))
    .sort((left, right) =>
      right.areas - left.areas
      || right.threshold - left.threshold
      || right.audience - left.audience
      || left.candidate.slug.localeCompare(right.candidate.slug))
    .slice(0, limit)
    .map((entry) => entry.candidate);
