import type { RegimeAssessment } from "../../../lib/regimeEngine";

export type LastReadSnapshot = {
  recordDate: string;
  assessment: RegimeAssessment;
  readAt: string;
};

export const LAST_READ_SNAPSHOT_STORAGE_KEY = "whether.lastReadSnapshot";

export const getImpactTone = (value: number) => {
  if (value >= 1.5) {
    return { label: "High impact", className: "border-rose-300/80 bg-rose-500/15 text-rose-100" };
  }
  if (value >= 0.75) {
    return { label: "Medium impact", className: "border-amber-300/80 bg-amber-500/15 text-amber-100" };
  }
  return { label: "Low impact", className: "border-emerald-300/80 bg-emerald-500/15 text-emerald-100" };
};

export const hasAssessmentChanged = (
  previous: LastReadSnapshot,
  current: RegimeAssessment,
  recordDate: string
) =>
  previous.recordDate !== recordDate ||
  previous.assessment.regime !== current.regime ||
  previous.assessment.scores.tightness !== current.scores.tightness ||
  previous.assessment.scores.riskAppetite !== current.scores.riskAppetite ||
  previous.assessment.scores.baseRate !== current.scores.baseRate ||
  previous.assessment.scores.curveSlope !== current.scores.curveSlope;

export const readStoredSnapshot = () => {
  try {
    const stored = window.localStorage.getItem(LAST_READ_SNAPSHOT_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as LastReadSnapshot;
    return parsed?.recordDate && parsed?.assessment?.regime ? parsed : null;
  } catch {
    return null;
  }
};

export const writeStoredSnapshot = ({
  assessment,
  recordDate,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
}) => {
  try {
    window.localStorage.setItem(
      LAST_READ_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        recordDate,
        assessment,
        readAt: new Date().toISOString(),
      } satisfies LastReadSnapshot),
    );
  } catch {
    // Ignore storage errors to keep console clean.
  }
};
