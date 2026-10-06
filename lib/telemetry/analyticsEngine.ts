// Thin wrapper around the Cloudflare Workers Analytics Engine binding.
//
// The binding is configured in wrangler.toml as:
//   [[analytics_engine_datasets]]
//   binding = "ANALYTICS"
//   dataset = "whether_telemetry"
//
// At runtime it is exposed on globalThis. When the binding is not present
// (local dev, tests, or any non-Workers environment) we fall back to
// `console.info` so behavior matches the previous black-hole telemetry path
// without throwing.
//
// Schema convention (kept deliberately small so this stays cheap to maintain):
//   indexes[0] = stream name (e.g. "web-vitals", "operator-workflow")
//   blobs[0]   = stream name (mirrored for SQL convenience)
//   blobs[1]   = full event payload as JSON (truncated at ~5KB by the runtime)
//   doubles[]  = caller-provided numeric fields (optional)
//
// Querying: filter on `index1 = '<stream>'` then extract from blob2.
// We can promote individual fields into typed columns later if a stream
// becomes hot; the JSON blob keeps schema evolution cheap until then.

type AnalyticsDataPoint = {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
};

type AnalyticsEngineBinding = {
  writeDataPoint(event: AnalyticsDataPoint): void;
};

const TELEMETRY_BLOB_BYTE_LIMIT = 4_900;

const isAnalyticsEngineBinding = (value: unknown): value is AnalyticsEngineBinding =>
  (typeof value === "object" || typeof value === "function")
  && value !== null
  && typeof Reflect.get(value, "writeDataPoint") === "function";

const getBinding = (): AnalyticsEngineBinding | null => {
  const candidate: unknown = Reflect.get(globalThis, "ANALYTICS");
  return isAnalyticsEngineBinding(candidate) ? candidate : null;
};

const truncateBlob = (value: string) => {
  if (value.length <= TELEMETRY_BLOB_BYTE_LIMIT) {
    return value;
  }
  return `${value.slice(0, TELEMETRY_BLOB_BYTE_LIMIT)}…`;
};

/**
 * Every stream something actually writes.
 *
 * One array, and the union derived from it, because the census script kept a
 * second copy and the two could drift without anything failing.
 *
 * `regime-transition` and `degraded-state` were here too, and nothing in
 * `lib/`, `app/` or `worker/` had ever written either one, nor read them. What
 * they did have was an entry in the public intake's accepted set, so the only
 * way a row reached them was a POST from outside. A stream nobody emits is not
 * a feature waiting for a producer, it is an open write with no reader to
 * notice — `tests/telemetryStreamReachability.test.ts` fails if one is declared
 * again.
 */
export const TELEMETRY_STREAMS = [
  "web-vitals",
  "operator-workflow",
  "activation",
  "content-measurement",
  "premium-funnel",
  /** Worker-authored: the ingest pipeline's own success, failure and duration. */
  "ingest-pipeline",
  /** Worker-authored, and read back on `/trust` as "Scheduled runs". */
  "cron-step",
  /**
   * The shape of a search: which job the query routed to, how many entities
   * matched, whether it matched nothing. Not the text typed, which this product
   * promises it does not collect — `isSearchTelemetryEvent` refuses a payload
   * carrying any key beyond those four, so the promise is enforced at the
   * intake rather than left as a convention.
   */
  "search",
] as const;

export type TelemetryStream = (typeof TELEMETRY_STREAMS)[number];

type WriteAnalyticsOptions = {
  doubles?: number[];
};

export const writeAnalytics = (
  stream: TelemetryStream,
  event: unknown,
  options?: WriteAnalyticsOptions,
): void => {
  const binding = getBinding();
  let serialized: string;
  try {
    serialized = JSON.stringify(event);
  } catch {
    serialized = "[unserializable]";
  }

  if (!binding) {
    // Preserve the previous local/dev signal (still useful in `bun run dev`
    // and `wrangler dev` tail logs) while making it clear this is the
    // fallback path so engineers know durable storage requires the binding.
    console.info(`[telemetry:${stream}:fallback]`, event);
    return;
  }

  try {
    binding.writeDataPoint({
      indexes: [stream],
      blobs: [stream, truncateBlob(serialized)],
      doubles: options?.doubles,
    });
  } catch (error) {
    // Telemetry must never throw into the request path. Log and move on.
    console.warn(`[telemetry:${stream}:write-failed]`, error);
  }
};
