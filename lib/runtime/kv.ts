import type { z } from "zod";

/**
 * One structural type for the Workers KV binding, kept structural so the same code
 * typechecks under bun tests and node scripts where the binding is mocked.
 *
 * `get` cacheTtl (min 60s) caches the value AND misses at the edge: only for keys immutable
 * once written, never the "newest" key a caller re-reads after a write. `put` expirationTtl
 * (min 60s) is server-side retention. docs/agents/lessons/runtime-helpers.md.
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

/** Workers hold six outgoing connections at a time; this is the fan-out without a bulk read. */
export const KV_SINGLE_READ_CONCURRENCY = 6;

/** Per-binding memory of whether `get(keys[])` answered with a Map. */
const bulkReadSupport = new WeakMap<object, boolean>();

/**
 * The runtime's binding carries `getWithMetadata`; the structural doubles do not, so a double
 * never receives an array, and a binding whose bulk read answers anything but a Map is read
 * key by key from then on.
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
    // The array form is invoked reflectively and narrowed at runtime: only a Map counts.
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
 * Reads many keys, in order, through KV's bulk `get(keys[])` wherever the binding offers it:
 * up to 100 keys as one operation against the 1,000 a Worker invocation may make.
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

/** How a stored value is narrowed on the way out: a zod schema, or a parser that answers null. */
type StoredValueReader<T> = z.ZodType<T> | ((value: unknown) => T | null);

/**
 * JSON this app wrote to KV, read back narrowed rather than asserted. Null for an absent
 * value, text that is not JSON, and a value the reader refuses or throws on: a record an
 * older deploy wrote in another shape is "no record", as every caller already treated it.
 */
export const parseStoredJson = <T>(raw: string | null | undefined, reader: StoredValueReader<T>): T | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof reader === "function") return reader(value);
    const parsed = reader.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** One key read through `parseStoredJson`. A failing `get` still rejects: an outage is not a missing record. */
export const getJson = async <T>(
  kv: Pick<KvNamespace, "get">,
  key: string,
  reader: StoredValueReader<T>,
  options?: { cacheTtl?: number },
): Promise<T | null> => parseStoredJson(await kv.get(key, options), reader);

const isKvNamespace = (value: unknown): value is KvNamespace =>
  typeof value === "object"
  && value !== null
  && typeof Reflect.get(value, "get") === "function"
  && typeof Reflect.get(value, "put") === "function"
  && typeof Reflect.get(value, "list") === "function";

/** The durable KV binding installed by worker/index.ts; the only data namespace wrangler.toml declares. */
export const getWhetherKv = (): KvNamespace | null => {
  const candidate: unknown = Reflect.get(globalThis, "WHETHER_DURABLE_KV");
  if (!isKvNamespace(candidate)) {
    return null;
  }
  return candidate;
};
