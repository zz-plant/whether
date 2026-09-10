import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { buildRegimeTrackRecord } from "../../../lib/summary/regimeTrackRecord";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { formatMonthYearShortFromValue } from "../../../lib/formatters";

/**
 * The page above this calls itself the permanent record cited in board
 * documents. This section is the part that grades that record: every regime
 * change in the window, whether the crossing was visible in advance, and how
 * often calls churned. All of it is recomputed from the same series the replay
 * engine uses — nothing here is authored.
 */
export function TrackRecordSection({ series }: { series: TimeMachineRegimeEntry[] }) {
  if (series.length < 2) return null;

  const record = buildRegimeTrackRecord(series);
  const label = (regime: string) => getRegimePublicLabel(regime);
  const recentTransitions = [...record.transitions].reverse().slice(0, 8);
  const currentSpell = record.spells[record.spells.length - 1];

  return (
    <section
      data-page-section="track-record-grading"
      tabIndex={-1}
      className="weather-panel space-y-4 px-5 py-5 scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      aria-labelledby="track-record-grading-heading"
    >
      <div>
        <h2 id="track-record-grading-heading" className="type-eyebrow">How the record held up</h2>
        <p className="text-sm text-slate-300">
          How the calls held up, graded against the same data that produced them.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <dt className="text-fluid-nano text-slate-400">Regime changes</dt>
          <dd className="text-fluid-lg font-semibold tabular-nums text-slate-100">
            {record.transitions.length}
            <span className="ml-1 text-fluid-nano font-normal text-slate-400">in {record.observations} mo</span>
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <dt className="text-fluid-nano text-slate-400">Signaled in advance</dt>
          <dd className="text-fluid-lg font-semibold tabular-nums text-slate-100">
            {record.signaledCount}
            <span className="ml-1 text-fluid-nano font-normal text-slate-400">of {record.transitions.length}</span>
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <dt className="text-fluid-nano text-slate-400">Median hold</dt>
          <dd className="text-fluid-lg font-semibold tabular-nums text-slate-100">
            {record.medianHoldMonths ?? "—"}
            {record.medianHoldMonths != null ? (
              <span className="ml-1 text-fluid-nano font-normal text-slate-400">mo</span>
            ) : null}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <dt className="text-fluid-nano text-slate-400">One-month whipsaws</dt>
          <dd className="text-fluid-lg font-semibold tabular-nums text-slate-100">{record.whipsawCount}</dd>
        </div>
      </dl>

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
                      ? `in the near band ${transition.leadMonths} mo before`
                      : "no advance signal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : currentSpell ? (
        <p className="text-fluid-xs text-slate-300">
          No regime changes in this window — {label(currentSpell.regime)} has held all{" "}
          {currentSpell.months} months.
        </p>
      ) : null}

      <p className="text-fluid-nano leading-relaxed text-slate-400">
        Signaled = the score that crossed had already spent at least a month within{" "}
        {record.nearBandPts} pts of its classification line, so the flip was visible before it
        happened. Unsignaled changes are listed just the same — that is the point of this table.
      </p>
    </section>
  );
}
