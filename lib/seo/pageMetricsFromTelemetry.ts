import { z } from "zod";
import {
  isContentAcquisitionSource,
  isContentCluster,
  isContentIntent,
  type ContentAcquisitionSource,
  type ContentCluster,
  type ContentIntent,
} from "../contentMeasurement";

/**
 * The missing middle of the SEO refresh loop.
 *
 * `docs/seo/refresh-loop.md` selects pages to refresh by organic entrances and
 * CTA conversion rate, and `scripts/seo-refresh-queue.mjs` reads both from
 * `artifacts/seo-refresh/page-metrics.json`. Nothing wrote that file. Meanwhile
 * `ContentMeasurementTracker` has been firing an event for every entrance and
 * every CTA conversion on every visit, and `lib/telemetry/analyticsEngine.ts`
 * has been storing them in the `whether_telemetry` Analytics Engine dataset.
 *
 * So the loop had a producer and a consumer and no connection between them. This
 * module is the connection, and it is the half worth testing: the transport is a
 * SQL POST (`scripts/seo-page-metrics.ts`), the judgement is here.
 */

/** One Analytics Engine row. `blob2` is the event JSON — see `writeAnalytics`. */
export type TelemetryRow = {
  blob2?: string | null;
};

type PageMetric = {
  /**
   * Every first-visit entrance in the window, whatever the source.
   *
   * This is what the refresh queue tiers traffic on, and it is the right
   * number for that: a page's audience is everyone who lands on it.
   */
  entrances30d: number;
  /**
   * Entrances a search engine referred.
   *
   * The event was called `organic_entrance` and checked no referrer at all, so
   * this used to be indistinguishable from the total — direct, paid, and
   * inbound-from-social visits were all counted as organic. The tracker now
   * classifies the referrer into a coarse bucket, so the two numbers are
   * separate. Rows written before that land in `unclassified`, which is why
   * this can read far below `entrances30d` on a window that spans the change.
   */
  organicSearchEntrances30d: number;
  /** The full split, so a reader can see what share is still unclassified. */
  entrancesBySource: Record<ContentAcquisitionSource | "unclassified", number>;
  ctaConversions30d: number;
  /** Conversions per entrance. Null when there were no entrances to divide by. */
  ctaConversionRate: number | null;
  assistedConversions30d: number;
  cluster?: ContentCluster;
  intent?: ContentIntent;
};

type PageMetricsFile = {
  generatedAtIso: string;
  windowDays: number;
  eventsRead: number;
  eventsParsed: number;
  /** Stated in the artifact so nobody reads `organicEntrances30d` as organic. */
  entranceDefinition: string;
  byUrl: Record<string, PageMetric>;
};

const ENTRANCE_DEFINITION =
  "entrances30d counts every first-visit entrance per session. organicSearchEntrances30d "
  + "counts the ones a search engine referred; entrancesBySource.unclassified counts rows "
  + "written before the tracker classified acquisition, so a window spanning that change "
  + "under-reports every classified bucket.";

type ParsedEvent = {
  pagePath: string;
  type: string;
  cluster?: ContentCluster;
  intent?: ContentIntent;
  source?: ContentAcquisitionSource;
};

/**
 * Validated, not asserted.
 *
 * These rows are whatever a browser posted to the telemetry endpoint weeks ago,
 * round-tripped through a blob the writer truncates at ~5KB — so the payload can
 * be a partial JSON string, a non-object, or an object missing the two fields
 * that make it countable. A cast here would move all of that to runtime.
 */
const telemetryEventSchema = z.object({
  pagePath: z.string().min(1),
  type: z.string().min(1),
  cluster: z.string().optional(),
  intent: z.string().optional(),
  source: z.string().optional(),
});

const parseRow = (row: TelemetryRow): ParsedEvent | null => {
  if (!row.blob2) return null;

  let value: unknown;
  try {
    value = JSON.parse(row.blob2);
  } catch {
    // A truncated blob arrives as invalid JSON. Skipping is correct: a partial
    // event has no reliable path to attribute the count to.
    return null;
  }

  const parsed = telemetryEventSchema.safeParse(value);
  if (!parsed.success) return null;

  const { pagePath, type, cluster, intent, source } = parsed.data;

  return {
    pagePath,
    type,
    cluster: cluster && isContentCluster(cluster) ? cluster : undefined,
    intent: intent && isContentIntent(intent) ? intent : undefined,
    source: source && isContentAcquisitionSource(source) ? source : undefined,
  };
};

const emptyMetric = (): PageMetric => ({
  entrances30d: 0,
  organicSearchEntrances30d: 0,
  entrancesBySource: { search: 0, social: 0, referral: 0, direct: 0, internal: 0, unclassified: 0 },
  ctaConversions30d: 0,
  ctaConversionRate: null,
  assistedConversions30d: 0,
});

/**
 * Fold raw telemetry rows into the per-URL shape the refresh queue reads.
 *
 * Deliberately does not compute `trafficTier`. The queue already derives one
 * from `organicEntrances30d` when the field is absent, and its thresholds are
 * the policy — writing a second copy here is how two numbers that must agree
 * start disagreeing.
 */
export const buildPageMetrics = (
  rows: TelemetryRow[],
  { windowDays = 30, now = new Date() }: { windowDays?: number; now?: Date } = {},
): PageMetricsFile => {
  const byUrl: Record<string, PageMetric> = {};
  let eventsParsed = 0;

  for (const row of rows) {
    const event = parseRow(row);
    if (!event) continue;
    eventsParsed += 1;

    const metric = byUrl[event.pagePath] ?? emptyMetric();

    if (event.type === "organic_entrance") {
      metric.entrances30d += 1;
      metric.entrancesBySource[event.source ?? "unclassified"] += 1;
      if (event.source === "search") metric.organicSearchEntrances30d += 1;
    }
    else if (event.type === "cta_conversion") metric.ctaConversions30d += 1;
    else if (event.type === "assisted_conversion") metric.assistedConversions30d += 1;

    // First non-empty classification wins; a page's cluster and intent are
    // properties of the page, so a later differing value is noise, not news.
    metric.cluster ??= event.cluster;
    metric.intent ??= event.intent;

    byUrl[event.pagePath] = metric;
  }

  for (const metric of Object.values(byUrl)) {
    metric.ctaConversionRate = metric.entrances30d > 0
      ? metric.ctaConversions30d / metric.entrances30d
      : null;
  }

  return {
    generatedAtIso: now.toISOString(),
    windowDays,
    eventsRead: rows.length,
    eventsParsed,
    entranceDefinition: ENTRANCE_DEFINITION,
    byUrl,
  };
};
