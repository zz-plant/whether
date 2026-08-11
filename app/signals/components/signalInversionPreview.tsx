import { formatMonthLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";

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

const buildSegmentedLineSeries = ({
  values,
  width,
  height,
  min,
  max,
}: {
  values: Array<number | null>;
  width: number;
  height: number;
  min: number;
  max: number;
}) => {
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const paths: string[] = [];
  const points: Array<{ x: number; y: number; value: number; index: number }> = [];
  const missingColumns: Array<{ x: number; width: number }> = [];
  let currentPath: string[] = [];
  let currentPoints: Array<{ x: number; y: number; value: number; index: number }> = [];

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      if (currentPath.length >= 2) {
        paths.push(currentPath.join(" "));
        points.push(...currentPoints);
      }
      currentPath = [];
      currentPoints = [];
      missingColumns.push({
        x: Math.max(0, index * step - step / 2),
        width: Math.max(step, 4),
      });
      return;
    }

    const x = index * step;
    const y = height - ((value - min) / range) * height;
    currentPath.push(`${currentPath.length === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    currentPoints.push({ x, y, value, index });
  });

  if (currentPath.length >= 2) {
    paths.push(currentPath.join(" "));
    points.push(...currentPoints);
  }

  return {
    paths,
    missingColumns,
    lastPoint: points[points.length - 1] ?? null,
  };
};

const formatBp = (value: number | null) =>
  typeof value === "number" ? `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} bp` : "n/a";

const countMonthsBelowZero = (values: Array<number | null>) =>
  values.filter((value): value is number => typeof value === "number" && value < 0).length;

export function SignalInversionPreview({
  yieldCurveSeries,
}: {
  yieldCurveSeries: YieldCurvePoint[];
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
  const zeroLineY = CHART_HEIGHT - ((0 - spreadMin) / (spreadMax - spreadMin || 1)) * CHART_HEIGHT;
  const spread10Y2YSeries = buildSegmentedLineSeries({
    values: monthlyPoints.map((point) => point.spread10Y2Y),
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    min: spreadMin,
    max: spreadMax,
  });
  const spread2Y3MSeries = buildSegmentedLineSeries({
    values: monthlyPoints.map((point) => point.spread2Y3M),
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    min: spreadMin,
    max: spreadMax,
  });
  const midPoint = monthlyPoints[Math.floor((monthlyPoints.length - 1) / 2)] ?? latest;
  const monthsInverted10Y2Y = countMonthsBelowZero(monthlyPoints.map((point) => point.spread10Y2Y));
  const monthsInverted2Y3M = countMonthsBelowZero(monthlyPoints.map((point) => point.spread2Y3M));
  const hasGaps = spread10Y2YSeries.missingColumns.length > 0 || spread2Y3MSeries.missingColumns.length > 0;

  return (
    <section className="weather-panel space-y-4 px-6 py-5" aria-labelledby="signals-inversion-preview-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Curve context</p>
        <h2 id="signals-inversion-preview-title" className="text-lg font-semibold text-slate-100">
          Inversion timeline before you open the deeper evidence.
        </h2>
        <p className="text-sm text-slate-300">
          Default view keeps the last 12 monthly spread reads visible so you can see whether inversion pressure is easing or deepening before opening detail mode.
        </p>
      </header>
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/45 p-4">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-40 w-full" role="img" aria-label="10Y-2Y and 2Y-3M inversion timeline preview">
          <rect x="0" y={zeroLineY} width={CHART_WIDTH} height={CHART_HEIGHT - zeroLineY} fill="rgba(244,63,94,0.12)" />
          <rect x="0" y="0" width={CHART_WIDTH} height={zeroLineY} fill="rgba(16,185,129,0.08)" />
          {[...spread10Y2YSeries.missingColumns, ...spread2Y3MSeries.missingColumns].map((column, index) => (
            <rect
              key={`missing-${index}`}
              x={column.x}
              y="0"
              width={column.width}
              height={CHART_HEIGHT}
              fill="rgba(148,163,184,0.08)"
            />
          ))}
          <line x1="0" y1={zeroLineY} x2={CHART_WIDTH} y2={zeroLineY} stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
          <text x="2" y={Math.max(6, zeroLineY - 2)} fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-slate-400 uppercase tracking-[0.12em]">
            zero line
          </text>
          {spread10Y2YSeries.paths.map((path, index) => (
            <path key={`10-2-${index}`} d={path} fill="none" stroke="rgb(74 222 128)" strokeWidth="1.6" />
          ))}
          {spread2Y3MSeries.paths.map((path, index) => (
            <path key={`2-3-${index}`} d={path} fill="none" stroke="rgb(250 204 21)" strokeWidth="1.6" />
          ))}
          {spread10Y2YSeries.lastPoint ? (
            <>
              <circle cx={spread10Y2YSeries.lastPoint.x} cy={spread10Y2YSeries.lastPoint.y} r="1.8" fill="rgb(74 222 128)" />
              <text x="98" y={Math.max(5, spread10Y2YSeries.lastPoint.y - 2)} textAnchor="end" fontSize="6" fontFamily="Inter, system-ui, sans-serif" className="fill-emerald-200 uppercase tracking-[0.14em]">
                10Y-2Y
              </text>
            </>
          ) : null}
          {spread2Y3MSeries.lastPoint ? (
            <>
              <circle cx={spread2Y3MSeries.lastPoint.x} cy={spread2Y3MSeries.lastPoint.y} r="1.8" fill="rgb(250 204 21)" />
              <text x="98" y={Math.min(42, spread2Y3MSeries.lastPoint.y + 5)} textAnchor="end" fontSize="6" fontFamily="Inter, system-ui, sans-serif" className="fill-amber-200 uppercase tracking-[0.14em]">
                2Y-3M
              </text>
            </>
          ) : null}
        </svg>
        <div className="mt-2 flex items-center justify-between text-fluid-micro uppercase tracking-[0.08em] text-slate-400">
          <span>{monthlyPoints[0]?.label}</span>
          <span>{midPoint?.label}</span>
          <span>{latest?.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <span>10Y−2Y {formatBp(latest?.spread10Y2Y ?? null)}</span>
          <span>2Y−3M {formatBp(latest?.spread2Y3M ?? null)}</span>
          <span>{monthlyPoints[0]?.label} → {latest?.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-fluid-micro font-semibold uppercase tracking-[0.1em]">
          <span className="rounded-sm border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-emerald-100">
            10Y-2Y inverted {monthsInverted10Y2Y} mo
          </span>
          <span className="rounded-sm border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-amber-100">
            2Y-3M inverted {monthsInverted2Y3M} mo
          </span>
          <span className="rounded-sm border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-300">
            Below zero = inversion pressure
          </span>
          {hasGaps ? (
            <span className="rounded-sm border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-300">
              Breaks = missing monthly reads
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
