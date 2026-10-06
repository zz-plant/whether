/**
 * Waking every subscribed browser when the call changes.
 *
 * The push carries no body. A payload would have to hold a reading, and a push
 * sits in a queue: a phone that was off all evening would light up with a
 * regime that had already moved on. With nothing in the push, the service
 * worker fetches the current call as it draws the notification, so what the
 * reader sees is true at the moment they read it rather than at the moment we
 * sent it. It also means there is no RFC 8291 payload encryption here to get
 * wrong.
 *
 * A push service answers 404 or 410 for a subscription that no longer exists —
 * an uninstalled app, a cleared browser, a revoked permission. Those are
 * deleted rather than retried: a list that only grows is a list that is mostly
 * dead endpoints, and every send then reports failures that are nobody's fault.
 */
import { buildVapidAuthorization, resolveVapidConfig, type VapidConfig } from "./vapid";
import { deletePushSubscription, listPushSubscriptions, type StoredPushSubscription } from "./pushSubscriptions";
import { fanOut, type DeliveryOutcome } from "../delivery/fanOut";

type RegimePushResult = {
  ok: boolean;
  /** Named rather than implied: an unconfigured sender must not read as "nobody subscribed". */
  reason?: string;
  sent: number;
  pruned: number;
  failed: number;
};

/** Four hours. Past that a "the call changed" notification is telling someone what they already know. */
const PUSH_TTL_SECONDS = 4 * 60 * 60;

const GONE_STATUSES = new Set([404, 410]);

const sendOne = async (
  config: VapidConfig,
  subscription: StoredPushSubscription,
  fetchImpl: typeof globalThis.fetch,
): Promise<DeliveryOutcome> => {
  try {
    const response = await fetchImpl(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: await buildVapidAuthorization(config, subscription.endpoint),
        TTL: String(PUSH_TTL_SECONDS),
        /* No body, so say so explicitly: some push services reject a POST that
           declares neither a length nor an encoding. */
        "Content-Length": "0",
      },
    });

    if (response.ok) return "sent";
    return GONE_STATUSES.has(response.status) ? "gone" : "failed";
  } catch {
    return "failed";
  }
};

/**
 * Called from `checkRegimeChange` when the published regime actually moved.
 *
 * Deliberately not called on every cron run: a notification that fires weekly
 * whether or not anything happened is one people turn off, and then the one
 * that mattered never arrives.
 */
export const sendRegimeChangePush = async (
  options: { env?: Record<string, string | undefined>; fetchImpl?: typeof globalThis.fetch } = {},
): Promise<RegimePushResult> => {
  const config = resolveVapidConfig(options.env ?? process.env);
  if (!config) {
    return { ok: false, reason: "VAPID keys are not configured; no browser can be subscribed", sent: 0, pruned: 0, failed: 0 };
  }

  const subscriptions = await listPushSubscriptions();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  /* One at a time, as before: a Worker holds six outgoing connections, and the
     list is every subscribed browser. A gone subscription is deleted rather than
     retried — "pruned" in this result is the fan-out's "retired". */
  const tally = await fanOut(subscriptions, (subscription) => sendOne(config, subscription, fetchImpl), {
    retire: (subscription) => deletePushSubscription(subscription.clientId),
    sequential: true,
  });

  return { ok: true, sent: tally.sent, pruned: tally.retired, failed: tally.failed };
};
