import type { CSSProperties } from "react";
import type { LineState } from "../../../lib/report/operatingCalls";
import type { AreaStateMonth } from "../../../lib/report/ruleRegions";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { buildTimeMachineHref } from "../../../lib/timeMachine/timeMachineSelection";
import { hasTimeMachineEntry } from "../../../lib/timeMachine/timeMachineCache";
import { formatMonthShortUtc } from "../../../lib/formatters";
import { AreaLabel, LineStateIcon } from "../../components/ui/conceptIcons";

/* Where a month's link lands: this page as it read that month, at its rules. */
const MONTH_TARGET = "/operate#ops-monthly-action-summary";

const STATE_KEY: ReadonlyArray<{ state: LineState; label: string }> = [
  { state: "crossed", label: "Paused" },
  { state: "near", label: "Close to pausing (within 5 points)" },
  { state: "clear", label: "Clear" },
];

/* A paused month is the one a reader scans for, so it alone takes a tint. */
const CELL_TINT: Record<LineState, string> = {
  crossed: "bg-line-crossed-border/10",
  near: "",
  clear: "",
};

/* Two blocks of six on a narrow box, one row of twelve from 44rem: a month is never
   narrower than its 44px target. Each piece names its place in both, and the container
   query picks (§XXIX). */
const HALF = 6;
const ROWS_PER_BLOCK = 8;

type Placement = CSSProperties & Record<`--${string}`, string | number>;

const place = (index: number, row: number, span = 1): Placement => {
  const half = index < HALF ? 0 : 1;
  return {
    "--wc": `${index + 2}`,
    "--wr": `${row} / span ${span}`,
    "--nc": `${(index % HALF) + 2}`,
    "--nr": `${row + half * ROWS_PER_BLOCK} / span ${span}`,
  };
};

const placeLabel = (row: number, half: 0 | 1): Placement => ({
  "--wr": `${row}`,
  "--nr": `${row + half * ROWS_PER_BLOCK}`,
});

const PLACED = "[grid-column:var(--nc)] [grid-row:var(--nr)] @[44rem]:[grid-column:var(--wc)] @[44rem]:[grid-row:var(--wr)]";

/* "2026-09": every piece of a month's column carries it, so a month made active anywhere on
   the page (`data-month-active`, set on each element with a `data-month`) is found here too. */
const monthKey = (recordDate: string) => recordDate.slice(0, 7);

/* The active month's column takes the frame a pointed-at month takes, and nothing more: its
   words stay for the pointer and focus, so two readouts never share the space under the grid. */
const MONTH_ACTIVE = "data-[month-active]:outline data-[month-active]:outline-1 data-[month-active]:outline-[color:var(--border-strong)]";
const PLACED_LABEL = "[grid-column:1] [grid-row:var(--nr)] @[44rem]:[grid-row:var(--wr)]";

/**
 * Each area's state at the last twelve month-ends, by this week's rules (2026-11-18): five
 * rows of months, each cell paused, close or clear with the line-state glyph, and the two
 * scores under them, so a reader sees how often these lines would have held an area before
 * trusting them with one. The states are `buildAreaStateHistory`'s, judged by the rules
 * table's own predicates; the scores are the record's month-ends, scored with today's
 * formula. Pointing at or focusing a month names it in full under the grid; each month
 * opens this page as it read then.
 */
