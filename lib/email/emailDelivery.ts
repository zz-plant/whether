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

const SUBSCRIPTIONS_KV_KEY = "email:subscriptions";

type StoredSubscriber = EmailRecipient & { active: boolean; subscribedAt?: string };

const getKv = () => (globalThis as { WHETHER_DURABLE_KV?: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> } }).WHETHER_DURABLE_KV;

const readSubscriptions = async (): Promise<StoredSubscriber[]> => {
  try {
    const kv = getKv();
    if (!kv) return [];
    const raw = await kv.get(SUBSCRIPTIONS_KV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const writeSubscriptions = async (subs: StoredSubscriber[]): Promise<void> => {
  try {
    const kv = getKv();
    if (kv) await kv.put(SUBSCRIPTIONS_KV_KEY, JSON.stringify(subs));
  } catch { /* KV write failure is non-fatal for subscription */ }
};

export const subscribeEmail = async (recipient: EmailRecipient): Promise<{ ok: true }> => {
  const subs = await readSubscriptions();
  const existing = subs.findIndex((s) => s.email === recipient.email);
  if (existing >= 0) {
    subs[existing] = { ...subs[existing], ...recipient, active: true };
  } else {
    subs.push({ ...recipient, active: true, subscribedAt: new Date().toISOString() });
  }
  await writeSubscriptions(subs);
  return { ok: true };
};

export const unsubscribeEmail = async (email: string): Promise<{ ok: true }> => {
  const subs = await readSubscriptions();
  const existing = subs.find((s) => s.email === email);
  if (existing) existing.active = false;
  await writeSubscriptions(subs);
  return { ok: true };
};

export const getActiveSubscriptions = async (): Promise<EmailRecipient[]> => {
  const subs = await readSubscriptions();
  return subs.filter((s) => s.active).map(({ active: _, subscribedAt: __, ...rest }) => rest);
};

export const clearSubscriptions = async (): Promise<void> => {
  await writeSubscriptions([]);
};