export type WebVitalMetricName =
  | "CLS"
  | "FCP"
  | "INP"
  | "LCP"
  | "TTFB";

export type WebVitalMetric = {
  name: WebVitalMetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  delta: number;
  path: string;
  navigationType: string;
};

export const WEB_VITALS_TELEMETRY_ENDPOINT = "/api/telemetry/web-vitals";

const isRating = (value: unknown): value is WebVitalMetric["rating"] =>
  value === "good" || value === "needs-improvement" || value === "poor";

const isName = (value: unknown): value is WebVitalMetricName =>
  value === "CLS" ||
  value === "FCP" ||
  value === "INP" ||
  value === "LCP" ||
  value === "TTFB";

export const isWebVitalMetric = (input: unknown): input is WebVitalMetric => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  return (
    isName(payload.name) &&
    typeof payload.value === "number" &&
    Number.isFinite(payload.value) &&
    payload.value >= 0 &&
    payload.value <= 60_000 &&
    isRating(payload.rating) &&
    typeof payload.id === "string" &&
    payload.id.length > 0 &&
    typeof payload.delta === "number" &&
    Number.isFinite(payload.delta) &&
    Math.abs(payload.delta) <= 60_000 &&
    typeof payload.path === "string" &&
    payload.path.length > 0 &&
    payload.path.length <= 2048 &&
    typeof payload.navigationType === "string" &&
    payload.navigationType.length > 0
  );
};

export const trackWebVitalMetric = (metric: WebVitalMetric) => {
  const body = JSON.stringify(metric);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon(WEB_VITALS_TELEMETRY_ENDPOINT, beaconBody);
    if (queued) {
      return;
    }
  }

  void fetch(WEB_VITALS_TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Ignore telemetry network failures to keep the client console clean.
  });
};
