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
export type KvListResult = {
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

/**
 * Resolve the durable KV binding installed by worker/index.ts, preferring the shared
 * namespace and falling back to a legacy per-domain binding name when provided.
 */
export const getWhetherKv = (legacyBindingName?: string): KvNamespace | null => {
  const scope = globalThis as Record<string, unknown>;
  const candidate = (scope.WHETHER_DURABLE_KV ?? (legacyBindingName ? scope[legacyBindingName] : undefined)) as
    | KvNamespace
    | undefined;
  if (
    !candidate
    || typeof candidate.get !== "function"
    || typeof candidate.put !== "function"
  ) {
    return null;
  }
  return candidate;
};