export function AreaStateHistory({ months }: { months: readonly AreaStateMonth[] }) {
  const first = months.at(0);
  const last = months.at(-1);
  if (!first || !last) return null;
  const areas = first.states.map((entry) => entry.area);
  const scoreRow = areas.length + 2;
  const rowLabels = [
    ...areas.map((area, index) => ({ key: area, row: index + 2, content: <AreaLabel area={area} /> })),
    { key: "tightness", row: scoreRow, content: regimeSignalLabel.tightness },
    { key: "riskAppetite", row: scoreRow + 1, content: regimeSignalLabel.riskAppetite },
  ];
  return (
    <figure className="m-0 space-y-2" data-area-state-history="">
      <figcaption className="space-y-1">
        <span className="block text-sm font-semibold text-slate-100">Each area by month-end</span>
        <span className="block max-w-[60ch] text-xs leading-5 text-slate-400">
          Each area at the last {months.length} month-ends,{" "}
          <time dateTime={monthKey(first.recordDate)}>{first.label}</time> to{" "}
          <time dateTime={monthKey(last.recordDate)}>{last.label}</time>: the month-end readings, scored with today’s
          formula, against this week’s rules.
        </span>
      </figcaption>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300" aria-label="Key">
        {STATE_KEY.map((entry) => (
          <li key={entry.state} className="inline-flex items-center gap-1.5">
            <LineStateIcon state={entry.state} className={entry.state === "clear" ? "text-[color:var(--app-text-muted)]" : undefined} />
            {entry.label}
          </li>
        ))}
      </ul>
      <div className="@container">
        {/* The reading under the pointer or focus sits in the space reserved under the grid,
            over the line that asks for it, so nothing moves when it appears. */}
        <div className="group/history relative pb-14">
          <div
            className="grid grid-cols-[minmax(5.5rem,auto)_repeat(6,minmax(2.75rem,1fr))] text-xs @[44rem]:grid-cols-[minmax(7rem,auto)_repeat(12,minmax(2.75rem,1fr))]"
            data-area-state-grid=""
          >
            {([0, 1] as const).flatMap((half) =>
              rowLabels.map((label) => (
                <span
                  key={`${half}-${label.key}`}
                  aria-hidden="true"
                  style={placeLabel(label.row, half)}
                  className={`${PLACED_LABEL} flex min-h-11 items-center border-b border-[color:var(--border-faint)] pr-2 text-slate-300 ${
                    half === 1 ? "@[44rem]:hidden" : ""
                  } ${label.row === scoreRow ? "border-t border-t-[color:var(--border-subtle)]" : ""}`}
                >
                  {label.content}
                </span>
              )),
            )}
            {months.map((month, index) => {
              /* The year under the first month, under each January, and under the first
                 month of the second block where the grid is two blocks. */
              const yearShown = index === 0 || month.month === 1;
              const yearInBlock = !yearShown && index === HALF;
              return [
                <time
                  key={`${month.recordDate}-head`}
                  dateTime={monthKey(month.recordDate)}
                  aria-hidden="true"
                  data-month={monthKey(month.recordDate)}
                  style={place(index, 1)}
                  /* The second block of six, on a narrow box, stands a little apart from the first. */
                  className={`${PLACED} flex flex-col items-center justify-end pb-1 leading-tight text-slate-400 ${
                    index >= HALF ? "min-h-16 @[44rem]:min-h-11" : "min-h-11"
                  }`}
                >
                  <span>{formatMonthShortUtc(month.month)}</span>
                  {yearShown || yearInBlock ? (
                    <span className={`text-[0.6875rem] text-slate-500 ${yearInBlock ? "@[44rem]:hidden" : ""}`}>{month.year}</span>
                  ) : null}
                </time>,
                ...month.states.map((entry, row) => (
                  <span
                    key={`${month.recordDate}-${entry.area}`}
                    aria-hidden="true"
                    data-month={monthKey(month.recordDate)}
                    style={place(index, row + 2)}
                    data-area-state={entry.state ?? "none"}
                    className={`${PLACED} flex min-h-11 items-center justify-center border-b border-[color:var(--border-faint)] ${
                      entry.state ? CELL_TINT[entry.state] : ""
                    }`}
                  >
                    {/* Clear in the muted ink: twelve play glyphs at full ink drowned the
                        paused months a reader scans the grid for. */}
                    {entry.state ? (
                      <LineStateIcon state={entry.state} className={entry.state === "clear" ? "text-[color:var(--app-text-muted)]" : undefined} />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </span>
                )),
                <span
                  key={`${month.recordDate}-t`}
                  aria-hidden="true"
                  data-month={monthKey(month.recordDate)}
                  style={place(index, scoreRow)}
                  className={`${PLACED} flex min-h-11 items-center justify-center border-y border-b-[color:var(--border-faint)] border-t-[color:var(--border-subtle)] font-mono text-slate-300`}
                >
                  {month.tightness}
                </span>,
                <span
                  key={`${month.recordDate}-r`}
                  aria-hidden="true"
                  data-month={monthKey(month.recordDate)}
                  style={place(index, scoreRow + 1)}
                  className={`${PLACED} flex min-h-11 items-center justify-center border-b border-[color:var(--border-faint)] font-mono text-slate-300`}
                >
                  {month.riskAppetite}
                </span>,
              ];
            })}
            {/* One link per month, over its column and after it in the source, so it is the
                target: twelve stops for the keyboard rather than sixty. Its name is the month
                in words, which it also shows under the grid while pointed at or focused. */}
            {months.map((month, index) => {
              const linked = hasTimeMachineEntry(month.year, month.month);
              const readout = (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 min-h-12 text-xs leading-5 text-slate-200 opacity-0 transition-opacity duration-150 group-hover/month:opacity-100 group-focus-visible/month:opacity-100 motion-reduce:transition-none">
                  {month.summary}
                </span>
              );
              return linked ? (
                <a
                  key={`${month.recordDate}-link`}
                  href={buildTimeMachineHref(MONTH_TARGET, { year: month.year, month: month.month })}
                  style={place(index, 1, ROWS_PER_BLOCK)}
                  className={`${PLACED} ${MONTH_ACTIVE} group/month weather-focus-ring rounded-sm outline-offset-0 hover:outline hover:outline-1 hover:outline-[color:var(--border-strong)]`}
                  data-area-state-month={month.recordDate}
                  data-month={monthKey(month.recordDate)}
                >
                  {readout}
                </a>
              ) : (
                <span
                  key={`${month.recordDate}-link`}
                  style={place(index, 1, ROWS_PER_BLOCK)}
                  className={`${PLACED} ${MONTH_ACTIVE} group/month rounded-sm outline-offset-0`}
                  data-month={monthKey(month.recordDate)}
                >
                  {readout}
                </span>
              );
            })}
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-0 min-h-12 text-xs leading-5 text-slate-400 transition-opacity duration-150 group-has-[a:hover]/history:opacity-0 group-has-[a:focus-visible]/history:opacity-0 motion-reduce:transition-none">
            Point at or focus a month to read it in full; open it to see this page as it read then.
          </p>
        </div>
      </div>
    </figure>
  );
}
