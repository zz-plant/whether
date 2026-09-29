import { resolveConfidencePercentFromDistance } from "./confidence";
import { calibrationBuckets, calibrationMonthRows, type CalibrationMonth } from "./confidenceCalibration";

/**
 * Is the record's finding still true of the recent year, or has it quietly become history?
 *
 * `confidenceCalibration.ts` grades the whole archive and finds the percent understates in
 * every band. An earlier draft of this module compared recent hold rates against the
 * historical ones per band and flagged deltas of five points or more. On the real archive
 * that design cannot say anything honestly: the most recent twelve month-ends put eleven
 * readings in bands, and a five-point delta over counts that small flags a two-reading band
 * and a nine-reading one — noise promoted to a claim. There is no window size at which that
 * threshold means what it says here.
 *
 * So the drift this measures is the one the reader can act on: whether each band with
 * recent readings still held more often than the percent it publishes. That check is a
 * direction, not a distance between two rates, so it needs no threshold to choose, and a
 * band it cannot measure yet stays out of the result rather than counting as evidence.
 * "Stable" means every measured band still understates. "Drifting" means some band's recent
 * readings did no better than its published percent — the record's finding no longer
 * describes the recent year, and the copy that quotes it needs revisiting
 * (`tests/calibrationDrift.test.ts` pins the real archive's current verdict so the sentence
 * and the data fail together).
 *
 * "Unmeasured" is the third state, kept as distinct as the telemetry readers keep theirs:
 * a window too short to hold the year it names, or a window whose bands received no reading
 * with a following month to compare against. It renders nothing on the record — a gap is
 * better than a guess.
 */

type RecentCalibrationBand = {
  /** The band, in points from the line where conditions change. */
  from: number;
  /** Exclusive upper bound. `null` is the open top band. */
  to: number | null;
  /** Recent-window month-ends in this band with a following month inside the window. */
  months: number;
  held: number;
  /** What the percent publishes for readings at this band's floor. */
  publishedPercent: number;
  /** Whether this band's recent readings still held more often than that. */
  percentUnderstates: boolean;
};

export type CalibrationDriftResult = {
  status: "stable" | "drifting" | "unmeasured";
  bands: RecentCalibrationBand[];
};

/** The copy in `confidenceRecord.tsx` says "twelve" from this default; changing one is changing the other. */
export const calculateCalibrationDrift = (
  recentMonths = 12,
  months: CalibrationMonth[] = calibrationMonthRows(),
): CalibrationDriftResult => {
  if (recentMonths < 2 || months.length < recentMonths + 1) {
    return { status: "unmeasured", bands: [] };
  }

  const recent = months.slice(-recentMonths);
  const bands = calibrationBuckets(recent)
    .filter((band) => band.months > 0)
    .map((band) => {
      const publishedPercent = resolveConfidencePercentFromDistance(band.from, false);
      return {
        from: band.from,
        to: band.to,
        months: band.months,
        held: band.held,
        publishedPercent,
        percentUnderstates: band.held / band.months > publishedPercent / 100,
      };
    });

  if (bands.length === 0) return { status: "unmeasured", bands: [] };
  return { status: bands.every((band) => band.percentUnderstates) ? "stable" : "drifting", bands };
};
