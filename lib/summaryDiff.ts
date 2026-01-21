import type { SummarySnapshotPayload } from "./summarySnapshotStore";

export type SummaryDiff = {
  hasPrevious: boolean;
  regimeShift: {
    from: SummarySnapshotPayload["regime"] | null;
    to: SummarySnapshotPayload["regime"];
    changed: boolean;
  };
  guidance: {
    previous: string | null;
    current: string;
    changed: boolean;
  };
  constraints: {
    added: string[];
    removed: string[];
  };
  hasChanges: boolean;
};

export const buildSummaryDiff = (
  current: SummarySnapshotPayload,
  previous: SummarySnapshotPayload | null
): SummaryDiff => {
  const hasPrevious = Boolean(previous);
  const regimeShift = {
    from: previous?.regime ?? null,
    to: current.regime,
    changed: Boolean(previous && previous.regime !== current.regime),
  };
  const guidance = {
    previous: previous?.guidance ?? null,
    current: current.guidance,
    changed: Boolean(previous && previous.guidance !== current.guidance),
  };
  const previousConstraints = new Set(previous?.constraints ?? []);
  const currentConstraints = new Set(current.constraints);
  const added = hasPrevious
    ? current.constraints.filter((item) => !previousConstraints.has(item))
    : [];
  const removed = hasPrevious
    ? (previous?.constraints ?? []).filter((item) => !currentConstraints.has(item))
    : [];
  const hasChanges =
    regimeShift.changed || guidance.changed || added.length > 0 || removed.length > 0;

  return {
    hasPrevious,
    regimeShift,
    guidance,
    constraints: {
      added,
      removed,
    },
    hasChanges,
  };
};
