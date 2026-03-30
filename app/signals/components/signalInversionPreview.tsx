import { formatMonthLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

type MonthlyPoint = {
  label: string;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

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

  return Array.from(grouped.values())
    .map((points) => ({
      label: formatMonthLabel(points[0].year, points[0].month),
      spread10Y2Y: mean(points.map((point) => point.spread10Y2Y)),
      spread2Y3M: mean(points.map((point) => point.spread2Y3M)),
    }))
    .slice(-12);
};

const linePath = (values: Array<number | null>, width: number, height: number, min: number, max: number) => {
  const valid = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => typeof point.value === "number");
  if (valid.length < 2) {
    return "";
  }

  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  return valid
    .map((point, index) => {
      const x = point.index * step;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const formatBp = (value: number | null) =>
  typeof value === "number" ? `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} bp` : "n/a";

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
  const zeroLineY = 44 - ((0 - spreadMin) / (spreadMax - spreadMin || 1)) * 44;

  return (
    <section className="weather-panel space-y-4 px-6 py-5" aria-labelledby="signals-inversion-preview-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Curve context</p>
        <h2 id="signals-inversion-preview-title" className="text-lg font-semibold text-slate-100">
          Inversion timeline before you open the full appendix.
        </h2>
        <p className="text-sm text-slate-300">
          Default view keeps the last 12 monthly spread reads visible so you can see whether inversion pressure is easing or deepening before opening detail mode.
        </p>
      </header>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-4">
        <svg viewBox="0 0 100 44" className="h-40 w-full" role="img" aria-label="10Y-2Y and 2Y-3M inversion timeline preview">
          <line x1="0" y1={zeroLineY} x2="100" y2={zeroLineY} stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
          <path d={linePath(monthlyPoints.map((point) => point.spread10Y2Y), 100, 44, spreadMin, spreadMax)} fill="none" stroke="rgb(74 222 128)" strokeWidth="1.6" />
          <path d={linePath(monthlyPoints.map((point) => point.spread2Y3M), 100, 44, spreadMin, spreadMax)} fill="none" stroke="rgb(250 204 21)" strokeWidth="1.6" />
        </svg>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <span>10Y−2Y {formatBp(latest?.spread10Y2Y ?? null)}</span>
          <span>2Y−3M {formatBp(latest?.spread2Y3M ?? null)}</span>
          <span>{monthlyPoints[0]?.label} → {latest?.label}</span>
        </div>
      </div>
    </section>
  );
}
