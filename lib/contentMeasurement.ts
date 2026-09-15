export type ContentCluster = "authority" | "pain" | "tool" | "vc";
export type ContentIntent = "cfo" | "board" | "vp-product" | "vc-partner";
type ContentEventType = "organic_entrance" | "cta_conversion" | "assisted_conversion";

/**
 * How a visit arrived, in five buckets and nothing finer.
 *
 * The event was named `organic_entrance` and checked no referrer at all, so
 * direct, paid, and inbound-from-social visits were all counted as organic —
 * which inflated the traffic tier the refresh queue derives and the conversion
 * target each page was judged against.
 *
 * Only the bucket is sent. The referring URL, its path, and any campaign
 * parameters stay in the browser: this product tells readers it runs no
 * trackers, and "someone arrived from a search engine" is the whole of what
 * the refresh loop needs to know.
 */
export type ContentAcquisitionSource = "search" | "social" | "referral" | "direct" | "internal";

export type ContentMeasurementEvent = {
  pagePath: string;
  cluster: ContentCluster;
  intent: ContentIntent;
  type: ContentEventType;
  /** Set on entrances. Absent on rows written before classification existed. */
  source?: ContentAcquisitionSource;
  ctaId?: string;
  internalPath?: string;
};

const SEARCH_HOST_PATTERN = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|startpage|brave|baidu|yandex|qwant|kagi)\./i;
const SOCIAL_HOSTS = new Set([
  "t.co",
  "x.com",
  "twitter.com",
  "www.linkedin.com",
  "linkedin.com",
  "lnkd.in",
  "news.ycombinator.com",
  "www.reddit.com",
  "reddit.com",
  "out.reddit.com",
  "www.facebook.com",
  "facebook.com",
  "bsky.app",
  "substack.com",
  "mastodon.social",
]);

export const isContentAcquisitionSource = (value: string): value is ContentAcquisitionSource =>
  value === "search" || value === "social" || value === "referral" || value === "direct" || value === "internal";

/** Classify a referrer into a bucket. Exported for the test; the caller passes `document.referrer`. */
export const classifyAcquisitionSource = (referrer: string, currentHost: string): ContentAcquisitionSource => {
  const trimmed = referrer.trim();
  if (!trimmed) return "direct";

  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return "direct";
  }

  if (!host) return "direct";
  if (host === currentHost.toLowerCase()) return "internal";
  if (SEARCH_HOST_PATTERN.test(host)) return "search";
  if (SOCIAL_HOSTS.has(host)) return "social";
  return "referral";
};

/** Marks that this tab has already recorded the visit that started the session. */
const LANDING_RECORDED_KEY = "whether.content-measurement.landed";

/**
 * The source for this entrance, once per session.
 *
 * `document.referrer` belongs to the document, not the route, and a Next.js
 * soft navigation does not change it. Classifying every entrance from it would
 * stamp `search` on each page a reader clicked through to after arriving from
 * Google, so `organicSearchEntrances30d` — the number the classification exists
 * to make trustworthy — would over-count by the click depth of every search
 * session, and `internal` would essentially never appear.
 *
 * So the referrer decides only the session's first recorded entrance; every
 * later one in the same tab is what it is, an internal navigation. The flag
 * lives in `sessionStorage`, which is per-tab, so opening a result in a new tab
 * is correctly a new landing.
 */
const currentAcquisitionSource = (): ContentAcquisitionSource | undefined => {
  if (typeof document === "undefined" || typeof window === "undefined") return undefined;

  try {
    if (window.sessionStorage.getItem(LANDING_RECORDED_KEY) === "1") return "internal";
    window.sessionStorage.setItem(LANDING_RECORDED_KEY, "1");
  } catch {
    /* Private mode, or storage blocked. The referrer is still the best available
       answer for this page view; it can only over-count, never invent a visit. */
  }

  return classifyAcquisitionSource(document.referrer ?? "", window.location.hostname);
};

