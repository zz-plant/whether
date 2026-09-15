import { getWhetherKv, readKvValues, type KvNamespace } from "../runtime/kv";
import { isValidPremiumFunnelEvent } from "../premiumFunnel";
import type { PremiumFunnelEvent, PremiumIntentSource, PremiumFunnelEventType } from "../premiumFunnel";

/**
 * Durable sink for premium-funnel events.
 *
 * Before this existed, `dispatchPremiumFunnelEvent` forwarded to a webhook when one was
 * configured and otherwise dropped the event on the floor in production. The webhook has
 * never been set, so the pre-reveal go/no-go checks in docs/premium-launch-readiness.md —
 * which need 1–2 weeks of event volume — could never pass.
 *
 * Deliberately NOT built on DurableEventLog, despite that being the repo's usual
 * append-only primitive. Its `append` does a read-modify-write on a single shared index
 * key (`get(index)` → `put(entry)` → `put(index)`), serialized only by a per-isolate
 * promise queue. Two isolates appending concurrently — the normal case for click
 * telemetry fanning in from many visitors — read the same index, derive the same next
 * index, and write the same key, so the later write silently destroys the earlier event.
 * KV's eventual consistency widens that window further. That primitive is fine for its
 * existing callers (posture decisions transition at most a few times a week); it is not
 * fine here, and changing it would alter semantics those callers depend on.
 *
 * Instead every event gets a collision-free key and there is no shared counter at all:
 *
 *     premium-funnel:<inverted-timestamp>:<uuid>
 *
 * The inverted timestamp makes KV's lexicographic key order newest-first, so reading the
 * most recent N events is a single bounded `list({ limit })` rather than a full scan.
 */

const KEY_PREFIX = "premium-funnel:";

/** Wide enough to stay positive well past year 10000; fixed width keeps keys sortable. */
const INVERSION_BASE = 99999999999999;
const STAMP_WIDTH = 14;

/** Telemetry informs a pricing decision, not an audit trail. 180 days bounds storage. */
const RETENTION_SECONDS = 180 * 24 * 60 * 60;

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

export type PremiumFunnelCursor = string | null;

export type StoredPremiumFunnelEvent = PremiumFunnelEvent & {
  /** Server receive time. Trustworthy, unlike the client-supplied `occurredAt`. */
  receivedAt: string;
};

export type PremiumFunnelSummary = {
  total: number;
  bySource: Record<PremiumIntentSource, number>;
  byType: Record<PremiumFunnelEventType, number>;
  byPath: Record<string, number>;
  firstEventAt: string | null;
  lastEventAt: string | null;
  backend: "durable" | "local-fallback";
  /** True when the window filled, meaning `total` undercounts the full history. */
  truncated: boolean;
};

