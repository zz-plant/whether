/**
 * The one client-side path to POST /api/email/subscribe.
 *
 * The settings panel used to call the KV-backed subscriber store directly. A browser has
 * no KV binding, so the store handed back its in-memory fallback, the call resolved, and
 * the panel reported success for a subscription that was never stored and never triggered
 * a verification email. Both subscribe surfaces now share this request, so neither can
 * drift back into reporting a local write as a subscription.
 */

export type SubscribeResult = { ok: boolean; message: string };

export type SubscribeOptions = {
  /** Also send regime-change alerts between Mondays. Omitted leaves a standing choice alone. */
  alerts?: boolean;
};

export const SUBSCRIBE_ENDPOINT = "/api/email/subscribe";

const INVALID_EMAIL_MESSAGE = "Please enter a valid email address.";
const VERIFY_MESSAGE = "Check your email to verify your subscription.";
const FAILURE_MESSAGE = "Failed to subscribe. Please try again.";
const NETWORK_MESSAGE = "A network error occurred. Please try again.";

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
      body: JSON.stringify(
        typeof options?.alerts === "boolean"
          ? { email: trimmed, alerts: options.alerts }
          : { email: trimmed },
      ),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (res.ok && data?.ok) {
      return { ok: true, message: VERIFY_MESSAGE };
    }
    return { ok: false, message: data?.error || FAILURE_MESSAGE };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}
