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

const getBinding = (): AnalyticsEngineBinding | null => {
  const candidate = (globalThis as { ANALYTICS?: AnalyticsEngineBinding }).ANALYTICS;
  if (!candidate || typeof candidate.writeDataPoint !== "function") {
    return null;
  }
  return candidate;
};

const truncateBlob = (value: string) => {
  if (value.length <= TELEMETRY_BLOB_BYTE_LIMIT) {
    return value;
  }
  return `${value.slice(0, TELEMETRY_BLOB_BYTE_LIMIT)}…`;
};

export type TelemetryStream =
  | "web-vitals"
  | "operator-workflow"
  | "content-measurement"
  | "premium-funnel";

export type WriteAnalyticsOptions = {
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

export const isAnalyticsEngineBound = (): boolean => getBinding() !== null;
