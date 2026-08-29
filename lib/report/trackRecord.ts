/**
 * The auditable record of what this product has called.
 *
 * Published constants and a derivable score prove the number is *derived*. They
 * do not prove the call is *worth following* — which is the actual objection this
 * category attracts ("macro horoscope for founders"). What answers that is the
 * record: how far back the call goes, how often it moved, and how long the
 * current one has stood.
 *
 * Deliberately not a claim about accuracy. Nothing here says the call was right,
 * because the engine does not forecast and cannot be scored that way. It claims
 * consistency and auditability, which are the two things the engine does deliver
 * and which a static competitor cannot copy.
 */
import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildBoldnessScore } from "./weeklyLeadershipBrief";

export type TrackRecordRow = {
  recordDate: string;
  regime: TimeMachineRegimeEntry["regime"];
  regimeLabel: string;
  boldness: number;
  /** Change in boldness from the preceding month. Null for the oldest row. */
  boldnessDelta: number | null;
  /** True when this month's regime differs from the month before it. */
  changed: boolean;
};

export type TrackRecord = {
  /** Months of continuous record. */
  monthsCovered: number;
  firstRecordDate: string;
  latestRecordDate: string;
  /** Consecutive months the current regime has held, including the latest. */
  currentHoldMonths: number;
  /** Record date the current regime began. Independent of `rows`, which is capped. */
  currentHoldStartDate: string;
  /** Regime changes across the covered window. */
  regimeChanges: number;
  currentRegime: TimeMachineRegimeEntry["regime"];
  currentRegimeLabel: string;
  /** Newest first, capped by `rowLimit`. */
  rows: TrackRecordRow[];
};

/**
 * Below this the window is too short for "held for N months" to mean anything,
 * so the surface renders nothing rather than a stat that overstates the record.
 */
export const TRACK_RECORD_MIN_MONTHS = 6;

const DEFAULT_ROW_LIMIT = 12;

export const buildTrackRecord = (
  series: TimeMachineRegimeEntry[],
  rowLimit = DEFAULT_ROW_LIMIT,
): TrackRecord | null => {
  if (series.length < TRACK_RECORD_MIN_MONTHS) {
    return null;
  }

  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const latest = ordered[ordered.length - 1];

  let regimeChanges = 0;
  let currentHoldMonths = 1;
  let currentHoldStartIndex = ordered.length - 1;

  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].regime !== ordered[i - 1].regime) {
      regimeChanges += 1;
    }
  }

  for (let i = ordered.length - 1; i > 0; i -= 1) {
    if (ordered[i].regime !== ordered[i - 1].regime) {
      break;
    }
    currentHoldMonths += 1;
    currentHoldStartIndex = i - 1;
  }

  const rows: TrackRecordRow[] = ordered.map((entry, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    const boldness = buildBoldnessScore(entry.tightness, entry.riskAppetite);

    return {
      recordDate: entry.recordDate,
      regime: entry.regime,
      regimeLabel: getRegimePublicLabel(entry.regime),
      boldness,
      boldnessDelta: previous
        ? boldness - buildBoldnessScore(previous.tightness, previous.riskAppetite)
        : null,
      changed: previous ? entry.regime !== previous.regime : false,
    };
  });

  return {
    monthsCovered: ordered.length,
    firstRecordDate: ordered[0].recordDate,
    latestRecordDate: latest.recordDate,
    currentHoldMonths,
    currentHoldStartDate: ordered[currentHoldStartIndex].recordDate,
    regimeChanges,
    currentRegime: latest.regime,
    currentRegimeLabel: getRegimePublicLabel(latest.regime),
    rows: rows.slice(-rowLimit).reverse(),
  };
};
