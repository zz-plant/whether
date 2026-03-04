export type ProductEventName =
  | "briefing_view_loaded"
  | "posture_delta_opened"
  | "evidence_anchor_clicked"
  | "playbook_role_changed"
  | "scenario_assumption_changed"
  | "scenario_reset_to_live"
  | "brief_export_started"
  | "brief_export_succeeded"
  | "brief_export_failed";

export type ProductEventPayload = Record<string, string | number | boolean | null | undefined>;

export const trackProductEvent = (
  name: ProductEventName,
  payload: ProductEventPayload = {},
) => {
  if (typeof window === "undefined") {
    return;
  }

  const detail = {
    name,
    payload,
    capturedAt: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent("whether:product-event", { detail }));
};
