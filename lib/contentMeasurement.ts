export type ContentCluster = "authority" | "pain" | "tool" | "vc";
export type ContentIntent = "cfo" | "board" | "vp-product" | "vc-partner";
export type ContentEventType =
  | "organic_entrance"
  | "cta_conversion"
  | "assisted_conversion"
  | "decision_block_view"
  | "weekly_brief_handoff"
  | "operations_handoff"
  | "artifact_interaction";
export type ContentArtifactAction = "copy" | "screenshot" | "export";

export type ContentMeasurementEvent = {
  pagePath: string;
  cluster: ContentCluster;
  intent: ContentIntent;
  type: ContentEventType;
  ctaId?: string;
  internalPath?: string;
  artifactAction?: ContentArtifactAction;
  indexEligible?: boolean;
  refreshOnSchedule?: boolean;
};

export const CONTENT_MEASUREMENT_ENDPOINT = "/api/telemetry/content-measurement";

export const isContentCluster = (value: string): value is ContentCluster =>
  value === "authority" || value === "pain" || value === "tool" || value === "vc";

export const isContentIntent = (value: string): value is ContentIntent =>
  value === "cfo" || value === "board" || value === "vp-product" || value === "vc-partner";

export const isContentEventType = (value: string): value is ContentEventType =>
  value === "organic_entrance" ||
  value === "cta_conversion" ||
  value === "assisted_conversion" ||
  value === "decision_block_view" ||
  value === "weekly_brief_handoff" ||
  value === "operations_handoff" ||
  value === "artifact_interaction";

export const isContentArtifactAction = (value: string): value is ContentArtifactAction =>
  value === "copy" || value === "screenshot" || value === "export";

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
    isContentEventType(String(payload.type)) &&
    (payload.type !== "artifact_interaction" || isContentArtifactAction(String(payload.artifactAction)))
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
  });
};

export type ContentMeasurementReport = {
  organicEntrancesByCluster: Record<ContentCluster, number>;
  ctaConversionsByPage: Record<string, number>;
  ctaConversionsByCluster: Record<ContentCluster, number>;
  assistedConversionsByInternalPath: Record<string, number>;
  eventsByIntent: Record<ContentIntent, number>;
  decisionBlockViewsByPage: Record<string, number>;
  weeklyBriefHandoffsByPage: Record<string, number>;
  operationsHandoffsByPage: Record<string, number>;
  artifactInteractionsByAction: Record<ContentArtifactAction, number>;
  decisionReadySessionsEstimateByPage: Record<string, number>;
};

const emptyArtifactRecord = (): Record<ContentArtifactAction, number> => ({
  copy: 0,
  screenshot: 0,
  export: 0,
});

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
    decisionBlockViewsByPage: {},
    weeklyBriefHandoffsByPage: {},
    operationsHandoffsByPage: {},
    artifactInteractionsByAction: emptyArtifactRecord(),
    decisionReadySessionsEstimateByPage: {},
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

    if (event.type === "decision_block_view") {
      report.decisionBlockViewsByPage[event.pagePath] = (report.decisionBlockViewsByPage[event.pagePath] ?? 0) + 1;
    }

    if (event.type === "weekly_brief_handoff") {
      report.weeklyBriefHandoffsByPage[event.pagePath] = (report.weeklyBriefHandoffsByPage[event.pagePath] ?? 0) + 1;
    }

    if (event.type === "operations_handoff") {
      report.operationsHandoffsByPage[event.pagePath] = (report.operationsHandoffsByPage[event.pagePath] ?? 0) + 1;
    }

    if (event.type === "artifact_interaction" && event.artifactAction) {
      report.artifactInteractionsByAction[event.artifactAction] += 1;
    }
  }

  const decisionReadyPagePaths = new Set([
    ...Object.keys(report.weeklyBriefHandoffsByPage),
    ...Object.keys(report.operationsHandoffsByPage),
  ]);
  for (const pagePath of decisionReadyPagePaths) {
    const decisionViews = report.decisionBlockViewsByPage[pagePath] ?? 0;
    const handoffs = (report.weeklyBriefHandoffsByPage[pagePath] ?? 0) + (report.operationsHandoffsByPage[pagePath] ?? 0);
    report.decisionReadySessionsEstimateByPage[pagePath] = Math.min(decisionViews, handoffs);
  }

  return report;
};
