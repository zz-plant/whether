export type PremiumFunnelEventType =
  | "premium_intent"
  | "premium_gate_view"
  | "premium_checkout_start"
  | "premium_checkout_complete";

export type PremiumPlanCandidate = "pro" | "team";

export type PremiumSeatBand = "1" | "2-5" | "6-20" | "21+";

export const PREMIUM_INTENT_SOURCES = [
  "export_brief",
  "runway_planner",
  "integrations",
  "api_access",
  "team_workflow",
  // The pricing page. Distinct from the five feature-located sources above:
  // those record someone wanting a capability, this records someone wanting it
  // after seeing what it costs, which is the only one of the six that speaks to
  // willingness to pay.
  "pricing_page",
] as const;

export type PremiumIntentSource = (typeof PREMIUM_INTENT_SOURCES)[number];

export type PremiumFunnelEvent = {
  type: PremiumFunnelEventType;
  source: PremiumIntentSource;
  path: string;
  ctaId?: string;
  detail?: string;
  planCandidate?: PremiumPlanCandidate;
  seatBand?: PremiumSeatBand;
  occurredAt: string;
};

export const PREMIUM_EVENT_ENDPOINT = "/api/telemetry/premium-funnel";

export const isPremiumIntentSource = (value: string): value is PremiumIntentSource =>
  PREMIUM_INTENT_SOURCES.includes(value as PremiumIntentSource);

export const isPremiumFunnelEventType = (value: string): value is PremiumFunnelEventType =>
  value === "premium_intent" ||
  value === "premium_gate_view" ||
  value === "premium_checkout_start" ||
  value === "premium_checkout_complete";

export const isPremiumPlanCandidate = (value: string): value is PremiumPlanCandidate =>
  value === "pro" || value === "team";

export const isPremiumSeatBand = (value: string): value is PremiumSeatBand =>
  value === "1" || value === "2-5" || value === "6-20" || value === "21+";

export const MAX_PATH_LENGTH = 512;
export const MAX_LABEL_LENGTH = 128;
const MAX_TIMESTAMP_LENGTH = 64;

/** Optional unless `required`; when present must be a string within `max`. */
const withinBound = (value: unknown, max: number, required = false): boolean => {
  if (value === undefined || value === null) return !required;
  return typeof value === "string" && value.length > 0 && value.length <= max;
};

export const isValidPremiumFunnelEvent = (input: unknown): input is PremiumFunnelEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  const planCandidate = payload.planCandidate;
  if (planCandidate !== undefined && !isPremiumPlanCandidate(String(planCandidate))) {
    return false;
  }

  const seatBand = payload.seatBand;
  if (seatBand !== undefined && !isPremiumSeatBand(String(seatBand))) {
    return false;
  }

  /* The intake is public by necessity — it is browser telemetry — and every accepted
     event is now persisted. Unbounded free-text fields would let one caller write
     arbitrarily large KV values, so each is capped at a length no legitimate CTA needs. */
  if (!withinBound(payload.path, MAX_PATH_LENGTH, true)) return false;
  if (!withinBound(payload.ctaId, MAX_LABEL_LENGTH)) return false;
  if (!withinBound(payload.detail, MAX_LABEL_LENGTH)) return false;
  if (!withinBound(payload.occurredAt, MAX_TIMESTAMP_LENGTH, true)) return false;

  return (
    isPremiumFunnelEventType(String(payload.type)) &&
    isPremiumIntentSource(String(payload.source))
  );
};

/**
 * Persist first, then fan out to the webhook when one is configured.
 *
 * The webhook used to be the only sink, which meant an unset PREMIUM_FUNNEL_WEBHOOK_URL
 * discarded every production event silently. Durable capture no longer depends on that
 * env var being set; the webhook is now an optional mirror for external dashboards.
 */
export const dispatchPremiumFunnelEvent = async (
  payload: PremiumFunnelEvent,
  webhookUrl = process.env.PREMIUM_FUNNEL_WEBHOOK_URL,
) => {
  /* Imported lazily so the client bundle that pulls the validators and endpoint
     constant out of this module does not also pull in the KV storage layer. */
  const { recordPremiumFunnelEvent } = await import("./storage/premiumFunnelEventRepository");
  await recordPremiumFunnelEvent(payload);

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }
};
