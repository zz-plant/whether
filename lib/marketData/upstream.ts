/**
 * What every market-data client answers, and the one courtesy each owes the connection pool.
 *
 * The three outcomes are kept apart because collapsing them is how `/api/comps` once reported
 * ok:true with companyCount 0: an outage rendered as an empty basket. "missing" is a verdict
 * about the symbol; "unavailable" says the source declined or never answered, and nothing was
 * learned about the symbol at all.
 */

export type UpstreamRead<T> =
  /** The source answered with data for this symbol. */
  | { status: "ok"; value: T }
  /** The source answered, and has nothing usable for this symbol. */
  | { status: "missing"; reason: string }
  /** The source refused or never answered; nothing was learned about the symbol. */
  | { status: "unavailable"; reason: string };

/**
 * Hands an unread response's connection back. The basket is fetched in parallel, and a Worker
 * gets six open connections per request: a response returned early without its body read holds
 * one until the runtime cancels it, which it logs as "a stalled HTTP response was canceled to
 * prevent deadlock" — on every `/comps` request where the quote source declined, until 2026-09-23.
 */
export const releaseBody = async (res: Response): Promise<void> => {
  try {
    await res.body?.cancel();
  } catch {
    /* already consumed or closed */
  }
};

export const describeFetchError = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
