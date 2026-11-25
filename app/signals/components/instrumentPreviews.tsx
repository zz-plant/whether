import { Sparkline, sparklineDomain, type SparklinePoint } from "../../components/ui/sparkline";
import { regimeDataAttribute } from "../../../lib/regimeAccent";
import type { RegimeKey } from "../../../lib/types";
import type { summarizeInversionMonths } from "../../../lib/report/evidenceInstrumentSummaries";
import { toMonthKey } from "../../../lib/monthCursor";

/**
 * The pictures a closed instrument question draws beside its answer
 * (`InstrumentQuestion`'s `preview`), each at the height of the line of type it
 * sits in, each from the values its answer sentence is built from. They are
 * drawings of the sentence and carry nothing it does not, so the summary hides
 * them from assistive tech; none holds a link. The domain each one covers is
 * named in its sentence or printed beside it.
 *
 * A cell that stands for a month carries it (`data-month`, `lib/monthCursor.ts`), so
 * a month read anywhere on the page (the record band, a month in an opened panel,
 * `[` and `]`) is ringed here too (month-active.css).
 */

type InversionSummary = ReturnType<typeof summarizeInversionMonths>;

const INVERTED_FLAG = { spread10Y2Y: "inverted10Y2Y", spread2Y3M: "inverted2Y3M" } as const;

/* Ink, not the front red: a spread below zero is not a pause line crossed (§XVI). */
const CELL_FILLED = "bg-[color:var(--app-text-secondary)]";
const CELL_EMPTY = "border border-[color:var(--app-text-muted)]";

/**
 * One strip per spread, one cell per month, filled where the spread sat below
 * zero: "in 4 of 12 months" drawn as four filled cells of twelve. The strips
 * come in the order the answer names the spreads (`inversionSpreadOrder`). A
 * month with no reading is drawn faint.
 */
export function InversionCells({ summary }: { summary: InversionSummary }) {
  return (
    <span className="inline-grid gap-[3px]" data-preview="inversion">
      {summary.order.map((key) => (
        <span key={key} className="flex gap-[2px]" data-spread={key}>
          {summary.months.map((month) => (
            <InversionCell key={month.key} month={month} spread={key} className="h-[7px] w-[7px]" />
          ))}
        </span>
      ))}
    </span>
  );
}

/** One month of one spread: filled when it sat below zero, faint with no reading. */
export function InversionCell({
  month,
  spread,
  className,
}: {
  month: InversionSummary["months"][number];
  spread: keyof typeof INVERTED_FLAG;
  className: string;
}) {
  return (
    <span
      data-inverted={month[INVERTED_FLAG[spread]] ? "" : undefined}
      data-month={toMonthKey(month.year, month.month)}
      className={`${className} ${month[INVERTED_FLAG[spread]] ? CELL_FILLED : CELL_EMPTY} ${month[spread] === null ? "opacity-40" : ""}`}
    />
  );
}

/**
 * The two scores' month-end series as two sparklines on the same 0–100 scale,
 * in the order the answer names them, with the scale printed after them: the
 * answer says how far each moved, the lines say how they got there.
 */
export function ScoreSparklinesPreview({
  series,
}: {
  series: ReadonlyArray<{ key: string; label: string; points: SparklinePoint[] }>;
}) {
  const drawable = series.filter((item) => item.points.length >= 3);
  if (drawable.length === 0) return null;
  return (
    <>
      {drawable.map((item) => (
        <Sparkline
          key={item.key}
          points={item.points}
          label={item.label}
          domain={[0, 100]}
          widthEm={4}
          className="text-slate-300"
        />
      ))}
      <span className="text-fluid-nano tabular-nums text-slate-400">0–100</span>
    </>
  );
}

/**
 * One cell per month-end, filled with its conditions and their pattern, the
 * encoding the record band and the month-by-month timeline in the panel use
 * (`.record-week-cell`, ui-ux-standards §XXX), so a colour and a pattern each
 * name the conditions. The answer counts the changes; the strip shows where
 * they fell.
 */
export function ConditionCellsPreview({ series }: { series: ReadonlyArray<{ year: number; month: number; regime: RegimeKey }> }) {
  if (series.length === 0) return null;
  return (
    <span className="flex gap-px" data-preview="conditions">
      {series.map((entry) => (
        <span
          key={`${entry.year}-${entry.month}`}
          data-regime={regimeDataAttribute(entry.regime)}
          className="record-week-cell block h-4 w-[5px]"
          data-month={toMonthKey(entry.year, entry.month)}
        />
      ))}
    </span>
  );
}

const PERCENT_RANGE = (low: number, high: number) => `${low.toFixed(2)}–${high.toFixed(2)}%`;

/**
 * The 1-month rate across the trail the answer reads (`buildRatesTrail`): a
 * year of month-ends, then this reading, which is the dot. Autoscaled, so its
 * range is printed beside it (§XV).
 */
export function RatesSparklinePreview({ trail }: { trail: ReadonlyArray<{ recordDate: string; value: number }> }) {
  if (trail.length < 3) return null;
  const points = trail.map((point) => ({ label: point.recordDate, value: point.value }));
  const domain = sparklineDomain(points.map((point) => point.value));
  return (
    <>
      <Sparkline points={points} label="1-month rate" domain={domain} widthEm={5} className="text-slate-300" />
      <span className="text-fluid-nano tabular-nums text-slate-400">
        {trail.length - 1} mo · {PERCENT_RANGE(domain[0], domain[1])}
      </span>
    </>
  );
}
