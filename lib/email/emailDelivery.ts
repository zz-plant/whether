/**
 * Email delivery interface for weekly brief emails.
 * Designed to work with Cloudflare Email Service or any SMTP provider
 * via a minimal adapter interface.
 */

import type { OperatorStage } from "../report/operatorStage";
import type { RunwayBand } from "../report/operatorRunway";
import type { PlanLines, PlanRunway } from "../alert/planLines";
import type { DeliveryOutcome } from "../delivery/fanOut";

type EmailRecipient = {
  email: string;
  name?: string;
  /**
   * The reader's company stage, as they set it on the site. Used to scale the
   * five areas' rules the way the homepage already does; absent means the
   * published call, unscaled.
   */
  stage?: OperatorStage;
  /** The band they set beside their plan lines, which a crossing email names. */
  planRunway?: PlanRunway;
  /** The lines they set for their own plan, which the brief prints first. */
  planLines?: PlanLines[];
  /** The runway band they chose on the site, which picks the note their brief prints. */
  runwayBand?: RunwayBand;
  /** The day that band was set: they chose it when they subscribed, and it ages from there. Absent for one that does not age. */
  runwayBandSetOn?: string;
  /** The subscriber's unsubscribe token, so outgoing mail can carry a one-click link. */
  token?: string;
};

export type EmailDeliveryAdapter = {
  /** Absent means live (custom adapters in tests are real senders). */
  mode?: "live" | "stub";
  send: (params: {
    to: EmailRecipient;
    subject: string;
    html: string;
    text: string;
    /**
     * Headers the client acts on. `List-Unsubscribe` and `List-Unsubscribe-Post`
     * are what make Gmail and Apple Mail show their own unsubscribe button;
     * without them the one-click endpoint exists but nothing advertises it.
     */
    headers?: Record<string, string>;
  }) => Promise<EmailSendResult>;
};

/**
 * `refused` is Cloudflare declining the recipient before anything was sent,
 * because the address is on its suppression list: a hard bounce, a complaint, or
 * a soft bounce in the last day. It is not a failed send.
 */
type EmailSendResult = { ok: true } | { ok: false; error: string; refused?: true };

/* developers.cloudflare.com/email-service/concepts/suppressions/: with "Drop suppressed
   recipients" off, Cloudflare's default, the binding throws this code. */
const isRefusedRecipient = (error: unknown) =>
  typeof error === "object" && error !== null && Reflect.get(error, "code") === "E_RECIPIENT_SUPPRESSED";

export const EMAIL_NOT_CONFIGURED_ERROR = "Email delivery is not configured on this deployment.";

/**
 * Cloudflare's email binding, or — outside production only — a stub that logs
 * instead of sending.
 *
 * The stub used to answer `ok: true` everywhere, so a production deploy without
 * the binding told every subscriber "check your email" for mail that never
 * left. A missing binding in production is now a failed send, which the
 * subscribe surfaces already know how to show.
 */
export const createCloudflareEmailAdapter = (
  options: { allowStub?: boolean } = {},
): EmailDeliveryAdapter => {
  const emailBinding = (globalThis as { EMAIL?: { send: (msg: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    html: string;
    text: string;
    /* Cloudflare takes only the headers on its allowlist, `X-` ones, and well-formed
       values, and refuses the whole message over one it does not take
       (developers.cloudflare.com/email-service/reference/headers/). */
    headers?: Record<string, string>;
  }) => Promise<unknown> } }).EMAIL;

  if (!emailBinding) {
    const allowStub = options.allowStub ?? process.env.NODE_ENV !== "production";
    if (!allowStub) {
      return {
        mode: "stub",
        send: async () => ({ ok: false, error: EMAIL_NOT_CONFIGURED_ERROR }),
      };
    }
    console.warn("[EMAIL] No EMAIL binding found — using stub. Add the EMAIL sendEmail binding to cloudflare.config.ts.");
    return {
      mode: "stub",
      send: async ({ to, subject }) => {
        console.log(`[EMAIL STUB] To: ${to.email} | Subject: ${subject}`);
        return { ok: true };
      },
    };
  }

  return {
    mode: "live",
    send: async ({ to, subject, html, text, headers }) => {
      try {
        await emailBinding.send({
          to: to.email,
          from: { email: "brief@whether.work", name: "Whether Brief" },
          subject,
          html,
          text,
          ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
        });
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return isRefusedRecipient(error) ? { ok: false, error: message, refused: true } : { ok: false, error: message };
      }
    },
  };
};

import { getSubscriberStore } from "./subscriberStore";

/**
 * A send in the fan-out's words (`lib/delivery/fanOut.ts`): a recipient Cloudflare
 * refuses is gone, not failed, so a bounced address does not turn the Monday brief
 * or the daily alert step red and mail the ops notice every run.
 */
export const emailDeliveryOutcome = (result: EmailSendResult): DeliveryOutcome =>
  result.ok ? "sent" : result.refused ? "gone" : "failed";

/** Tells the subscriber record Cloudflare refused it, the fan-out's `retire` for every email stream. */
export const recordRefusedRecipient = (recipient: { email: string }) =>
  getSubscriberStore().recordDeliveryRefusal(recipient.email, new Date());

export const getActiveSubscriptions = async (): Promise<EmailRecipient[]> => {
  const store = getSubscriberStore();
  // The Monday fan-out: an alerts-only subscriber is active and verified and asked
  // not to get this mail.
  const subscribers = await store.listWeeklySubscribers();
  // Carries the token, which the weekly brief's unsubscribe link needs. This returned
  // bare addresses until 2026-09-07, which is why that mail went out without one.
  return subscribers.map((sub) => ({
    email: sub.email,
    token: sub.token,
    ...(sub.stage ? { stage: sub.stage } : {}),
    ...(sub.planRunway ? { planRunway: sub.planRunway } : {}),
    ...(sub.planLines.length > 0 ? { planLines: sub.planLines } : {}),
    ...(sub.runwayBand ? { runwayBand: sub.runwayBand, ...(sub.runwayBandFixed ? {} : { runwayBandSetOn: sub.subscribedAt }) } : {}),
  }));
};
