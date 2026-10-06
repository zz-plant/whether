/**
 * Single structural type for the Workers KV binding, replacing the per-file hand-rolled
 * shapes that omitted the option bags (and therefore made cacheTtl / expirationTtl
 * unreachable from call sites). Kept structural — not @cloudflare/workers-types — so the
 * same code typechecks under bun tests and node scripts where the binding is mocked.
 *
 * Option semantics that matter here:
 * - get cacheTtl (min 60s): caches the value AND misses at the edge for that long. Only
 *   use it on keys that are immutable once written, and never on the "newest" key a
 *   caller is about to re-read after a write.
 * - put expirationTtl (min 60s): server-side retention; lets logs age out instead of
 *   being read around forever.
 */
type KvListResult = {
  keys: Array<{ name: string; metadata?: unknown }>;
  list_complete: boolean;
  cursor?: string;
};

export type KvNamespace = {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number; metadata?: unknown }): Promise<void>;
  delete?(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

/** KV reads at most this many keys in one bulk `get`. */
export const KV_BULK_READ_MAX_KEYS = 100;

/**
 * Workers hold six outgoing connections at a time; more single reads in flight only
 * queue behind them. This is the fan-out used when a binding has no bulk read.
 */
export const KV_SINGLE_READ_CONCURRENCY = 6;

/** Per-binding memory of whether `get(keys[])` answered with a Map. */
const bulkReadSupport = new WeakMap<object, boolean>();

/**
 * The runtime's KvNamespace carries `getWithMetadata`; this repo's structural doubles do
 * not. A double therefore never receives an array, and a binding whose bulk read answers
 * anything but a Map is remembered as unsupported and read key by key from then on.
 */
const offersBulkRead = (kv: object): boolean => {
  const known = bulkReadSupport.get(kv);
  if (known !== undefined) return known;
  return typeof Reflect.get(kv, "getWithMetadata") === "function";
};

const readBulk = async (
  kv: Pick<KvNamespace, "get">,
  keys: string[],
  options?: { cacheTtl?: number },
): Promise<Map<string, string | null> | null> => {
  try {
    /* The structural type declares `get` for one key on purpose (see the doubles note
       above), so the array form is invoked reflectively and its answer is narrowed at
       runtime rather than asserted: only a Map of string values counts as support. */
    const result: unknown = await Reflect.apply(kv.get, kv, [keys, options]);
    if (result instanceof Map) {
      const page = new Map<string, string | null>();
      for (const [key, value] of result) {
        if (typeof key === "string") page.set(key, typeof value === "string" ? value : null);
      }
      bulkReadSupport.set(kv, true);
      return page;
    }
  } catch {
    /* fall through to single reads */
  }
  bulkReadSupport.set(kv, false);
  return null;
};

const readSingly = async (
  kv: Pick<KvNamespace, "get">,
  keys: string[],
  options: { cacheTtl?: number } | undefined,
  write: (offset: number, value: string | null) => void,
) => {
  for (let offset = 0; offset < keys.length; offset += KV_SINGLE_READ_CONCURRENCY) {
    const batch = keys.slice(offset, offset + KV_SINGLE_READ_CONCURRENCY);
    const values = await Promise.all(batch.map((key) => kv.get(key, options)));
    values.forEach((value, index) => write(offset + index, value));
  }
};

/**
 * Reads many keys, in order, through KV's bulk `get(keys[])` wherever the binding offers it.
 *
 * A bulk read takes up to 100 keys, counts as one operation against the 1,000 a Worker
 * invocation may make, and honours `cacheTtl` like a single read. The fan-out this replaced
 * issued one `get` per key at a concurrency of 32 to 64, which the runtime's six-connection
 * limit serialized six at a time — and a full 1,000-entry log scan plus its index read
 * exceeded the per-invocation operation limit outright.
 */
export const readKvValues = async (
  kv: Pick<KvNamespace, "get">,
  keys: readonly string[],
  options?: { cacheTtl?: number },
): Promise<Array<string | null>> => {
  const values: Array<string | null> = Array.from({ length: keys.length }, () => null);

  for (let offset = 0; offset < keys.length; offset += KV_BULK_READ_MAX_KEYS) {
    const chunk = keys.slice(offset, offset + KV_BULK_READ_MAX_KEYS);
    const page = offersBulkRead(kv) ? await readBulk(kv, chunk, options) : null;
    if (page) {
      chunk.forEach((key, index) => {
        values[offset + index] = page.get(key) ?? null;
      });
    } else {
      await readSingly(kv, chunk, options, (index, value) => {
        values[offset + index] = value;
      });
    }
  }

  return values;
};

const isKvNamespace = (value: unknown): value is KvNamespace =>
  typeof value === "object"
  && value !== null
  && typeof Reflect.get(value, "get") === "function"
  && typeof Reflect.get(value, "put") === "function"
  && typeof Reflect.get(value, "list") === "function";

/**
 * Resolve the durable KV binding installed by worker/index.ts. WHETHER_DURABLE_KV is the
 * only KV namespace wrangler.toml declares for data; the per-domain names this used to
 * fall back to (INGESTION_KV, POSTURE_EVENTS_KV, DECISION_MEMORY_KV, DECISION_EVENTS_KV,
 * REGIME_ALERTS_KV) were never bound in any environment.
 */
export const getWhetherKv = (): KvNamespace | null => {
  const candidate: unknown = Reflect.get(globalThis, "WHETHER_DURABLE_KV");
  if (!isKvNamespace(candidate)) {
    return null;
  }
  return candidate;
};
