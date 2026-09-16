/**
 * What a reader is told when the data behind a published call is not current.
 *
 * The three programmatic surfaces used to render the *indexation decision*
 * instead. Two printed the word "noindex" into the page, and all three joined
 * `noindexReasons` — the quality gate's own identifiers — into the sentence. So
 * someone who searched a hiring question could land on an amber box reading
 * "Degraded data mode: cluster-duplicate-no-distinct-datapoint-or-interpretation;
 * this answer is marked noindex." Whether a page is indexed is a fact about a
 * crawler, and the gate ids are a fact about our own editorial bar; neither
 * answers the only question a warning on a decision page exists for, which is
 * whether the number above it is current enough to act on.
 *
 * So the reasons split in two. Four of them say the reading itself is not
 * current, and those become one sentence in the reader's terms. The rest — a
 * thin section, a duplicate cluster, a missing copy button — are reasons to keep
 * a page out of an index and say nothing at all about the data, so they now
 * render nothing. A warning about data that is fine is worse than no warning:
 * it is the one that teaches a reader to ignore the next one.
 */

/**
 * The gate reasons that mean the reading is not current, in the order they pick
 * the sentence. `fallback-snapshot` and `provenance-missing-or-degraded` are
 * about where the number came from; the two freshness reasons are about when.
 */
const DATA_CURRENCY_REASONS = [
  "fallback-snapshot",
  "provenance-missing-or-degraded",
  "freshness-stale",
  "freshness-unknown",
] as const;

type DataCurrencyReason = (typeof DATA_CURRENCY_REASONS)[number];

/**
 * What to do about it, which is the same wherever the notice renders — so it
 * lives here rather than being reworded in each of the three components.
 */
export const DATA_CURRENCY_ACTION =
  "Check the source dates before acting on anything you cannot reverse.";

/** Where that check happens: the source board, not the page the reader is on. */
export const DATA_CURRENCY_ACTION_HREF = "/trust#source-board";

const summaryFor = (reason: DataCurrencyReason, recordDateLabel?: string): string => {
  const dated = recordDateLabel ? ` The reading is from ${recordDateLabel}.` : "";
  switch (reason) {
    case "fallback-snapshot":
      return `This page is running on the last saved snapshot rather than a live reading.${dated}`;
    case "provenance-missing-or-degraded":
      return `The source behind this page is not currently reporting live.${dated}`;
    case "freshness-stale":
      return `The data behind this page has not refreshed in the last few days.${dated}`;
    case "freshness-unknown":
      return "How recently the data behind this page refreshed could not be confirmed.";
  }
};

/**
 * One sentence for the reader, or nothing.
 *
 * Takes the gate reasons rather than the `degraded` flag, because `degraded` is
 * true whenever *any* gate fails — including the editorial ones, which is how a
 * page with a perfectly current reading came to carry a data warning.
 */
export const buildDataCurrencyNotice = (
  reasons: readonly string[] | undefined,
  options: { recordDateLabel?: string } = {},
): { summary: string; reasons: DataCurrencyReason[] } | null => {
  const matched = DATA_CURRENCY_REASONS.filter((reason) => reasons?.includes(reason));
  const [primary] = matched;
  if (!primary) return null;
  return { summary: summaryFor(primary, options.recordDateLabel), reasons: matched };
};
