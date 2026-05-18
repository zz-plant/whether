/**
 * Lightweight startup activity signals — fetched from free public sources.
 * No paid APIs, no subscriptions, no scraping dependencies.
 *
 * Sources:
 * - HN Search API: tracks "Who's hiring?" thread comment counts as a hiring sentiment proxy
 * - Layoffs.fyi RSS: parses for layoff mentions as a layoff activity proxy
 */

export type StartupActivitySignals = {
  hiringCommentCount: number | null;
  layoffCount: number | null;
  fetchedAt: string | null;
};

/**
 * Fetch hiring sentiment from HN "Who's hiring?" thread.
 * Uses the Algolia HN Search API (free, no key required).
 * Returns the comment count from the most recent thread as a hiring activity proxy.
 */
export async function fetchHiringActivity(): Promise<{ count: number | null; month: string | null }> {
  try {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const query = encodeURIComponent(`"Who wants to be hired?" ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { count: null, month };

    const data = await res.json() as { hits?: Array<{ points?: number; objectID?: string }> };
    const hiringThread = data.hits?.[0];

    if (!hiringThread?.objectID) return { count: null, month };

    /* Get the actual comment count from the thread */
    const threadRes = await fetch(
      `https://hn.algolia.com/api/v1/items/${hiringThread.objectID}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!threadRes.ok) return { count: null, month };

    const threadData = await threadRes.json() as { children?: unknown[] };
    return { count: threadData.children?.length ?? null, month };
  } catch {
    return { count: null, month: null };
  }
}

/**
 * Fetch recent layoff mentions from the Layoffs.fyi RSS feed.
 * Counts how many items mention layoffs in the current month.
 */
export async function fetchLayoffCount(): Promise<number | null> {
  try {
    const res = await fetch("https://layoffs.fyi/feed/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const text = await res.text();
    const now = new Date();
    const thisMonth = now.toLocaleString("en-US", { month: "short", year: "numeric" });
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleString("en-US", { month: "short", year: "numeric" });

    /* Rough count: items published this month or last month that mention layoffs */
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    let count = 0;
    for (const item of items) {
      if (item.includes("layoff") || item.includes("lay off") || item.includes("furlough")) {
        /* Check if pubDate is recent */
        const pubDateMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/);
        if (pubDateMatch) {
          const pubDate = new Date(pubDateMatch[1]);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (pubDate > monthAgo) count++;
        }
      }
    }
    return count;
  } catch {
    return null;
  }
}

/**
 * Aggregate both signals into one result.
 */
export async function getStartupActivitySignals(): Promise<StartupActivitySignals> {
  const [hiring, layoffs] = await Promise.allSettled([
    fetchHiringActivity(),
    fetchLayoffCount(),
  ]);

  return {
    hiringCommentCount: hiring.status === "fulfilled" ? hiring.value.count : null,
    layoffCount: layoffs.status === "fulfilled" ? layoffs.value : null,
    fetchedAt: new Date().toISOString(),
  };
}
