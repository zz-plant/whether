import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { buildRegimeTrackRecord } from "../../../lib/summary/regimeTrackRecord";
import { countRecord } from "../../../lib/report/trackRecord";
import { describeTrackRecordRescore } from "../../../lib/report/trackRecordCopy";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { formatMonthYearShortFromValue } from "../../../lib/formatters";
import { StatTile } from "../ui/statTile";

/**
 * The page above this calls itself the permanent record cited in board
 * documents. This section is the part that grades that record: every regime
 * change in the window, whether the crossing was visible in advance, and how
 * often calls churned. All of it is recomputed from the same series the replay
 * engine uses — nothing here is authored.
 */
export function TrackRecordSection({
  series,
  recordChanges,
}: {
  series: TimeMachineRegimeEntry[];
  /** Changes in conditions across the whole record, for the line on its last re-score; this section grades a trailing window. */
  recordChanges?: number;
}) {
  if (series.length < 2) return null;

  const record = buildRegimeTrackRecord(series);
  /* The window, beside the count: this section grades the trailing months the
     page hands it, and its "Changes in conditions" used to sit under the same
     label as the whole record's with nothing saying the two windows differed. */
  const counts = countRecord(series);
  const windowLabel = counts
    ? `${formatMonthYearShortFromValue(counts.firstRecordDate)} to ${formatMonthYearShortFromValue(counts.latestRecordDate)}`
    : null;
  const label = (regime: string) => getRegimePublicLabel(regime);
  const recentTransitions = [...record.transitions].reverse().slice(0, 8);
  const currentSpell = record.spells[record.spells.length - 1];
  // Shock flags come from the replay walk itself: a flip that jumped its line
  // from beyond the near-band committed without the confirmation gate, and no
  // published reversal condition could have fired. The grader already calls
  // these "unsignaled"; the marker says why — structurally, not just this time.
  const shockByDate = new Map(series.map((entry) => [entry.recordDate, entry.shock === true]));

  return (
    <section
      data-page-section="track-record-grading"
      tabIndex={-1}
      className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      aria-labelledby="track-record-grading-heading"
    >
      <div>
        <h2 id="track-record-grading-heading" className="text-xl font-semibold text-white sm:text-2xl">How the record held up</h2>
        <p className="text-sm text-slate-300">
          The last {counts?.readings ?? record.observations} month-end readings{windowLabel ? `, ${windowLabel},` : ""} graded
          against the same data that produced them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Changes in conditions"
          value={counts?.changes ?? record.transitions.length}
          unit={`in the last ${counts?.readings ?? record.observations} months`}
        />
        <StatTile label="Signaled in advance" value={record.signaledCount} unit={`of ${record.transitions.length}`} />
        <StatTile
          label="Median hold"
          value={record.medianHoldMonths ?? "—"}
          unit={record.medianHoldMonths != null ? "mo" : undefined}
        />
        <StatTile label="Reversed after one month" value={record.whipsawCount} />
      </div>

      {recentTransitions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/60 text-left type-eyebrow">
                <th className="pb-2 pr-4">When</th>
                <th className="pb-2 pr-4">Change</th>
                <th className="pb-2">Advance signal</th>
              </tr>
            </thead>
            <tbody>
              {recentTransitions.map((transition) => (
                <tr key={transition.atDate} className="border-b border-slate-800/40">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-slate-400">
                    {formatMonthYearShortFromValue(transition.atDate)}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-200">
                    {label(transition.from)} → {label(transition.to)}
                  </td>
                  <td className={`py-2.5 ${transition.signaled ? "text-emerald-300/90" : "text-amber-300/90"}`}>
                    {transition.signaled
                      ? `within ${record.nearBandPts} points of its line ${transition.leadMonths} mo before`
                      : shockByDate.get(transition.atDate)
                        ? `no advance signal — the score crossed its line from more than ${record.nearBandPts} points away in one month`
                        : "no advance signal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : currentSpell ? (
        <p className="text-fluid-xs text-slate-300">
          No changes in conditions in this window — {label(currentSpell.regime)} has held all{" "}
          {currentSpell.months} months.
        </p>
      ) : null}

      <p className="text-fluid-nano leading-relaxed text-slate-400">
        Signaled = the score that crossed had spent at least a month within{" "}
        {record.nearBandPts} pts of its line, on either side, before conditions changed. Unsignaled
        changes are listed just the same — that is the point of this table.
      </p>
      {recordChanges !== undefined ? (
        <p className="text-fluid-nano leading-relaxed text-slate-400" data-record-rescore>
          {describeTrackRecordRescore({ changes: recordChanges, signaled: record.signaledCount, graded: record.transitions.length })}
        </p>
      ) : null}
    </section>
  );
}
