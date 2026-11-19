import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { buildRegimeTrackRecord } from "../../../lib/summary/regimeTrackRecord";
import { countRecord } from "../../../lib/report/trackRecord";
import { describeTrackRecordRescore } from "../../../lib/report/trackRecordCopy";
import { getRegimePublicLabel, isRegimeKey } from "../../../lib/regimePresentation";
import { ConditionWord } from "../ui/conceptIcons";
import { formatMonthYearShortFromValue } from "../../../lib/formatters";
import { Fact, FactList } from "../ui/factList";
import { buildMonthBriefHref } from "../../../lib/timeMachine/monthFormatting";
import {
  CHANGE_APPROACH_MONTHS_BEFORE,
  CHANGE_APPROACH_SCALE_PTS,
  buildChangeApproach,
  describeAdvanceWarning,
} from "../../../lib/report/advanceWarning";
import { ChangeApproachDrawing } from "./changeApproach";

/**
 * The page above this calls itself the permanent record cited in board
 * documents. This section is the part that grades that record: every regime
 * change in the window, whether the crossing was visible in advance, and how
 * often calls churned. All of it is recomputed from the same series the replay
 * engine uses — nothing here is authored.
 */
export function TrackRecordSection({
  series,
  history,
  recordChanges,
}: {
  series: TimeMachineRegimeEntry[];
  /**
   * The whole record, for the drawing of how each change approached its line: the six
   * months before a change early in the window fall before the window. Defaults to
   * `series`, which draws such a change with the months it has.
   */
  history?: readonly TimeMachineRegimeEntry[];
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
  const label = (regime: string) =>
    isRegimeKey(regime) ? <ConditionWord regime={regime}>{getRegimePublicLabel(regime)}</ConditionWord> : getRegimePublicLabel(regime);
  const recentTransitions = [...record.transitions].reverse().slice(0, 8);
  const currentSpell = record.spells[record.spells.length - 1];
  // Shock flags come from the replay walk itself: a flip that jumped its line
  // from beyond the near-band committed without the confirmation gate, and no
  // published reversal condition could have fired. The grader already calls
  // these "unsignaled"; the marker says why — structurally, not just this time.
  const shockByDate = new Map(series.map((entry) => [entry.recordDate, entry.shock === true]));
  /* Each row's drawing reads the transition its words are graded from. */
  const approachOf = (transition: (typeof recentTransitions)[number]) =>
    buildChangeApproach(history ?? series, transition, { nearBandPts: record.nearBandPts });

  return (
    <section
      data-page-section="track-record-grading"
      tabIndex={-1}
      className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      aria-labelledby="track-record-grading-heading"
    >
      <div>
        <h2 id="track-record-grading-heading" className="type-section">How the record held up</h2>
        <p className="max-w-prose text-sm text-slate-300">
          The last {counts?.readings ?? record.observations} month-end readings{windowLabel ? `, ${windowLabel},` : ""} graded
          against the same data that produced them.
        </p>
      </div>

      {/* Facts in the text's size, above the table they summarise; four tiles
          with a bold figure each until 2026-10-09. */}
      <FactList>
        <Fact
          label="Changes in conditions"
          value={counts?.changes ?? record.transitions.length}
          unit={`in the last ${counts?.readings ?? record.observations} months`}
        />
        {/* What `signaled` measures, said of the readings (2026-11-12): "Warned a month ahead"
            had them warn, which a reading cannot do (tests/titleSubjects.test.ts). */}
        <Fact label="Near the line the month before" value={record.signaledCount} unit={`of ${record.transitions.length}`} />
        {/* Says what lasted (2026-11-10): "Typical length" named no noun. */}
        <Fact
          label="Conditions typically held"
          value={record.medianHoldMonths ?? "—"}
          unit={record.medianHoldMonths != null ? "mo" : undefined}
        />
        <Fact label="Changed back within a month" value={record.whipsawCount} />
      </FactList>

      {recentTransitions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[color:var(--border-subtle)] text-left type-eyebrow">
                <th className="pb-2 pr-4">When</th>
                <th className="pb-2 pr-4">Change</th>
                <th className="pb-2">Advance warning</th>
              </tr>
            </thead>
            <tbody>
              {recentTransitions.map((transition) => {
                const approach = approachOf(transition);
                return (
                <tr key={transition.atDate} className="group relative border-b border-[color:var(--border-subtle)]">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-slate-400">
                    {/* The row opens the brief as it read that month: a dated change with
                        an arrow read as a row to open (2026-11-03). The date is the link,
                        and its ::after spans the row. */}
                    <a
                      href={buildMonthBriefHref(transition.atDate)}
                      className="underline decoration-slate-600 underline-offset-4 after:absolute after:inset-0 group-hover:text-slate-200"
                    >
                      {formatMonthYearShortFromValue(transition.atDate)}
                    </a>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-200">
                    {label(transition.from)} → {label(transition.to)}
                  </td>
                  {/* A change with no advance signal is a miss, set in the caveat's ink with its
                      mark (2026-11-10). It was the crossed red, which means a pause line.
                      The drawing beside the words (2026-11-18) is how the score that
                      crossed came to its line; the row's link covers it, so it opens the
                      change's month too. */}
                  <td className="py-2.5">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {approach ? <ChangeApproachDrawing approach={approach} id={transition.atDate} /> : null}
                      <span className={transition.signaled ? "text-slate-200" : "weather-caveat-mark text-caveat-fg"}>
                        {describeAdvanceWarning(transition, record.nearBandPts, shockByDate.get(transition.atDate) === true)}
                      </span>
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : currentSpell ? (
        <p className="text-fluid-sm text-slate-300">
          No changes in conditions in this window. {label(currentSpell.regime)} has held all{" "}
          {currentSpell.months} months.
        </p>
      ) : null}

      {/* Defines the column's own words (2026-11-10). It glossed "Signaled", which
          nothing on the page printed, under a column headed "Advance signal". */}
      <p className="max-w-prose text-fluid-nano leading-relaxed text-slate-400">
        &ldquo;Advance warning&rdquo; means the score that crossed was within {record.nearBandPts} pts of its line, on
        either side, for at least a month first. Changes with no warning are listed too.
      </p>
      {/* The drawings' domain, stated once for all of them (§XV). */}
      <p className="max-w-prose text-fluid-nano leading-relaxed text-slate-400" data-change-approach-key>
        Each drawing is that score over the {CHANGE_APPROACH_MONTHS_BEFORE} month-ends before the change and the change
        month, at the right: its distance from its line (dashed), with the side it left up. The shaded band is within{" "}
        {record.nearBandPts} pts. Every drawing runs {CHANGE_APPROACH_SCALE_PTS} pts either side of the line, so a reading
        further out leaves it.
      </p>
      {recordChanges !== undefined ? (
        <p className="max-w-prose text-fluid-nano leading-relaxed text-slate-400" data-record-rescore>
          {describeTrackRecordRescore({ changes: recordChanges, signaled: record.signaledCount, graded: record.transitions.length })}
        </p>
      ) : null}
    </section>
  );
}
