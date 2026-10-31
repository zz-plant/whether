/**
 * Email delivery interface for weekly brief emails.
 * Designed to work with Cloudflare Email Service or any SMTP provider
 * via a minimal adapter interface.
 */

import type { OperatorStage } from "../report/operatorStage";
import type { PlanLines, PlanRunway } from "../alert/planLines";

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
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

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
  }) => Promise<unknown> } }).EMAIL;

  if (!emailBinding) {
    const allowStub = options.allowStub ?? process.env.NODE_ENV !== "production";
    if (!allowStub) {
      return {
        mode: "stub",
        send: async () => ({ ok: false, error: EMAIL_NOT_CONFIGURED_ERROR }),
      };
    }
    console.warn("[EMAIL] No EMAIL binding found — using stub. Add send_email binding to wrangler.toml.");
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
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
};

import { getSubscriberStore } from "./subscriberStore";

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
  }));
};
