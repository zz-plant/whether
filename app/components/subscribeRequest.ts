/**
 * The one client-side path to POST /api/email/subscribe.
 *
 * The settings panel used to call the KV-backed subscriber store directly. A browser has
 * no KV binding, so the store handed back its in-memory fallback, the call resolved, and
 * the panel reported success for a subscription that was never stored and never triggered
 * a verification email. Both subscribe surfaces now share this request, so neither can
 * drift back into reporting a local write as a subscription.
 */

import type { PlanLines } from "../../lib/alert/planLines";
import type { RunwayBand } from "../../lib/report/operatorRunway";
import type { OperatorStage } from "../../lib/report/operatorStage";

type SubscribeResult = { ok: boolean; message: string };

type SubscribeOptions = {
  /** Also send regime-change alerts between Mondays. Omitted leaves a standing choice alone. */
  alerts?: boolean;
  /** Also send the Monday brief. `false` is the alerts-only signup. Omitted leaves a standing choice alone. */
  weekly?: boolean;
  /** Lines for the reader's own plan, set on /operate. They count once the address confirms. */
  planLines?: PlanLines[];
  /** The reader's runway band, sent with `planLines` so a crossing email can say what it means at it. */
  runwayBand?: RunwayBand;
  /** The band does not age: nothing is counting down, so the emails read it as sent. */
  runwayBandFixed?: boolean;
  /** The company stage they set on the site, so their Monday brief prints the scaled rules. */
  stage?: OperatorStage;
};

export const SUBSCRIBE_ENDPOINT = "/api/email/subscribe";

const INVALID_EMAIL_MESSAGE = "Enter a full email address, like you@company.com.";
const VERIFY_MESSAGE = "Click the link in the confirmation email. Nothing else is sent until you do.";
const FAILURE_MESSAGE = "The signup did not go through. Try again in a moment.";
const RATE_LIMITED_MESSAGE = "Too many attempts from this connection. Try again in a minute.";
const NETWORK_MESSAGE = "You are offline, or the connection dropped. Try again.";

export async function requestSubscription(
  email: string,
  options?: SubscribeOptions,
): Promise<SubscribeResult> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: INVALID_EMAIL_MESSAGE };
  }

  try {
    const res = await fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      /* Only the flags the caller set: an absent key is what tells the route to
         leave a standing choice alone. */
      body: JSON.stringify({
        email: trimmed,
        ...(typeof options?.alerts === "boolean" ? { alerts: options.alerts } : {}),
        ...(typeof options?.weekly === "boolean" ? { weekly: options.weekly } : {}),
        ...(options?.planLines ? { planLines: options.planLines } : {}),
        ...(options?.runwayBand ? { runwayBand: options.runwayBand } : {}),
        ...(options?.stage ? { stage: options.stage } : {}),
      }),
    });
    const data: { ok?: boolean; error?: string } | null = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      return { ok: true, message: VERIFY_MESSAGE };
    }
    return { ok: false, message: describeRejection(res.status, data?.error, FAILURE_MESSAGE) };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}

/**
 * What a refused request says. A 4xx carries a sentence the route wrote for the
 * reader ("Valid email required."), so it is passed on. The rate limiter answers
 * with the code `rate_limited` and a 5xx with the text of whatever threw, and
 * neither was written to be read: both printed as the form's error (2026-11-09).
 */
const describeRejection = (status: number, serverError: string | undefined, fallback: string): string => {
  if (status === 429) return RATE_LIMITED_MESSAGE;
  if (status >= 500 || !serverError) return fallback;
  return serverError;
};

const SLACK_INVALID_URL_MESSAGE = "Enter a Slack incoming webhook URL. It starts with https://hooks.slack.com/.";
const SLACK_CONNECTED_MESSAGE = "A test message is in the channel now.";
const SLACK_FAILURE_MESSAGE = "The channel was not connected. Check the webhook URL, then try again.";

const SLACK_SUBSCRIBE_ENDPOINT = "/api/slack/subscribe";

type SlackSubscribeResult = { ok: boolean; message: string; channelName?: string };

export async function requestSlackSubscription(
  webhookUrl: string,
  options?: { channelName?: string },
): Promise<SlackSubscribeResult> {
  const trimmed = webhookUrl.trim();
  if (!trimmed || !trimmed.startsWith("https://hooks.slack.com/")) {
    return { ok: false, message: SLACK_INVALID_URL_MESSAGE };
  }

  try {
    const res = await fetch(SLACK_SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: trimmed,
        channelName: options?.channelName?.trim() || undefined,
      }),
    });
    const data: {
      ok?: boolean;
      error?: string;
      message?: string;
      channelName?: string;
    } | null = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      return {
        ok: true,
        message: SLACK_CONNECTED_MESSAGE,
        channelName: data.channelName,
      };
    }
    return { ok: false, message: describeRejection(res.status, data?.error, SLACK_FAILURE_MESSAGE) };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}
