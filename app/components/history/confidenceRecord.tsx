import { ReportSection } from "../reportSection";
import {
  confidenceCalibration,
  confidenceCalibrationTotals,
} from "../../../lib/report/confidenceCalibration";
import { resolveConfidencePercentFromDistance } from "../../../lib/report/confidence";
import { CALL_CHANGE_RULE } from "../../../lib/report/trackRecordCopy";

/**
 * What the confidence percent has been worth, against the record.
 *
 * /trust explains how the number is computed. This says whether it has
 * predicted anything, which until now nothing on the site did — and the
 * honest answer is that it has not, in the sense its name implies. Published as
 * a count of months rather than folded back into the number, because six regime
 * flips in fourteen years cannot support re-fitting it, and a curve fitted to
 * the base rate would report ~97% for every week and discriminate nothing.
 *
 * Two surfaces draw it. /calibration is the study's own URL and wraps the body
 * in a section. /history sets it beside the track-record tiles, because "how
 * often did the call hold" and "how often was the confidence label right" are
 * the same question asked twice, and a reader judging the record should meet
 * both answers in one place. The body is one component so the two cannot
 * drift into two tables of the same thing.
 */

export const CONFIDENCE_RECORD_TITLE = "What the confidence number has been worth";

const percentFormat = (value: number) => `${Math.round(value)}%`;

const bandLabel = (from: number, to: number | null) =>
  to === null ? `${from} or more` : `${from} to ${to}`;

/** The bands and the base rate, or null when the archive holds nothing to grade. */
const loadRecord = () => {
  const bands = confidenceCalibration().filter((band) => band.months > 0);
  const totals = confidenceCalibrationTotals();
  if (bands.length === 0 || totals.months === 0) return null;
  return { bands, totals, baseRate: (totals.held / totals.months) * 100 };
};

/**
 * The paragraph, the table and the footnote.
 *
 * `CALL_CHANGE_RULE` is printed once per page (lib/report/AGENTS.md). /history
 * already states it under the track-record tiles this body sits beside, so
 * only /calibration asks for it here.
 */
export function ConfidenceRecordBody({ includeCallChangeRule = false }: { includeCallChangeRule?: boolean }) {
  const record = loadRecord();
  if (!record) return null;
  const { bands, totals, baseRate } = record;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-200">
        Across {totals.months} month-end readings, the call was the same the following month{" "}
        {totals.held} times, or {percentFormat(baseRate)}. Every band below held more often than the
        percent those months reported, and the two least-confident bands run in the wrong order —
        so the number is a distance, not a probability. It says how much room the call has before
        the line that changes it; the count beside it says how often that room mattered.
      </p>

      <table className="w-full text-sm text-slate-200">
        <caption className="sr-only">
          How often the call held, by distance from the nearest line that changes it
        </caption>
        <thead>
          <tr className="type-eyebrow text-slate-400">
            <th scope="col" className="py-1 text-left font-normal">Points from the line</th>
            <th scope="col" className="py-1 text-right font-normal">Reported</th>
            <th scope="col" className="py-1 text-right font-normal">Held</th>
            <th scope="col" className="py-1 text-right font-normal">Months</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr key={band.from} className="border-t border-slate-800/80">
              <th scope="row" className="py-1.5 text-left font-normal">{bandLabel(band.from, band.to)}</th>
              <td className="py-1.5 text-right tabular-nums text-slate-400">
                {percentFormat(resolveConfidencePercentFromDistance(band.from, false))}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {percentFormat((band.held / band.months) * 100)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-400">{band.months}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-fluid-xs text-slate-400">
        Derived from the month-end archive each time this page is built, so it improves as the
        record grows. A held month means the call did not change.
        {includeCallChangeRule ? <> {CALL_CHANGE_RULE}</> : null}
      </p>
    </div>
  );
}

/** The study on its own URL, /calibration. */
export function ConfidenceRecordSection() {
  if (!loadRecord()) return null;

  return (
    <ReportSection
      id="confidence-record"
      title={CONFIDENCE_RECORD_TITLE}
      description="The percent measures how far the scores sit from the line that changes the call. This is what calls at that distance actually did."
    >
      <ConfidenceRecordBody includeCallChangeRule />
    </ReportSection>
  );
}
