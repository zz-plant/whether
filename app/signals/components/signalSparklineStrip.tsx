import {
  Sparkline,
  interquartileRange,
  rangeLabel,
  sparklineDomain,
  type SparklinePoint,
  type SparklineTone,
} from "../../components/ui/sparkline";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "../../components/illustrations/TrendGlyph";

export type SignalSparklineSeries = {
  key: string;
  label: string;
  points: SparklinePoint[];
  /** Appetite-style scores improve when they rise; pressure-style ones worsen. */
  increaseIsPositive?: boolean;
  /** How the strip names the window, e.g. "12 mo". */
  windowLabel: string;
};

/**
 * Small multiples of the composite signals: one cell per signal with the
 * current reading, the move across the window, and the series with its
 * interquartile band. The same encoding the hero uses for the boldness
 * budget, so a reader who has learned one has learned both. Replaced a pair of
 * lone twelve-month lines that carried no number and no band.
 */
export function SignalSparklineStrip({ series }: { series: SignalSparklineSeries[] }) {
  const drawable = series.filter((item) => item.points.length >= 2);
  if (drawable.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Signal readings over the window">
      {drawable.map((item) => {
        const values = item.points.map((point) => point.value);
        const first = values[0];
        const last = values[values.length - 1];
        const delta = last - first;
        const direction = trendDirectionFromDelta(delta);
        const tone: SparklineTone =
          delta === 0 ? "unchanged" : (delta > 0) === Boolean(item.increaseIsPositive) ? "easing" : "tightening";
        const domain = sparklineDomain(values);
        return (
          <li key={item.key} className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-fluid-nano text-slate-400">{item.label}</p>
              <p className="text-fluid-nano tabular-nums text-slate-500">{item.windowLabel} · {rangeLabel(domain)}</p>
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="tabular-nums">
                <span className="text-2xl font-semibold text-slate-100">{Math.round(last)}</span>
                <span className="text-sm text-slate-500">/100</span>
                <span className={`ml-2 inline-flex items-center gap-1 text-fluid-xs ${trendToneClass(direction, item.increaseIsPositive)}`}>
                  <TrendGlyph direction={direction} className="h-3 w-3" />
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(0)} over {item.windowLabel}
                </span>
              </p>
              <Sparkline
                points={item.points}
                label={item.label}
                domain={domain}
                band={interquartileRange(values)}
                tone={tone}
                widthEm={9}
                className="text-slate-300"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
