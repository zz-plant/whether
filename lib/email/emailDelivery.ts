/**
 * Email delivery interface for weekly brief emails.
 * Designed to work with Cloudflare Email Service or any SMTP provider
 * via a minimal adapter interface.
 */

export type EmailRecipient = {
  email: string;
  name?: string;
  tickerConfig?: string;
  stageConfig?: string;
};

export type EmailDeliveryAdapter = {
  send: (params: { to: EmailRecipient; subject: string; html: string; text: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
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
        send: async () => ({ ok: false, error: EMAIL_NOT_CONFIGURED_ERROR }),
      };
    }
    console.warn("[EMAIL] No EMAIL binding found — using stub. Add send_email binding to wrangler.toml.");
    return {
      send: async ({ to, subject }) => {
        console.log(`[EMAIL STUB] To: ${to.email} | Subject: ${subject}`);
        return { ok: true };
      },
    };
  }

  return {
    send: async ({ to, subject, html, text }) => {
      try {
        await emailBinding.send({
          to: to.email,
          from: { email: "brief@whether.work", name: "Whether Brief" },
          subject,
          html,
          text,
        });
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
};

import { getSubscriberStore, resetSubscriberStore } from "./subscriberStore";

export const getActiveSubscriptions = async (): Promise<EmailRecipient[]> => {
  const store = getSubscriberStore();
  const emails = await store.getActiveSubscriptions();
  return emails.map((email) => ({ email }));
};

export const clearSubscriptions = async (): Promise<void> => {
  resetSubscriberStore();
};
