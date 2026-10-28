import { ScreenshotCaption } from "../screenshotCaption";
import { ReportSection } from "../reportSection";
import {
  confidenceCalibration,
  confidenceCalibrationTotals,
} from "../../../lib/report/confidenceCalibration";
import { calculateCalibrationDrift } from "../../../lib/report/calibrationDrift";
import { resolveConfidencePercentFromDistance } from "../../../lib/report/confidence";
import { CALL_CHANGE_RULE, describeCalibrationRescore } from "../../../lib/report/trackRecordCopy";

/**
 * What the confidence percent has been worth, against the record.
 *
 * /trust explains how the number is computed. This says whether it has
 * predicted anything, which until now nothing on the site did — and the
 * honest answer is that it has not, in the sense its name implies. Published as
 * a count of months rather than folded back into the number, because seven changes
 * in conditions since 2012 cannot support re-fitting it, and a curve fitted to
 * the base rate would report ~97% for every week and discriminate nothing.
 *
 * /calibration is the study's own URL and wraps the body in a section. /history
 * sets its headline beside the track-record tiles (`ConfidenceRecordSummary`),
 * because "how often did the call hold" and "how often was the margin right" are
 * the same question asked twice, and a reader judging the record should meet
 * both answers in one place. It drew the whole study there until 2026-10-09,
 * table and all, one link away from the page that owns it; the summary is the
 * study's own first sentence, so the two cannot drift.
 */

/* The margin is what the API calls `confidence` (2026-10-09); the study grades it under its display name. */
export const CONFIDENCE_RECORD_TITLE = "What the margin has been worth";

const percentFormat = (value: number) => `${Math.round(value)}%`;

const bandLabel = (from: number, to: number | null) =>
  to === null ? `${from} or more` : `${from} to ${to}`;

