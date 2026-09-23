/**
 * Whether the published call has moved out from under a page already on screen.
 *
 * `/` revalidates every 300s and the Worker cron writes between deploys, so a
 * tab left open overnight keeps rendering whatever it rendered — a weekly brief
 * is exactly the kind of page people leave open, and the one page where being
 * quietly a week out of date is the whole failure. Nothing told it.
 *
 * What this deliberately does not do is swap the numbers. A reader mid-decision
 * whose figures change under the cursor cannot tell what they just read, and
 * the page would then disagree with the artifact they copied a minute ago. The
 * page says the call moved and offers to reload; the reader decides when.
 *
 * `/api/posture/current` is cached an hour at the edge, so a client cannot see
 * a change sooner than that however often it asks. That is the cadence this is
 * paced against — a weekly call does not need a faster answer, and pretending
 * to give one would just be traffic.
 */

/** What a page rendered, and what the API says is published now. */
export type PublishedCallState = {
  /** The record date the reading is drawn from. */
  week: string;
  regime: string;
};

/** Poll spacing, in milliseconds. Below the endpoint's own hour of edge cache, above idle chatter. */
export const PUBLISHED_CALL_POLL_MS = 15 * 60 * 1000;

export const publishedCallNoticeCopy = {
  /* No "regime", no "record date", no "revalidate": the reader is told what
     changed about their week, not what changed about our pipeline. */
  message: "The guidance has been updated since you opened this page.",
  weekOnly: "A newer reading has been published since you opened this page.",
  action: "Show the new one",
} as const;

/**
 * The published call state carried by a posture response, or null.
 *
 * Null rather than a thrown error and null rather than a partial: a failed or
 * unrecognised poll is not news, and the one thing this must never do is
 * announce a change it cannot substantiate.
 */
export const parsePublishedCallState = (value: unknown): PublishedCallState | null => {
  if (!value || typeof value !== "object") return null;
  const week = Reflect.get(value, "week");
  const regime = Reflect.get(value, "regime");
  if (typeof week !== "string" || week === "") return null;
  if (typeof regime !== "string" || regime === "") return null;
  return { week, regime };
};

export type PublishedCallChange = null | { kind: "call"; message: string } | { kind: "reading"; message: string };

/**
 * What to tell the reader, if anything.
 *
 * A moved regime is a different call and says so. A moved record date under the
 * same regime is a newer reading of the same call, which is worth offering and
 * is not worth alarming anyone about — the two get different sentences because
 * they are different news, and CLAUDE.md already records what happens when a
 * warning fires on something that is fine.
 */
export const describePublishedCallChange = (
  rendered: PublishedCallState,
  current: PublishedCallState | null,
): PublishedCallChange => {
  if (!current) return null;
  if (current.regime !== rendered.regime) {
    return { kind: "call", message: publishedCallNoticeCopy.message };
  }
  if (current.week !== rendered.week) {
    return { kind: "reading", message: publishedCallNoticeCopy.weekOnly };
  }
  return null;
};
