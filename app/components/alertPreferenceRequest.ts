/**
 * The one client-side path to persist alert channel preferences.
 *
 * The panel used to POST this inline, fire-and-forget, behind a `.catch()` that
 * kept the optimistic checkmark — so a channel read as recorded when the write
 * had failed. Pulling the request out is what makes that testable: the caller
 * gets a boolean it has to act on, and this file is where a failure is decided
 * rather than swallowed.
 */

export type DeliveryChannel = "slack" | "email" | "webhook";
export type ChannelPreferences = Record<DeliveryChannel, boolean>;

export const ALERT_PREFERENCES_ENDPOINT = "/api/alert-preferences";

export const CHANNELS: readonly DeliveryChannel[] = ["slack", "email", "webhook"];

export async function saveAlertPreferences(
  clientId: string,
  preferences: ChannelPreferences,
): Promise<boolean> {
  try {
    const response = await fetch(ALERT_PREFERENCES_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": clientId },
      body: JSON.stringify({ clientId, preferences }),
    });

    // A 4xx or 5xx resolves rather than throwing, which is exactly how the
    // previous fire-and-forget call missed every server-side rejection.
    return response.ok;
  } catch {
    return false;
  }
}
