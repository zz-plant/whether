import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { createBrowserSource } from "../browserSource";

type LastReadSnapshot = {
  recordDate: string;
  assessment: RegimeAssessment;
  readAt: string;
};

const LAST_READ_SNAPSHOT_STORAGE_KEY = "whether.lastReadSnapshot";

/**
 * Impact tone for a signed weekly move.
 *
 * Size sets the impact band; direction sets the colour, which is the text ink
 * only: the tag it colours is a link, so its frame is the control's (§XXVII). Colouring by magnitude
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
      className: "text-slate-100",
    };
  }

  const rose = delta > 0;
  const improved = increaseIsPositive ? rose : !rose;

  return {
    label: `${rose ? "Up" : "Down"} · ${impactLabel}`,
    impactLabel,
    directionLabel: rose ? "rose" : "fell",
    className: improved
      ? "text-emerald-200"
      : "text-amber-200",
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

const readStoredSnapshot = () => {
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

const writeStoredSnapshot = ({
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

/*
 * The read and the write are the same slot, and the read has to win.
 *
 * The strip's whole subject is what changed since the last visit, and this
 * visit overwrites that record. Both sides live here rather than in the
 * component so the ordering is a property of the module that owns the slot:
 * `rememberReadSnapshot` takes the source's snapshot before writing, and the
 * source caches it, so "what this browser last saw" cannot become "what it is
 * seeing now" through some later re-read.
 */
export const lastReadSnapshotSource = createBrowserSource<LastReadSnapshot | null>({
  read: readStoredSnapshot,
  serverValue: null,
});

export const rememberReadSnapshot = (visit: { assessment: RegimeAssessment; recordDate: string }) => {
  lastReadSnapshotSource.getSnapshot();
  writeStoredSnapshot(visit);
};
