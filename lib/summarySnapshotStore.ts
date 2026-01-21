import type { RegimeAssessment } from "./regimeEngine";

export type SummarySnapshotPayload = {
  regime: RegimeAssessment["regime"];
  guidance: string;
  constraints: string[];
};

type SummarySnapshotCache = {
  weekly: SummarySnapshotPayload | null;
  monthly: SummarySnapshotPayload | null;
};

const summarySnapshotCache: SummarySnapshotCache = {
  weekly: null,
  monthly: null,
};

export const getSummarySnapshot = (cadence: keyof SummarySnapshotCache) =>
  summarySnapshotCache[cadence];

export const updateSummarySnapshot = (
  cadence: keyof SummarySnapshotCache,
  snapshot: SummarySnapshotPayload
) => {
  const previous = summarySnapshotCache[cadence];
  summarySnapshotCache[cadence] = snapshot;
  return previous;
};
