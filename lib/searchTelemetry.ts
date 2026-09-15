const SEARCH_TELEMETRY_ENDPOINT = "/api/telemetry/search";

type SearchTelemetryEvent = {
  type: "search";
  /** Which job the query routed to, or null when nothing matched. */
  routedJob: string | null;
  resultCount: number;
  /** Whether a `job` filter was applied to the results. */
  filtered: boolean;
  zeroResults: boolean;
};

/**
 * What a search did, without what it said.
 *
 * `/search` recorded nothing, so the one question it can answer — are people
 * finding anything — had no data behind it. What is recorded is the routed job,
 * the number of entities matched, and whether the query matched none of them; a
 * zero-result rate is the signal worth acting on.
 *
 * The query text is deliberately not carried. This product tells readers it
 * runs no trackers, and free text typed into a box is the thing that promise is
 * about — so the payload has no field that could hold it, rather than a
 * convention that it will not be filled.
 */
export const isSearchTelemetryEvent = (input: unknown): input is SearchTelemetryEvent => {
  if (!input || typeof input !== "object") return false;
  const payload = input as Record<string, unknown>;

  return (
    payload.type === "search"
    && (payload.routedJob === null || typeof payload.routedJob === "string")
    && typeof payload.resultCount === "number"
    && Number.isFinite(payload.resultCount)
    && payload.resultCount >= 0
    && typeof payload.filtered === "boolean"
    && typeof payload.zeroResults === "boolean"
    /* No other key is accepted: an intake that ignored extras would let a
       browser post the query text into a stream that promises not to hold it. */
    && Object.keys(payload).every((key) =>
      ["type", "routedJob", "resultCount", "filtered", "zeroResults"].includes(key))
  );
};

export const trackSearch = (event: Omit<SearchTelemetryEvent, "type">) => {
  const body = JSON.stringify({ type: "search", ...event } satisfies SearchTelemetryEvent);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const queued = navigator.sendBeacon(SEARCH_TELEMETRY_ENDPOINT, new Blob([body], { type: "application/json" }));
    if (queued) return;
  }

  void fetch(SEARCH_TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Telemetry never surfaces in the page.
  });
};
