import { z } from "zod";

const SEARCH_TELEMETRY_ENDPOINT = "/api/telemetry/search";

/*
 * `strictObject`, not a hand-rolled guard with a cast. Extra keys are rejected
 * rather than ignored, which is the whole promise: an intake that dropped an
 * unexpected field would still have accepted a payload carrying the query text.
 */
const searchEventSchema = z.strictObject({
  type: z.literal("search"),
  /** Which job the query routed to, or null when nothing matched. */
  routedJob: z.string().nullable(),
  resultCount: z.number().finite().min(0),
  /** Whether a `job` filter was applied to the results. */
  filtered: z.boolean(),
  zeroResults: z.boolean(),
});

type SearchTelemetryEvent = z.infer<typeof searchEventSchema>;

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
export const isSearchTelemetryEvent = (input: unknown): input is SearchTelemetryEvent =>
  searchEventSchema.safeParse(input).success;

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
