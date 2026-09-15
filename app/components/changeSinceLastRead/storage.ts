import type { RegimeAssessment } from "../../../lib/regimeEngine";

export type LastReadSnapshot = {
  recordDate: string;
  assessment: RegimeAssessment;
  readAt: string;
};

const LAST_READ_SNAPSHOT_STORAGE_KEY = "whether.lastReadSnapshot";

/**
 * Impact tone for a signed weekly move.
 *
 * Size sets the impact band; direction sets the colour. Colouring by magnitude
 * alone painted every large move rose, so a 2-point tightness *drop* — good
 * news — arrived looking like an alarm.
 */
export const getImpactTone = (
  delta: number,
  { increaseIsPositive = false }: { increaseIsPositive?: boolean } = {},
) => {
  const size = Math.abs(delta);
  const impactLabel = size >= 1.5 ? "High impact" : size >= 0.75 ? "Medium impact" : "Low impact";

  if (size < 0.05) {
    return {
      label: "Unchanged",
      impactLabel: "Unchanged",
      directionLabel: "unchanged",
      className: "border-slate-400/70 bg-slate-500/15 text-slate-100",
    };
  }

  const rose = delta > 0;
  const improved = increaseIsPositive ? rose : !rose;

  return {
    label: `${rose ? "Up" : "Down"} · ${impactLabel}`,
    impactLabel,
    directionLabel: rose ? "rose" : "fell",
    className: improved
      ? "border-emerald-300/80 bg-emerald-500/15 text-emerald-100"
      : "border-amber-300/80 bg-amber-500/15 text-amber-100",
  };
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
