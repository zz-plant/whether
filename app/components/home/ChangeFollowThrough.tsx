import { ScoreCell } from "../ui/scoreCell";
import { MarkReadout } from "../ui/markReadout";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { buildTimeMachineHref } from "../../../lib/timeMachine/timeMachineSelection";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/**
 * The last change and this one, set side by side from the moment each began (2026-11-18):
 * one small panel per score, x the months since the change, y the score's whole 0–100
 * scale with the line where conditions change across it. The earlier change's month-ends
 * run as a path from the change to three months on; this week's change has no month-end
 * yet, so its stretch so far is one open mark at the change. "Funding pressure was 79 then
 * and is 90 now" and "by Dec 2022 it stood at 100" become one picture: where each began,
 * against the line, and where the earlier one went.
 *
 * The cells that printed the later reading, the line and the reading at the change head
 * the panels as their labels; the path, the cells and the sentence under them all read
 * the card's one record (`findLastTimeCallChanged`, its `path`).
 *
 * Easier is up, as on every drawing on the site: funding pressure's scale runs 0 at the
 * top to 100 at the foot, risk appetite's the other way, and each end says which. Each
 * earlier month is a link to that month in the time machine; hover, focus or a tap names
 * a mark (`MarkReadout`).
 */

type ScoreKey = "tightness" | "riskAppetite";

/** Higher is easier for risk appetite, harder for funding pressure: where 100 sits, as a share of the plot from the top. */
const toTop = (key: ScoreKey, value: number) => {
  const clamped = Math.max(0, Math.min(100, value));
  return key === "tightness" ? clamped : 100 - clamped;
};

function FollowThroughPanel({
  record,
  score,
  line,
  firstMark,
}: {
  record: LastTimeCallChanged;
  score: ScoreKey;
  line: number;
  /** The group's one tab stop: the first panel's first month. */
  firstMark: boolean;
}) {
  const label = regimeSignalLabel[score];
  const lower = label.toLowerCase();
  const changedAt = formatMonthLabel(record.changedAt.year, record.changedAt.month);
  const span = Math.max(record.monthsLater, 1);
  const x = (monthsSince: number) => (monthsSince / span) * 100;
  const points = record.path.map((month) => `${x(month.monthsSince)},${toTop(score, month[score])}`).join(" ");
  const today = record.today[score];
  return (
    <div className="w-56 max-w-full space-y-2" data-follow-through={score}>
      <ScoreCell
        label={label}
        value={record[score].later}
        line={{ value: line, label: DECISION_CONTRACT_LABELS.watch.changeLine }}
        previous={record[score].atChange}
        previousLabel={changedAt}
      />
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-1 text-xs tabular-nums text-slate-400">
        {/* The scale's two ends, which way is easier said by where 0 and 100 sit. */}
        <div aria-hidden="true" className="flex h-24 flex-col justify-between py-0 text-right leading-none">
          <span>{score === "tightness" ? 0 : 100}</span>
          <span>{score === "tightness" ? 100 : 0}</span>
        </div>
        <div className="relative mx-1.5 h-24 border-y border-[color:var(--border-subtle)]">
          <svg
            aria-hidden="true"
            className="weather-data-plot absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              x2="100"
              y1={toTop(score, line)}
              y2={toTop(score, line)}
              stroke="var(--app-text-muted)"
              strokeWidth="1"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <polyline points={points} fill="none" stroke="var(--app-text-secondary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {record.path.map((month, index) => {
            const text = `${formatMonthLabel(month.year, month.month)}: ${lower} ${month[score]}`;
            return (
              <a
                key={month.recordDate}
                href={buildTimeMachineHref("/", { month: month.month, year: month.year })}
                tabIndex={firstMark && index === 0 ? 0 : -1}
                aria-label={text}
                data-mark={text}
                data-follow-through-month={month.recordDate}
                data-month={month.recordDate.slice(0, 7)}
                className="group absolute flex h-11 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${x(month.monthsSince)}%`, top: `${toTop(score, month[score])}%` }}
              >
                <span aria-hidden="true" className="block size-2 rounded-full bg-[var(--app-text-secondary)] group-hover:scale-125" />
              </a>
            );
          })}
          {/* This week's change: the stretch so far is this one reading, at the change. Not a
              past month, so not a link, and not a stop for the keyboard: the sentence under
              the panels says it ("is 90 now"). A pointer still names it. */}
          <span
            aria-hidden="true"
            data-mark={`This week: ${lower} ${Math.round(today)}`}
            data-follow-through-today
            className="absolute flex h-11 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: "0%", top: `${toTop(score, today)}%` }}
          >
            <span aria-hidden="true" className="block size-3 rounded-full border-2 border-[color:var(--app-text)] bg-[var(--bg-body)]" />
          </span>
        </div>
        <div aria-hidden="true" />
        <div aria-hidden="true" className="mx-1.5 flex justify-between pt-1 leading-none">
          <span>At the change</span>
          <span>{record.monthsLater === 1 ? "1 month on" : `${record.monthsLater} months on`}</span>
        </div>
      </div>
    </div>
  );
}

export function ChangeFollowThrough({
  record,
  callChangeLines,
}: {
  record: LastTimeCallChanged;
  callChangeLines: { tightness: number; riskAppetite: number };
}) {
  return (
    <figure className="space-y-2" data-change-follow-through>
      <MarkReadout className="flex flex-wrap gap-x-10 gap-y-4">
        <FollowThroughPanel record={record} score="tightness" line={callChangeLines.tightness} firstMark />
        <FollowThroughPanel record={record} score="riskAppetite" line={callChangeLines.riskAppetite} firstMark={false} />
      </MarkReadout>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-flex items-center">
            <span className="block h-px w-2 bg-[var(--app-text-secondary)]" />
            <span className="block size-2 rounded-full bg-[var(--app-text-secondary)]" />
            <span className="block h-px w-2 bg-[var(--app-text-secondary)]" />
          </span>
          {/* The months themselves are the chosen link's over the panels and the axis' under them. */}
          Each month-end
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="block size-3 rounded-full border-2 border-[color:var(--app-text)]" />
          This week
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="block w-4 border-t border-dashed border-[color:var(--app-text-muted)]" />
          {DECISION_CONTRACT_LABELS.watch.changeLine}
        </span>
      </figcaption>
    </figure>
  );
}