export const CONTENT_MEASUREMENT_ENDPOINT = "/api/telemetry/content-measurement";

export const isContentCluster = (value: string): value is ContentCluster =>
  value === "authority" || value === "pain" || value === "tool" || value === "vc";

export const isContentIntent = (value: string): value is ContentIntent =>
  value === "cfo" || value === "board" || value === "vp-product" || value === "vc-partner";

const isContentEventType = (value: string): value is ContentEventType =>
  value === "organic_entrance" || value === "cta_conversion" || value === "assisted_conversion";

export const isContentMeasurementEvent = (input: unknown): input is ContentMeasurementEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  return (
    typeof payload.pagePath === "string" &&
    payload.pagePath.length > 0 &&
    isContentCluster(String(payload.cluster)) &&
    isContentIntent(String(payload.intent)) &&
    isContentEventType(String(payload.type)) &&
    (payload.source === undefined || isContentAcquisitionSource(String(payload.source)))
  );
};

const trackContentMeasurementEvent = (payload: ContentMeasurementEvent) => {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon(CONTENT_MEASUREMENT_ENDPOINT, beaconBody);
    if (queued) {
      return;
    }
  }

  void fetch(CONTENT_MEASUREMENT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Ignore telemetry network failures to keep the client console clean.
  });
};

export const trackContentOrganicEntrance = (
  event: Omit<ContentMeasurementEvent, "type" | "ctaId" | "internalPath">,
) => {
  trackContentMeasurementEvent({
    ...event,
    type: "organic_entrance",
    source: currentAcquisitionSource(),
  });
};

export const trackContentCtaConversion = (
  event: Omit<ContentMeasurementEvent, "type" | "internalPath"> & { type?: "cta_conversion" },
) => {
  trackContentMeasurementEvent({
    ...event,
    type: "cta_conversion",
  });
};

export const trackContentAssistedConversion = (
  event: Omit<ContentMeasurementEvent, "type" | "ctaId"> & { type?: "assisted_conversion" },
) => {
  trackContentMeasurementEvent({
    ...event,
    type: "assisted_conversion",
  });
};

type ContentMeasurementReport = {
  organicEntrancesByCluster: Record<ContentCluster, number>;
  ctaConversionsByPage: Record<string, number>;
  ctaConversionsByCluster: Record<ContentCluster, number>;
  assistedConversionsByInternalPath: Record<string, number>;
  eventsByIntent: Record<ContentIntent, number>;
};

const emptyClusterRecord = (): Record<ContentCluster, number> => ({
  authority: 0,
  pain: 0,
  tool: 0,
  vc: 0,
});

const emptyIntentRecord = (): Record<ContentIntent, number> => ({
  cfo: 0,
  board: 0,
  "vp-product": 0,
  "vc-partner": 0,
});

export const buildContentMeasurementReport = (
  events: ContentMeasurementEvent[],
): ContentMeasurementReport => {
  const report: ContentMeasurementReport = {
    organicEntrancesByCluster: emptyClusterRecord(),
    ctaConversionsByPage: {},
    ctaConversionsByCluster: emptyClusterRecord(),
    assistedConversionsByInternalPath: {},
    eventsByIntent: emptyIntentRecord(),
  };

  for (const event of events) {
    report.eventsByIntent[event.intent] += 1;

    if (event.type === "organic_entrance") {
      report.organicEntrancesByCluster[event.cluster] += 1;
    }

    if (event.type === "cta_conversion") {
      report.ctaConversionsByPage[event.pagePath] = (report.ctaConversionsByPage[event.pagePath] ?? 0) + 1;
      report.ctaConversionsByCluster[event.cluster] += 1;
    }

    if (event.type === "assisted_conversion" && event.internalPath) {
      report.assistedConversionsByInternalPath[event.internalPath] =
        (report.assistedConversionsByInternalPath[event.internalPath] ?? 0) + 1;
    }
  }

  return report;
};
