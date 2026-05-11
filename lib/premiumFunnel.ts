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

  return (
    typeof payload.path === "string" &&
    payload.path.length > 0 &&
    typeof payload.occurredAt === "string" &&
    isPremiumFunnelEventType(String(payload.type)) &&
    isPremiumIntentSource(String(payload.source))
  );
};

export const dispatchPremiumFunnelEvent = async (
  payload: PremiumFunnelEvent,
  webhookUrl = process.env.PREMIUM_FUNNEL_WEBHOOK_URL,
) => {
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[premium-funnel]", payload);
  }
};
