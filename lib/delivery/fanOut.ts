/**
 * One message to many targets, and the one tally every channel counts it in.
 *
 * Each sender here used to count in its own words: the weekly email `sent` /
 * `errors`, the Slack post `delivered` / `attempted`, the push `sent` /
 * `pruned` / `failed`, the month-end pulse a bare number per channel, and the
 * alert posts in `checkRegimeChange` nothing at all. Three of those also decided
 * on their own whether a target that answered "gone" was dropped, and the
 * month-end pulse never did, so a webhook Slack had revoked stayed a target of
 * every pulse. A target is now delivered to, gone (and retired), failed, or
 * skipped because it already had this period's send — the same four words for
 * every channel, which each caller maps onto the response shape it already
 * publishes.
 */

/** What one delivery to one target came to. "gone" is the target saying it no longer exists. */
export type DeliveryOutcome = "sent" | "gone" | "failed";

/** A record of who already received a period's send (`lib/delivery/onceFor.ts`). */
export type SentMarkers = {
  wasSent: (recipient: string) => Promise<boolean>;
  markSent: (recipient: string) => Promise<void>;
};

type FanOutTally = {
  sent: number;
  /** Answered "gone" and were retired, so the next send does not count them as targets. */
  retired: number;
  failed: number;
  /** Already had this period's send, so were not sent to again. */
  skipped: number;
};

type FanOutOptions<Target> = {
  /** Drops a target that answered "gone". Awaited: in a Worker a floating promise can die with the request. */
  retire?: (target: Target) => Promise<unknown>;
  /** Skip targets that already had this period's send, and record the ones that get it now. */
  once?: { markers: SentMarkers; keyOf: (target: Target) => string };
  /** One at a time, for a channel whose sends share a connection budget (push). Parallel otherwise. */
  sequential?: boolean;
  /**
   * How many deliveries may be in flight at once when not sequential.
   *
   * Email is the reason this exists: every recipient's message is rendered from
   * the same brief and then sent, so an unbounded fan-out holds one full render
   * per subscriber in memory at the same moment. A send to a few dozen addresses
   * killed the worker mid-run in local testing (2026-10-30), which on the Monday
   * cron means the brief goes to some of the list and not the rest. A bounded
   * pool keeps the send alive and costs nothing but a little wall time.
   */
  concurrency?: number;
};

/** Enough to use the request's idle time without holding a whole list in memory. */
export const DEFAULT_FAN_OUT_CONCURRENCY = 8;

/**
 * Run `run` over `items` with at most `limit` in flight. The results come back in
 * completion order; every caller counts them rather than reading them by index.
 */
const runPool = async <Item, Result>(
  items: readonly Item[],
  limit: number,
  run: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results: Result[] = [];
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) continue;
      results.push(await run(item));
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const deliverOne = async <Target>(
  target: Target,
  deliver: (target: Target) => Promise<DeliveryOutcome>,
  options: FanOutOptions<Target>,
): Promise<DeliveryOutcome | "skipped"> => {
  const key = options.once?.keyOf(target);
  if (options.once && key !== undefined && (await options.once.markers.wasSent(key))) {
    return "skipped";
  }

  let outcome: DeliveryOutcome;
  try {
    outcome = await deliver(target);
  } catch {
    outcome = "failed";
  }

  if (outcome === "sent" && options.once && key !== undefined) {
    await options.once.markers.markSent(key);
  }
  if (outcome === "gone" && options.retire) {
    await options.retire(target).catch(() => undefined);
  }
  return outcome;
};

export const fanOut = async <Target>(
  targets: readonly Target[],
  deliver: (target: Target) => Promise<DeliveryOutcome>,
  options: FanOutOptions<Target> = {},
): Promise<FanOutTally> => {
  let outcomes: Array<DeliveryOutcome | "skipped">;
  if (options.sequential) {
    outcomes = [];
    for (const target of targets) {
      outcomes.push(await deliverOne(target, deliver, options));
    }
  } else {
    outcomes = await runPool(
      targets,
      Math.max(1, options.concurrency ?? DEFAULT_FAN_OUT_CONCURRENCY),
      (target) => deliverOne(target, deliver, options),
    );
  }

  const count = (outcome: DeliveryOutcome | "skipped") => outcomes.filter((entry) => entry === outcome).length;
  return {
    sent: count("sent"),
    retired: options.retire ? count("gone") : 0,
    /* A "gone" target nothing can retire is a failed send, as it was before. */
    failed: count("failed") + (options.retire ? 0 : count("gone")),
    skipped: count("skipped"),
  };
};
