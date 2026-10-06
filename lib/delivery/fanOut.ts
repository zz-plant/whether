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
  const outcomes: Array<DeliveryOutcome | "skipped"> = [];
  if (options.sequential) {
    for (const target of targets) {
      outcomes.push(await deliverOne(target, deliver, options));
    }
  } else {
    outcomes.push(...(await Promise.all(targets.map((target) => deliverOne(target, deliver, options)))));
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
