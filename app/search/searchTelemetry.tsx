"use client";

import { useEffect } from "react";
import { trackSearch } from "../../lib/searchTelemetry";

const SESSION_KEY_PREFIX = "whether.search.recorded";

/**
 * Records the shape of a search from the browser, once per query per tab.
 *
 * The first version wrote this during the server render of `/search`. A render
 * is not an action: an RSC prefetch, a retry after an error boundary, or a
 * crawler following the page writes another row, and the stream exists to
 * measure a zero-result *rate*, whose denominator those phantom rows skew. Every
 * other telemetry emitter in this codebase is a client beacon for the same
 * reason.
 *
 * The dedupe key includes the query, because it is only ever compared inside
 * this tab's `sessionStorage`. It is not sent: `trackSearch`'s payload has no
 * field that could carry it.
 */
export function SearchTelemetry({
  query,
  routedJob,
  resultCount,
  filtered,
}: {
  query: string;
  routedJob: string | null;
  resultCount: number;
  filtered: boolean;
}) {
  useEffect(() => {
    if (!query) return;

    const record = () => trackSearch({ routedJob, resultCount, filtered, zeroResults: resultCount === 0 });
    const sessionKey = `${SESSION_KEY_PREFIX}:${query}:${filtered ? routedJob ?? "" : ""}`;

    try {
      if (window.sessionStorage.getItem(sessionKey) === "1") return;
      window.sessionStorage.setItem(sessionKey, "1");
    } catch {
      /* Storage blocked. Recording twice is better than not at all. */
    }

    record();
  }, [query, routedJob, resultCount, filtered]);

  return null;
}