/** "2 of 2", "8 of 9" — with "and" before the last item when there is more than one. */
const listClauses = (clauses: string[]) => {
  if (clauses.length === 1) return clauses[0] ?? "";
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses.at(-1) ?? ""}`;
};

/** One band as the table prints it and the chart draws it: one derivation for both (§XV). */
type BandRow = { from: number; label: string; published: number; held: number; months: number };

const toRows = (bands: ReturnType<typeof confidenceCalibration>): BandRow[] =>
  bands.map((band) => ({
    from: band.from,
    label: bandLabel(band.from, band.to),
    published: resolveConfidencePercentFromDistance(band.from, false),
    held: (band.held / band.months) * 100,
    months: band.months,
  }));

/**
 * The study's finding, drawn: each band's published percent against how often
 * conditions held, one dot per band sized by its months, on the line where the
 * two would be equal. "Every band held more often than the percent published"
 * is every dot above that line, and "the two closest bands run in the wrong
 * order" is the second dot sitting below the first. The paragraph said both and
 * only the table could show them, one number at a time.
 *
 * It replaces a curve drawn from four hard-coded points, removed on 2026-10-09;
 * this one reads the rows the table prints and draws nothing without them. The
 * dots carry no labels: the table under it names each band, and a dot's title
 * names it on hover.
 */
function MarginReliabilityChart({ rows }: { rows: readonly BandRow[] }) {
  const W = 300;
  const H = 220;
  const pad = { l: 52, r: 14, t: 14, b: 40 };
  /* Room inside the frame for the largest dot, so a band at 100% sits inside it (§XVII). */
  const inset = 12;
  const lowest = Math.min(...rows.flatMap((row) => [row.published, row.held]));
  const lo = Math.min(50, Math.floor(lowest / 10) * 10);
  const x = (value: number) => pad.l + inset + ((value - lo) / (100 - lo)) * (W - pad.l - pad.r - 2 * inset);
  const y = (value: number) => H - pad.b - inset - ((value - lo) / (100 - lo)) * (H - pad.t - pad.b - 2 * inset);
  const ticks = [lo, (lo + 100) / 2, 100];
  const radius = (months: number) => 3 + Math.sqrt(months) * 0.9;
  return (
    <figure className="m-0 space-y-2" data-margin-reliability>
      <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot block h-auto w-full max-w-[24rem] text-slate-200" aria-hidden="true">
        <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="none" stroke="currentColor" strokeOpacity="0.18" />
        {ticks.map((tick) => (
          <g key={tick}>
            <text x={x(tick)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">{`${tick}%`}</text>
            <text x={pad.l - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor" opacity="0.7">{`${tick}%`}</text>
          </g>
        ))}
        <line x1={x(lo)} y1={y(lo)} x2={x(100)} y2={y(100)} stroke="currentColor" strokeOpacity="0.5" strokeDasharray="4 4" />
        {rows.map((row) => (
          <circle
            key={row.from}
            cx={x(row.published)}
            cy={y(row.held)}
            r={radius(row.months)}
            fill="currentColor"
            fillOpacity="0.85"
            stroke="var(--bg-body)"
            strokeWidth="2"
            data-published={Math.round(row.published)}
            data-held={Math.round(row.held)}
          >
            <title>{`${row.label} points from the line: published ${percentFormat(row.published)}, held ${percentFormat(row.held)} across ${row.months} months`}</title>
          </circle>
        ))}
        <text x={pad.l} y={H - 6} fontSize="11" fill="currentColor" opacity="0.7">Published % →</text>
        <text textAnchor="middle" transform={`translate(10 ${(pad.t + H - pad.b) / 2}) rotate(-90)`} fontSize="11" fill="currentColor" opacity="0.7">Held % →</text>
      </svg>
      <figcaption className="max-w-[36rem] text-fluid-xs text-slate-400">
        Each dot is a band of the table below, sized by its months. Above the dashed line, the band held more
        often than its published percent; below it, less often.
      </figcaption>
      <ScreenshotCaption />
    </figure>
  );
}

/** The bands and the base rate, or null when the archive holds nothing to grade. */
const loadRecord = () => {
  const bands = confidenceCalibration().filter((band) => band.months > 0);
  const totals = confidenceCalibrationTotals();
  if (bands.length === 0 || totals.months === 0) return null;
  return { bands, totals, baseRate: (totals.held / totals.months) * 100 };
};

/** The study's headline: how often conditions held from one month-end to the next. */
const BaseRateSentence = ({ totals, baseRate }: Pick<NonNullable<ReturnType<typeof loadRecord>>, "totals" | "baseRate">) => (
  <>
    Across {totals.months} month-to-month comparisons, conditions were the same the following
    month {totals.held} times, or {percentFormat(baseRate)}.
  </>
);

/** The headline alone, for /history, which links to the study rather than reprinting it. */
export function ConfidenceRecordSummary() {
  const record = loadRecord();
  if (!record) return null;
  return (
    <p className="text-sm text-slate-200" data-confidence-record-summary>
      <BaseRateSentence totals={record.totals} baseRate={record.baseRate} />
    </p>
  );
}

/**
 * The paragraph, the table and the footnote, which closes on `CALL_CHANGE_RULE`
 * (printed once per page, lib/report/AGENTS.md). Only /calibration draws the body
 * now; /history states the rule under its track-record tiles.
 */
function ConfidenceRecordBody() {
  const record = loadRecord();
  if (!record) return null;
  const { bands, totals, baseRate } = record;
  const rows = toRows(bands);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-200">
        <BaseRateSentence totals={totals} baseRate={baseRate} /> Every band below held more often
        than its published percent, and the two closest bands are in the wrong order. So read the
        margin as a distance, not a probability. It says how much room there is before the
        line where conditions change; the count beside it says how often that room mattered.
      </p>

      <MarginReliabilityChart rows={rows} />

      <table className="w-full text-sm text-slate-200">
        <caption className="sr-only">
          How often conditions held, by distance from the nearest change line
        </caption>
        <thead>
          <tr className="type-eyebrow text-slate-400">
            <th scope="col" className="py-1 text-left font-normal">Points from the line</th>
            <th scope="col" className="py-1 pl-3 text-right font-normal">Published %</th>
            <th scope="col" className="py-1 pl-3 text-right font-normal">Held</th>
            <th scope="col" className="py-1 pl-3 text-right font-normal">Months</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.from} className="border-t border-slate-800/80">
              <th scope="row" className="py-1.5 text-left font-normal">{row.label}</th>
              <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">{percentFormat(row.published)}</td>
              <td className="py-1.5 pl-3 text-right tabular-nums">{percentFormat(row.held)}</td>
              <td className="py-1.5 pl-3 text-right tabular-nums text-slate-400">{row.months}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <RecentYearParagraph />

      <p className="text-fluid-xs text-slate-400">
        A held month means conditions did not change.
        {" "}
        {CALL_CHANGE_RULE}
      </p>
      <p className="text-fluid-xs text-slate-400" data-record-rescore>
        {describeCalibrationRescore({ held: totals.held, comparisons: totals.months })}
      </p>
    </div>
  );
}

/**
 * The recent year, graded under the same rule as the table, so the finding cannot quietly
 * become an old average. Unmeasured renders nothing: a year too thin to grade is a gap, not
 * a guess — the same rule the scheduled-runs section holds itself to.
 */
function RecentYearParagraph() {
  const drift = calculateCalibrationDrift();
  if (drift.status === "unmeasured") return null;

  const clause = (band: (typeof drift.bands)[number]) =>
    `${band.held} of ${band.months} in the ${bandLabel(band.from, band.to)} band against a published ${band.publishedPercent}%`;

  if (drift.status === "stable") {
    return (
      <p className="text-sm text-slate-200">
        The finding holds in the recent year too. Across the most recent twelve month-end readings,
        every band with a comparison still held more often than the percent said:{" "}
        {listClauses(drift.bands.map(clause))}.
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-200">
      The most recent twelve month-end readings break the pattern above:{" "}
      {listClauses(drift.bands.filter((band) => !band.percentUnderstates).map(clause))}. The
      finding describes the archive, not this year.
    </p>
  );
}

/** The study on its own URL, /calibration. */
export function ConfidenceRecordSection() {
  if (!loadRecord()) return null;

  return (
    /* No description: the page's own intro, directly above, says what the margin
       measures and what this checks it against (2026-10-09). */
    <ReportSection id="confidence-record" title={CONFIDENCE_RECORD_TITLE}>
      <ConfidenceRecordBody />
    </ReportSection>
  );
}
