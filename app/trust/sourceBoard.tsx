import { ReportSection } from "../components/reportSection";
import type { SourceBoardRow } from "../../lib/report/sourceHealth";

const stateTone = (row: SourceBoardRow) =>
  !row.asIntended
    ? "text-semantic-caution-fg"
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
      description="Each feed behind the scores: whether this reading came from it live, how often it updates, and when it last did."
    >
      <ul className="divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
        {rows.map((row) => (
          <li
            key={row.sourceName}
            data-source-row={row.sourceName}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-2.5 text-sm lg:grid-cols-[minmax(0,12rem)_minmax(0,9rem)_minmax(0,9rem)_minmax(0,1fr)]"
          >
            <span className="font-medium text-slate-100">{row.sourceName}</span>
            <span className={`flex items-center gap-1.5 font-medium ${stateTone(row)}`}>
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {row.stateLabel}
            </span>
            {/* One muted line on a phone, two columns from `lg`: the wrapper
                drops out of the box tree there and its two halves take their
                own cells, so the row reads in the same order either way. */}
            <span className="col-span-2 text-xs text-slate-400 lg:contents lg:text-sm">
              <span>{row.cadenceLabel}</span>
              <span aria-hidden="true" className="lg:hidden"> · </span>
              <span className="tabular-nums">{row.updatedLabel}</span>
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
