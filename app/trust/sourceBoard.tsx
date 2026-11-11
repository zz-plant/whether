import { ReportSection } from "../components/reportSection";
import type { SourceBoardRow } from "../../lib/report/sourceHealth";

const stateTone = (row: SourceBoardRow) =>
  !row.asIntended
    ? "text-caveat-fg font-semibold"
    : row.live
      ? "text-semantic-easing-fg"
      : "text-slate-300";

const sourceLinkClass =
  "weather-hit font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100";

/**
 * Every source behind the scores, open, under the derivation.
 *
 * This was two timestamps ("Treasury", "Macro") and two pills, folded at the
 * foot of the page inside "Detailed verification & sources", while the page's
 * open content was the method essay and a blank form. The page exists to answer
 * "is this current enough to act on?", the rail's second entry was "Sources",
 * and a reader who followed it found a closed panel. The source health rows had
 * been computed for every reading all along and drawn nowhere but as a count in
 * the strip.
 *
 * One line per source: its name, whether it answered live, how often it
 * updates, and when it last answered. Compact on purpose — the strip under the
 * h1 states the verdict ("All sources live"), and this is what it was judged
 * from, not a second verdict. The id stays: `dataCurrencyNotice` sends readers
 * to `/trust#source-board` to check the source dates.
 */
/*
 * How far a source is through its update window, drawn beside the date it last answered
 * (2026-11-10). The date alone left the reader to hold "Daily rates" against "Updated Nov 9,
 * 02:00 UTC" and work out whether that is current; the bar does that sum. Muted while
 * inside the window, full and in the caveat ink once past it, the same moment the state
 * word turns "Stale". Not the crossed red: a stale source is a caveat, and red means a line.
 * Fixed width, so the rows compare at a glance.
 */
function WindowBar({ used }: { used: number }) {
  const overdue = used >= 1;
  const label = overdue
    ? "Past the window it is expected to update in"
    : `${Math.round(used * 100)}% of the way through the window it is expected to update in`;
  return (
    <svg
      viewBox="0 0 40 6"
      width={40}
      height={6}
      aria-label={label}
      data-window-used={overdue ? "overdue" : "inside"}
      className="block shrink-0"
    >
      <rect width={40} height={6} className="fill-[color:var(--border-default)]" />
      <rect
        width={Math.min(used, 1) * 40}
        height={6}
        className={overdue ? "fill-[color:var(--color-caveat-fg)]" : "fill-[color:var(--app-text-muted)]"}
      />
    </svg>
  );
}

export function SourceBoard({
  rows,
  treasurySourceUrl,
  macroSourceUrl,
}: {
  rows: readonly SourceBoardRow[];
  treasurySourceUrl?: string;
  macroSourceUrl?: string;
}) {
  return (
    <ReportSection
      id="source-board"
      title="Sources and last update"
      /* No description (2026-11-11): it named the row's columns (live or not, cadence,
         last update), which each row prints under the source's name. */
    >
      <ul className="@container divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
        {rows.map((row) => (
          <li
            key={row.sourceName}
            data-source-row={row.sourceName}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-2.5 text-sm @3xl:grid-cols-[minmax(0,12rem)_minmax(0,9rem)_minmax(0,9rem)_minmax(0,1fr)]"
          >
            <span className="font-medium text-slate-100">{row.sourceName}</span>
            <span className={`flex items-center gap-1.5 font-medium ${stateTone(row)}`}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {row.stateLabel}
            </span>
            {/* One muted line on a phone, two columns from `lg`: the wrapper
                drops out of the box tree there and its two halves take their
                own cells, so the row reads in the same order either way. */}
            <span className="col-span-2 text-xs text-slate-400 @3xl:contents @3xl:text-sm">
              <span>{row.cadenceLabel}</span>
              <span aria-hidden="true" className="@3xl:hidden"> · </span>
              <span className="inline-flex items-center gap-2 tabular-nums">
                {row.windowUsed === null ? null : <WindowBar used={row.windowUsed} />}
                {row.updatedLabel}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {/* Both URLs are optional; a link renders only where there is somewhere to go. */}
      {treasurySourceUrl || macroSourceUrl ? (
        <p className="text-xs leading-5 text-slate-400">
          Read at the source:{" "}
          {treasurySourceUrl ? (
            <a href={treasurySourceUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
              Treasury source
            </a>
          ) : null}
          {treasurySourceUrl && macroSourceUrl ? " · " : null}
          {macroSourceUrl ? (
            <a href={macroSourceUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
              Macro source
            </a>
          ) : null}
        </p>
      ) : null}
    </ReportSection>
  );
}
