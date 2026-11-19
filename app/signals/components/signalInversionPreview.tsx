import { scaleLinear } from "d3-scale";
import { CURVE_SPREAD_LABELS, CurveTermsKey, formatSpread } from "./curveTermsKey";
import { buildSegmentedLineSeries } from "./segmentedLineSeries";
import { InstrumentQuestion } from "./instrumentQuestion";
import { InversionCell, InversionCells } from "./instrumentPreviews";
import { MonthReadoutStrip } from "./monthReadoutStrip";
import { columnMonthLabel, columnYearLabel } from "./instrumentMonthHref";
import { describeInversionSummary, summarizeInversionMonths } from "../../../lib/report/evidenceInstrumentSummaries";
import { UrlDetails } from "../../components/ui/urlDetails";

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

const CHART_WIDTH = 100;
const CHART_HEIGHT = 44;

/**
 * One of the evidence page's instruments: a disclosure titled with the
 * question the chart answers, closed until the reader asks it. The page passes
 * the list's shared frame and summary classes.
 *
 * The months, their spreads and the two counts come from
 * `summarizeInversionMonths`, which the answer, the strips beside it and the
 * month row in the panel all read.
 */
export function SignalInversionPreview({
  yieldCurveSeries,
  className,
  summaryClassName,
  open = false,
  monthHref,
}: {
  yieldCurveSeries: YieldCurvePoint[];
  className?: string;
  summaryClassName?: string;
  /** Opened by a link carrying `curve=1`, the key the panel writes when a reader opens it. */
  open?: boolean;
  /** Where each month in the panel's month row opens (`instrumentMonthHref`); without it the row is not drawn. */
  monthHref?: (month: { year: number; month: number }) => string | null;
}) {
  const inversion = summarizeInversionMonths(yieldCurveSeries);
  const monthlyPoints = inversion.months;
  if (monthlyPoints.length === 0) {
    return null;
  }

  const latest = monthlyPoints[monthlyPoints.length - 1] ?? null;
  const spreadValues = monthlyPoints.flatMap((point) => [point.spread10Y2Y, point.spread2Y3M]);
  const numericSpreads = spreadValues.filter((value): value is number => typeof value === "number");
  const spreadMin = numericSpreads.length ? Math.min(...numericSpreads, 0) - 0.1 : -0.5;
  const spreadMax = numericSpreads.length ? Math.max(...numericSpreads, 0) + 0.1 : 0.5;
  const yScale = scaleLinear().domain([spreadMin, spreadMax]).range([CHART_HEIGHT, 0]);
  const zeroLineY = Number(yScale(0).toFixed(2));
  const spread10Y2YSeries = buildSegmentedLineSeries({
    values: monthlyPoints.map((point) => point.spread10Y2Y),
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    min: spreadMin,
    max: spreadMax,
    curve: "monotone",
    baselineY: zeroLineY,
  });
  const spread2Y3MSeries = buildSegmentedLineSeries({
    values: monthlyPoints.map((point) => point.spread2Y3M),
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    min: spreadMin,
    max: spreadMax,
    curve: "monotone",
  });
  const midPoint = monthlyPoints[Math.floor((monthlyPoints.length - 1) / 2)] ?? latest;
  const monthsInverted10Y2Y = inversion.inverted10Y2Y;
  const monthsInverted2Y3M = inversion.inverted2Y3M;
  const [firstSpread, secondSpread] = inversion.order;
  const hasGaps = spread10Y2YSeries.missingColumns.length > 0 || spread2Y3MSeries.missingColumns.length > 0;

  return (
    <UrlDetails
      id="curve-context"
      queryKey="curve"
      initialOpen={open}
      className={className}
      summaryClassName={summaryClassName}
      /* The answer from the counts the caption under the chart prints. */
      summary={
        <InstrumentQuestion
          question="Has the yield curve inverted in the last year?"
          answer={describeInversionSummary({
            months: monthlyPoints.length,
            inverted10Y2Y: monthsInverted10Y2Y,
            inverted2Y3M: monthsInverted2Y3M,
          })}
          preview={<InversionCells summary={inversion} />}
        />
      }
    >
      <div className="space-y-4">
        {/* The chart is labelled in bond-desk shorthand. This says what it is
            before the reader has to decode the axes. */}
        <p className="text-sm text-slate-300">
          Long-term minus short-term U.S. Treasury rates over the last 12 month-ends. Below zero means short-term borrowing costs more than long-term—a pattern that has preceded most U.S. recessions.
        </p>
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/45 p-4">
          <svg viewBox={`-2 -2 ${CHART_WIDTH + 4} ${CHART_HEIGHT + 4}`} className="weather-data-plot mx-auto h-auto w-full max-w-[40rem]" aria-label="Inversion timeline: ten-year minus two-year spread and two-year minus three-month spread">
            {/* Zone fills and strokes were hardcoded rgba() tuned to the dark
                ground; on the light theme they rendered as dark-toned washes. */}
            <rect x="0" y={zeroLineY} width={CHART_WIDTH} height={CHART_HEIGHT - zeroLineY} fill="var(--color-semantic-tightening-border)" fillOpacity="0.12" />
            <rect x="0" y="0" width={CHART_WIDTH} height={zeroLineY} fill="var(--color-semantic-easing-border)" fillOpacity="0.08" />
            {[...spread10Y2YSeries.missingColumns, ...spread2Y3MSeries.missingColumns].map((column, index) => (
              <rect
                key={`missing-${index}`}
                x={column.x}
                y="0"
                width={column.width}
                height={CHART_HEIGHT}
                fill="var(--border-subtle)"
              />
            ))}
            <line x1="0" y1={zeroLineY} x2={CHART_WIDTH} y2={zeroLineY} stroke="var(--border-strong)" strokeDasharray="2 2" />
            {spread10Y2YSeries.areaPaths.map((areaPath, index) => (
              <path key={`10-2-area-${index}`} d={areaPath} fill="var(--color-semantic-easing-border)" fillOpacity="0.08" />
            ))}

            {spread10Y2YSeries.paths.map((path, index) => (
              <path key={`10-2-${index}`} d={path} fill="none" stroke="var(--color-semantic-easing-border)" strokeWidth="2" />
            ))}
            {spread2Y3MSeries.paths.map((path, index) => (
              <path key={`2-3-${index}`} d={path} fill="none" stroke="var(--app-text-muted)" strokeDasharray="4 3" strokeWidth="2" />
            ))}
            {/* Endpoint dots, no in-plot text. The series labels that sat here were
                anchored to each line's last point at the right edge — exactly where
                the lines terminate — so they printed on top of the data, and when the
                two spreads converged they printed on top of each other. Both series
                are named twice directly below: in the colour-matched inversion chips
                and again in the definitions row. The dots keep the direct anchor; the
                chips carry the names. */}
            {spread10Y2YSeries.lastPoint ? (
              <circle cx={spread10Y2YSeries.lastPoint.x} cy={spread10Y2YSeries.lastPoint.y} r="1.8" fill="var(--color-semantic-easing-border)" />
            ) : null}
            {spread2Y3MSeries.lastPoint ? (
              <circle cx={spread2Y3MSeries.lastPoint.x} cy={spread2Y3MSeries.lastPoint.y} r="1.8" fill="var(--app-text-muted)" />
            ) : null}
          </svg>
          {/* One caption carries the legend. It was four uppercase chips under
              the values row — two restating the series names the row above had
              just printed with their colours, one restating this sentence, and
              one for gaps — which read as a second control strip. */}
          <p className="mt-1 text-xs tabular-nums text-slate-400">
            Dashed zero line; below it, the curve is inverted. The {CURVE_SPREAD_LABELS.spread10Y2Y.toLowerCase()} has been inverted{" "}
            {monthsInverted10Y2Y} of {monthlyPoints.length} months, the {CURVE_SPREAD_LABELS.spread2Y3M} spread {monthsInverted2Y3M} of{" "}
            {monthlyPoints.length}.{hasGaps ? " Breaks are missing monthly reads." : ""}
          </p>
          <div className="mt-2 flex items-center justify-between type-eyebrow">
            <span>{monthlyPoints[0]?.label}</span>
            <span>{midPoint?.label}</span>
            <span>{latest?.label}</span>
          </div>
          {/* The strips over the question, month by month and open: each month
              a link to the guidance as it read then, its two spreads printed
              on hover or focus. */}
          {monthHref ? (
            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <MonthReadoutStrip
                label={`Months, ${monthlyPoints[0]?.label} to ${latest?.label}`}
                caption={
                  <>
                    Top row {CURVE_SPREAD_LABELS[firstSpread].toLowerCase()}, bottom row{" "}
                    {CURVE_SPREAD_LABELS[secondSpread].toLowerCase()}; filled where it sat below zero. A month opens
                    the guidance as it read then.
                  </>
                }
                months={monthlyPoints.map((point, index) => ({
                  key: point.key,
                  label: point.label,
                  shortLabel: columnMonthLabel(point.year, point.month),
                  yearLabel: columnYearLabel(point.year, point.month, index),
                  readout: `${CURVE_SPREAD_LABELS[firstSpread]} ${formatSpread(point[firstSpread])}, ${CURVE_SPREAD_LABELS[
                    secondSpread
                  ].toLowerCase()} ${formatSpread(point[secondSpread])}`,
                  href: monthHref(point),
                  mark: (
                    <span className="grid w-full max-w-4 gap-1">
                      {inversion.order.map((key) => (
                        <InversionCell key={key} month={point} spread={key} className="h-2.5 w-full" />
                      ))}
                    </span>
                  ),
                }))}
              />
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-[var(--color-semantic-easing-border)]" aria-hidden="true" />
              <span>{CURVE_SPREAD_LABELS.spread10Y2Y} <strong className="font-semibold tabular-nums text-slate-100">{formatSpread(latest?.spread10Y2Y ?? null)}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-[var(--app-text-muted)]" aria-hidden="true" />
              <span>{CURVE_SPREAD_LABELS.spread2Y3M} <strong className="font-semibold tabular-nums text-slate-100">{formatSpread(latest?.spread2Y3M ?? null)}</strong></span>
            </span>
            <span>{monthlyPoints[0]?.label} → {latest?.label}</span>
            {/* Autoscaled to the visible window, so the extent has to be stated. */}
            <span className="tabular-nums text-slate-400">
              Vertical scale {formatSpread(spreadMin)} to {formatSpread(spreadMax)}
            </span>
          </div>
          {/* Names the gauge's instrument and defines pp. The legend said "10Y−2Y
              0.41pp" until 2026-11-03, shorthand this key then expanded. The
              readings were in bp ("+41.0 bp") on a page whose gauge row prints
              the same spread as 0.41pp, so the key defines pp now. */}
          <CurveTermsKey
            terms={["spread10Y2Y", "pp"]}
            className="mt-3 border-t border-slate-800/80 pt-3"
          />
        </div>
      </div>
    </UrlDetails>
  );
}
