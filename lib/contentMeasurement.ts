export type ContentCluster = "authority" | "pain" | "tool" | "vc";
export type ContentIntent = "cfo" | "board" | "vp-product" | "vc-partner";
export type ContentEventType = "organic_entrance" | "cta_conversion" | "assisted_conversion";

export type ContentMeasurementEvent = {
  pagePath: string;
  cluster: ContentCluster;
  intent: ContentIntent;
  type: ContentEventType;
  ctaId?: string;
  internalPath?: string;
};

export const CONTENT_MEASUREMENT_ENDPOINT = "/api/telemetry/content-measurement";

export const isContentCluster = (value: string): value is ContentCluster =>
  value === "authority" || value === "pain" || value === "tool" || value === "vc";

export const isContentIntent = (value: string): value is ContentIntent =>
  value === "cfo" || value === "board" || value === "vp-product" || value === "vc-partner";

export const isContentEventType = (value: string): value is ContentEventType =>
  value === "organic_entrance" || value === "cta_conversion" || value === "assisted_conversion";

export const isContentMeasurementEvent = (input: unknown): input is ContentMeasurementEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  return (
    typeof payload.pagePath === "string" &&
    payload.pagePath.length > 0 &&
    isContentCluster(String(payload.cluster)) &&
    isContentIntent(String(payload.intent)) &&
    isContentEventType(String(payload.type))
  );
};

export const trackContentCtaConversion = (event: Omit<ContentMeasurementEvent, "type"> & { type?: "cta_conversion" }) => {
  const payload: ContentMeasurementEvent = {
    ...event,
    type: "cta_conversion",
  };
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon(CONTENT_MEASUREMENT_ENDPOINT, beaconBody);
    if (queued) {
      return;
    }
  }

  void fetch(CONTENT_MEASUREMENT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Ignore telemetry network failures to keep the client console clean.
  });
};

export type ContentMeasurementReport = {
  organicEntrancesByCluster: Record<ContentCluster, number>;
  ctaConversionsByPage: Record<string, number>;
  ctaConversionsByCluster: Record<ContentCluster, number>;
  assistedConversionsByInternalPath: Record<string, number>;
  eventsByIntent: Record<ContentIntent, number>;
};

const emptyClusterRecord = (): Record<ContentCluster, number> => ({
  authority: 0,
  pain: 0,
  tool: 0,
  vc: 0,
});

const emptyIntentRecord = (): Record<ContentIntent, number> => ({
  cfo: 0,
  board: 0,
  "vp-product": 0,
  "vc-partner": 0,
});

export const buildContentMeasurementReport = (
  events: ContentMeasurementEvent[],
): ContentMeasurementReport => {
  const report: ContentMeasurementReport = {
    organicEntrancesByCluster: emptyClusterRecord(),
    ctaConversionsByPage: {},
    ctaConversionsByCluster: emptyClusterRecord(),
    assistedConversionsByInternalPath: {},
    eventsByIntent: emptyIntentRecord(),
  };

  for (const event of events) {
    report.eventsByIntent[event.intent] += 1;

    if (event.type === "organic_entrance") {
      report.organicEntrancesByCluster[event.cluster] += 1;
    }

    if (event.type === "cta_conversion") {
      report.ctaConversionsByPage[event.pagePath] = (report.ctaConversionsByPage[event.pagePath] ?? 0) + 1;
      report.ctaConversionsByCluster[event.cluster] += 1;
    }

    if (event.type === "assisted_conversion" && event.internalPath) {
      report.assistedConversionsByInternalPath[event.internalPath] =
        (report.assistedConversionsByInternalPath[event.internalPath] ?? 0) + 1;
    }
  }

  return report;
};