const buildKey = (receivedAtMs: number): string => {
  const inverted = String(INVERSION_BASE - receivedAtMs).padStart(STAMP_WIDTH, "0");
  const unique = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${receivedAtMs}-${Math.random().toString(36).slice(2, 12)}`;
  return `${KEY_PREFIX}${inverted}:${unique}`;
};

/* Newest-first, mirroring the KV key order so both backends read identically. */
const memoryEvents: StoredPremiumFunnelEvent[] = [];

export const premiumFunnelBackendStatus = (): "durable" | "local-fallback" =>
  getWhetherKv() ? "durable" : "local-fallback";

/**
 * Never throws. Telemetry must not be able to fail a user-facing interaction, and the
 * caller already treats dispatch as fire-and-forget.
 */
export const recordPremiumFunnelEvent = async (event: PremiumFunnelEvent): Promise<void> => {
  try {
    const receivedAtMs = Date.now();
    const stored: StoredPremiumFunnelEvent = {
      ...event,
      receivedAt: new Date(receivedAtMs).toISOString(),
    };

    const kv = getWhetherKv();
    if (!kv) {
      memoryEvents.unshift(stored);
      if (memoryEvents.length > MAX_LIMIT) {
        memoryEvents.length = MAX_LIMIT;
      }
      return;
    }

    await kv.put(buildKey(receivedAtMs), JSON.stringify(stored), {
      expirationTtl: RETENTION_SECONDS,
    });
  } catch {
    /* Dropping one telemetry event is strictly better than breaking the click. */
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Re-validates on read rather than trusting the stored shape. These values entered
 * through a public endpoint, and a summary that counted a malformed row into `bySource`
 * would quietly corrupt the numbers this store exists to produce.
 */
const toStoredEvent = (value: unknown): StoredPremiumFunnelEvent | null => {
  if (!isRecord(value)) return null;

  const receivedAt = value.receivedAt;
  if (typeof receivedAt !== "string" || receivedAt.length === 0) return null;

  if (!isValidPremiumFunnelEvent(value)) return null;
  return { ...value, receivedAt };
};

const readKeys = async (
  kv: KvNamespace,
  keys: string[],
): Promise<StoredPremiumFunnelEvent[]> => {
  const collected: StoredPremiumFunnelEvent[] = [];

  /* Entries are write-once and never rewritten, so an edge cache is safe here. */
  const raws = await readKvValues(kv, keys, { cacheTtl: 60 });

  for (const raw of raws) {
    if (!raw) continue;
    try {
      const parsed = toStoredEvent(JSON.parse(raw));
      if (parsed) collected.push(parsed);
    } catch {
      /* Skip invalid JSON rather than failing the whole read. */
    }
  }

  return collected;
};

/** Newest first. */
export const listPremiumFunnelEvents = async (options?: {
  cursor?: PremiumFunnelCursor;
  limit?: number;
  source?: PremiumIntentSource;
}): Promise<{ events: StoredPremiumFunnelEvent[]; nextCursor: PremiumFunnelCursor }> => {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const matches = (event: StoredPremiumFunnelEvent) =>
    !options?.source || event.source === options.source;

  const kv = getWhetherKv();
  if (!kv) {
    return { events: memoryEvents.filter(matches).slice(0, limit), nextCursor: null };
  }

  const page = await kv.list({
    prefix: KEY_PREFIX,
    limit,
    cursor: options?.cursor ?? undefined,
  });
  const events = (await readKeys(kv, page.keys.map((key) => key.name))).filter(matches);

  return { events, nextCursor: page.list_complete ? null : page.cursor ?? null };
};

const emptySourceCounts = (): Record<PremiumIntentSource, number> => ({
  export_brief: 0,
  runway_planner: 0,
  integrations: 0,
  api_access: 0,
  team_workflow: 0,
  pricing_page: 0,
});

const emptyTypeCounts = (): Record<PremiumFunnelEventType, number> => ({
  premium_intent: 0,
  premium_gate_view: 0,
  premium_checkout_start: 0,
  premium_checkout_complete: 0,
});

/**
 * Aggregates the most recent `limit` events. `truncated` reports whether the window
 * filled, so a caller can tell a complete count from a windowed one instead of reading
 * an undercount as the full history.
 */
export const summarizePremiumFunnelEvents = async (
  limit = DEFAULT_LIMIT,
): Promise<PremiumFunnelSummary> => {
  const effectiveLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const { events } = await listPremiumFunnelEvents({ limit: effectiveLimit });

  const bySource = emptySourceCounts();
  const byType = emptyTypeCounts();
  const byPath: Record<string, number> = {};
  let firstEventAt: string | null = null;
  let lastEventAt: string | null = null;

  for (const event of events) {
    bySource[event.source] = (bySource[event.source] ?? 0) + 1;
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    byPath[event.path] = (byPath[event.path] ?? 0) + 1;

    if (!firstEventAt || event.receivedAt < firstEventAt) {
      firstEventAt = event.receivedAt;
    }
    if (!lastEventAt || event.receivedAt > lastEventAt) {
      lastEventAt = event.receivedAt;
    }
  }

  return {
    total: events.length,
    bySource,
    byType,
    byPath,
    firstEventAt,
    lastEventAt,
    backend: premiumFunnelBackendStatus(),
    truncated: events.length >= effectiveLimit,
  };
};

/** Test seam — the in-memory tail is module state and leaks between test cases. */
export const resetPremiumFunnelEventLogForTests = () => {
  memoryEvents.length = 0;
};
