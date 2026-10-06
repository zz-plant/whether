/**
 * Who already received a period's send, so a second run does not send it again.
 *
 * Four senders guarded against a repeat four ways: the alert mail with a marker
 * per inbox and alert type (`alert:delivered:*`, a seven-day window), the
 * month-end pulse with one key for the month, the regime check with its
 * `regime:*` last-known state — and the weekly email and the weekly Slack post
 * with nothing at all, so a manual `POST /api/email/send-weekly` after the
 * Monday cron mailed every subscriber the same brief twice.
 *
 * A marker is one KV key per recipient per period, written after that
 * recipient's send succeeds. Per recipient rather than per run, so a run that
 * reached half its list can be re-run and reaches the other half without
 * repeating the first. The alert markers are the same store with a rolling
 * window instead of a period (`lib/alert/alertDelivery.ts`).
 *
 * Without a KV binding there is nowhere durable to record a send, so nothing is
 * skipped — the behaviour every sender had before this existed.
 */
import { formatIsoWeekSlug, getIsoWeekInfo } from "../isoWeek";
import { getWhetherKv, type KvNamespace } from "../runtime/kv";
import type { SentMarkers } from "./fanOut";

/** Nothing else in the namespace starts with `delivery:` (see the prefixes in `lib/`). */
const ONCE_PREFIX = "delivery:once:";

/** Two weeks: past the end of any ISO week a marker can be written in. KV drops it after. */
const ONCE_TTL_SECONDS = 14 * 24 * 60 * 60;

/** Recipients are addresses and webhook URLs; a webhook URL is a credential and stays out of key names. */
const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * A sent-marker store over KV: one key per recipient, holding when it was sent.
 * With `withinMs`, a marker older than that no longer counts; without it, the
 * key's presence does. `force` ignores existing markers but still writes new
 * ones. Reads and writes never throw: a marker that cannot be read is a send,
 * and one that cannot be written is a send that may repeat.
 */
export const sentMarkers = ({
  kv,
  keyFor,
  withinMs,
  ttlSeconds,
  force = false,
}: {
  kv: Pick<KvNamespace, "get" | "put"> | null;
  keyFor: (recipient: string) => string | Promise<string>;
  withinMs?: number;
  ttlSeconds?: number;
  force?: boolean;
}): SentMarkers => ({
  wasSent: async (recipient) => {
    if (!kv || force) return false;
    try {
      const raw = await kv.get(await keyFor(recipient));
      if (!raw) return false;
      if (withinMs === undefined) return true;
      const sentAt = Date.parse(raw);
      return !Number.isNaN(sentAt) && Date.now() - sentAt < withinMs;
    } catch {
      return false;
    }
  },
  markSent: async (recipient) => {
    if (!kv) return;
    try {
      const key = await keyFor(recipient);
      const sentAt = new Date().toISOString();
      await (ttlSeconds ? kv.put(key, sentAt, { expirationTtl: ttlSeconds }) : kv.put(key, sentAt));
    } catch {
      /* non-fatal */
    }
  },
});

/**
 * The markers for one period's send: `onceFor(periodKey)` skips a recipient
 * that already has it. `force` is the manual routes' explicit re-send.
 */
export const onceFor = (periodKey: string, options: { force?: boolean } = {}): SentMarkers =>
  sentMarkers({
    kv: getWhetherKv(),
    keyFor: async (recipient) => `${ONCE_PREFIX}${periodKey}:${await sha256Hex(recipient)}`,
    ttlSeconds: ONCE_TTL_SECONDS,
    force: options.force,
  });

/**
 * The period a weekly send belongs to: the ISO week it goes out in, so a manual
 * run later the same week finds the Monday cron's markers, and next Monday's
 * does not.
 */
export const weeklyPeriodKey = (channel: "weekly-email" | "weekly-slack", now: Date): string =>
  `${channel}:${formatIsoWeekSlug(getIsoWeekInfo(now))}`;

/**
 * A manual route's explicit re-send: `?force=1` (or `?force=true`). Anything
 * else, and every cron run, respects the markers.
 */
export const forceRequested = (request: Request): boolean => {
  const value = new URL(request.url).searchParams.get("force");
  return value === "1" || value === "true";
};
