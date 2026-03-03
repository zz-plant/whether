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
