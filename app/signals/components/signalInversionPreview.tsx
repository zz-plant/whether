import { scaleLinear } from "d3-scale";
import { formatMonthLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";
import { CurveTermsKey, formatSpread } from "./curveTermsKey";
import { buildSegmentedLineSeries } from "./segmentedLineSeries";
import { InstrumentQuestion } from "./instrumentQuestion";
import { describeInversionSummary } from "../../../lib/report/evidenceInstrumentSummaries";
import { UrlDetails } from "../../components/ui/urlDetails";

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

type MonthlyPoint = {
  key: string;
  label: string;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

const CHART_WIDTH = 100;
const CHART_HEIGHT = 44;

const mean = (values: Array<number | null>) => {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (!numeric.length) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
};

const toMonthlyPoints = (series: YieldCurvePoint[]): MonthlyPoint[] => {
  const grouped = new Map<string, YieldCurvePoint[]>();

  series.forEach((point) => {
    const date = new Date(point.recordDate);
    if (Number.isNaN(date.valueOf())) {
      return;
    }

    const key = toMonthInput(date.getUTCFullYear(), date.getUTCMonth() + 1);
    grouped.set(key, [...(grouped.get(key) ?? []), point]);
  });

  return Array.from(grouped.entries())
    .map(([key, points]) => ({
      key,
      label: formatMonthLabel(points[0].year, points[0].month),
      spread10Y2Y: mean(points.map((point) => point.spread10Y2Y)),
      spread2Y3M: mean(points.map((point) => point.spread2Y3M)),
    }))
    .slice(-12);
};

const countMonthsBelowZero = (values: Array<number | null>) =>
  values.filter((value): value is number => typeof value === "number" && value < 0).length;

/**
 * One of the evidence page's instruments: a disclosure titled with the
 * question the chart answers, closed until the reader asks it. The page passes
 * the list's shared frame and summary classes.
 */
export function SignalInversionPreview({
  yieldCurveSeries,
  className,
  summaryClassName,
  open = false,
}: {
  yieldCurveSeries: YieldCurvePoint[];
  className?: string;
  summaryClassName?: string;
  /** Opened by a link carrying `curve=1`, the key the panel writes when a reader opens it. */
  open?: boolean;
}) {
  const monthlyPoints = toMonthlyPoints(yieldCurveSeries);
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
  const monthsInverted10Y2Y = countMonthsBelowZero(monthlyPoints.map((point) => point.spread10Y2Y));
  const monthsInverted2Y3M = countMonthsBelowZero(monthlyPoints.map((point) => point.spread2Y3M));
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
        />
      }
    >
      <div className="space-y-4">
        {/* The chart is labelled in bond-desk shorthand. This says what it is
            before the reader has to decode the axes. */}
        <p className="text-sm text-slate-300">
          Each line is the gap between what the U.S. government pays to borrow long-term and what it
          pays short-term. When a line drops below zero, short-term borrowing costs more than
          long-term, the pattern that has run ahead of most U.S. recessions. The last 12 month-end
          readings show whether that pressure is easing or deepening.
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
            Dashed zero line; below it, the curve is inverted. 10Y−2Y has been inverted{" "}
            {monthsInverted10Y2Y} of {monthlyPoints.length} months, 2Y−3M {monthsInverted2Y3M} of{" "}
            {monthlyPoints.length}.{hasGaps ? " Breaks are missing monthly reads." : ""}
          </p>
          <div className="mt-2 flex items-center justify-between type-eyebrow">
            <span>{monthlyPoints[0]?.label}</span>
            <span>{midPoint?.label}</span>
            <span>{latest?.label}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-[var(--color-semantic-easing-border)]" aria-hidden="true" />
              <span>10Y−2Y <strong className="font-semibold tabular-nums text-slate-100">{formatSpread(latest?.spread10Y2Y ?? null)}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-[var(--app-text-muted)]" aria-hidden="true" />
              <span>2Y−3M <strong className="font-semibold tabular-nums text-slate-100">{formatSpread(latest?.spread2Y3M ?? null)}</strong></span>
            </span>
            <span>{monthlyPoints[0]?.label} → {latest?.label}</span>
            {/* Autoscaled to the visible window, so the extent has to be stated. */}
            <span className="tabular-nums text-slate-400">
              Vertical scale {formatSpread(spreadMin)} to {formatSpread(spreadMax)}
            </span>
          </div>
          {/* Expands the axis shorthand. Without it, "10Y−2Y 0.41pp" is
              unreadable to anyone who has not traded bonds. The readings were
              in bp ("+41.0 bp") on a page whose gauge row prints the same
              spread as 0.41pp, so the key defines pp now. */}
          <CurveTermsKey
            terms={["spread10Y2Y", "spread2Y3M", "pp"]}
            className="mt-3 border-t border-slate-800/80 pt-3"
          />
        </div>
      </div>
    </UrlDetails>
  );
}
