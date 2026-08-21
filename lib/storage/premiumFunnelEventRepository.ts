import { getWhetherKv } from "../runtime/kv";
import type { PremiumFunnelEvent, PremiumIntentSource, PremiumFunnelEventType } from "../premiumFunnel";
import { DurableEventLog, type KvNamespaceLike } from "./eventLog";

/**
 * Durable sink for premium-funnel events.
 *
 * Before this existed, `dispatchPremiumFunnelEvent` forwarded to a webhook when one was
 * configured and otherwise dropped the event on the floor in production (the only other
 * branch logged to console under NODE_ENV === "development"). The webhook has never been
 * set, so the pre-reveal go/no-go checks in docs/premium-launch-readiness.md — which need
 * 1–2 weeks of event volume — could never pass. Persistence is now unconditional and the
 * webhook is an additional fan-out, not the sole one.
 */

const TOPIC = "premium-funnel";

export type PremiumFunnelCursor = string | null;

export type PremiumFunnelSummary = {
  total: number;
  bySource: Record<PremiumIntentSource, number>;
  byType: Record<PremiumFunnelEventType, number>;
  byPath: Record<string, number>;
  firstEventAt: string | null;
  lastEventAt: string | null;
  backend: "durable" | "local-fallback";
};

/* The binding can arrive after an early miss (same reason getDefaultIngestionStore
 * re-checks rather than memoizing permanently), so the log is rebuilt when the
 * binding identity changes instead of being cached for the isolate's lifetime. */
let cachedLog: DurableEventLog<PremiumFunnelEvent> | null = null;
let cachedBinding: KvNamespaceLike | null = null;

export const getPremiumFunnelEventLog = (): DurableEventLog<PremiumFunnelEvent> => {
  const binding = getWhetherKv();
  if (!cachedLog || binding !== cachedBinding) {
    cachedLog = new DurableEventLog<PremiumFunnelEvent>(TOPIC, binding);
    cachedBinding = binding;
  }
  return cachedLog;
};

export const premiumFunnelBackendStatus = (): "durable" | "local-fallback" =>
  getWhetherKv() ? "durable" : "local-fallback";

/**
 * Never throws. Telemetry must not be able to fail a user-facing interaction, and the
 * caller already treats dispatch as fire-and-forget.
 */
export const recordPremiumFunnelEvent = async (event: PremiumFunnelEvent): Promise<void> => {
  try {
    await getPremiumFunnelEventLog().append(event);
  } catch {
    /* Dropping one telemetry event is strictly better than breaking the click. */
  }
};

export const listPremiumFunnelEvents = async (options?: {
  cursor?: PremiumFunnelCursor;
  limit?: number;
  source?: PremiumIntentSource;
}): Promise<{ events: PremiumFunnelEvent[]; nextCursor: PremiumFunnelCursor }> => {
  const result = await getPremiumFunnelEventLog().list({
    cursor: options?.cursor,
    limit: options?.limit,
    filter: options?.source ? (event) => event.source === options.source : undefined,
  });
  return { events: result.items, nextCursor: result.nextCursor };
};

const emptySourceCounts = (): Record<PremiumIntentSource, number> => ({
  export_brief: 0,
  runway_planner: 0,
  integrations: 0,
  api_access: 0,
  team_workflow: 0,
});

const emptyTypeCounts = (): Record<PremiumFunnelEventType, number> => ({
  premium_intent: 0,
  premium_gate_view: 0,
  premium_checkout_start: 0,
  premium_checkout_complete: 0,
});

/**
 * Aggregates the most recent `limit` events. Deliberately not a full-history count:
 * DurableEventLog caps a single scan at 1000 entries, so a number derived from the whole
 * log would silently understate itself once the log outgrows that window. `scanned` is
 * reported so a caller can tell a complete count from a windowed one.
 */
export const summarizePremiumFunnelEvents = async (
  limit = 500,
): Promise<PremiumFunnelSummary & { scanned: number }> => {
  const { events } = await listPremiumFunnelEvents({ limit });

  const bySource = emptySourceCounts();
  const byType = emptyTypeCounts();
  const byPath: Record<string, number> = {};
  let firstEventAt: string | null = null;
  let lastEventAt: string | null = null;

  for (const event of events) {
    bySource[event.source] = (bySource[event.source] ?? 0) + 1;
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    byPath[event.path] = (byPath[event.path] ?? 0) + 1;

    if (!firstEventAt || event.occurredAt < firstEventAt) {
      firstEventAt = event.occurredAt;
    }
    if (!lastEventAt || event.occurredAt > lastEventAt) {
      lastEventAt = event.occurredAt;
    }
  }

  return {
    total: events.length,
    scanned: events.length,
    bySource,
    byType,
    byPath,
    firstEventAt,
    lastEventAt,
    backend: premiumFunnelBackendStatus(),
  };
};

/** Test seam — the log is module-level state and leaks between test cases otherwise. */
export const resetPremiumFunnelEventLogForTests = () => {
  cachedLog = null;
  cachedBinding = null;
};
