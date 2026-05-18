/**
 * Email delivery interface for weekly brief emails.
 * Designed to work with Cloudflare Email Service or any SMTP provider
 * via a minimal adapter interface. Currently stubs the delivery path.
 */

import { buildWeeklyBriefEmailHtml, buildWeeklyBriefEmailText, type WeeklyBriefEmailProps } from "./weeklyBriefEmail";

export type EmailRecipient = {
  email: string;
  name?: string;
  tickerConfig?: string;
  stageConfig?: string;
};

export type EmailDeliveryAdapter = {
  send: (params: { to: EmailRecipient; subject: string; html: string; text: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/**
 * Cloudflare Email Service adapter.
 * Uses the EMAIL binding available at globalThis in the Workers runtime.
 * Falls back to a console stub when the binding is unavailable (local dev).
 */
export const createCloudflareEmailAdapter = (): EmailDeliveryAdapter => {
  const emailBinding = (globalThis as { EMAIL?: { send: (msg: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    html: string;
    text: string;
  }) => Promise<unknown> } }).EMAIL;

  if (!emailBinding) {
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

/**
 * Build and send a weekly brief email for a given recipient.
 */
export const sendWeeklyBriefEmail = async (
  adapter: EmailDeliveryAdapter,
  recipient: EmailRecipient,
  briefProps: Omit<WeeklyBriefEmailProps, "briefUrl" | "tickerLabel"> & { tickerLabel?: string },
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const briefUrl = `https://whether.app/${recipient.tickerConfig ? `?ticker=${recipient.tickerConfig}` : ""}`;

  const props: WeeklyBriefEmailProps = {
    ...briefProps,
    briefUrl,
    tickerLabel: recipient.tickerConfig ?? briefProps.tickerLabel,
  };

  const subject = `Whether Brief — ${props.regimeLabel}`;
  const html = buildWeeklyBriefEmailHtml(props);
  const text = buildWeeklyBriefEmailText(props);

  return adapter.send({ to: recipient, subject, html, text });
};

/**
 * In-memory subscription store for prototype.
 * Replace with KV or database in production.
 */
let subscriptions: Array<EmailRecipient & { active: boolean }> = [];

export const subscribeEmail = (recipient: EmailRecipient): { ok: true } => {
  const existing = subscriptions.findIndex((s) => s.email === recipient.email);
  if (existing >= 0) {
    subscriptions[existing] = { ...subscriptions[existing], ...recipient, active: true };
  } else {
    subscriptions.push({ ...recipient, active: true });
  }
  return { ok: true };
};

export const unsubscribeEmail = (email: string): { ok: true } => {
  const existing = subscriptions.find((s) => s.email === email);
  if (existing) {
    existing.active = false;
  }
  return { ok: true };
};

export const getActiveSubscriptions = (): Array<EmailRecipient> => {
  return subscriptions.filter((s) => s.active);
};

export const clearSubscriptions = (): void => {
  subscriptions = [];
};