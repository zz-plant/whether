import {
  Sparkline,
  interquartileRange,
  rangeLabel,
  sparklineDomain,
  type SparklinePoint,
  type SparklineTone,
} from "../../components/ui/sparkline";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "../../components/illustrations/TrendGlyph";
import { summarizeScoreWindow } from "../../../lib/report/evidenceInstrumentSummaries";

type SignalSparklineSeries = {
  key: string;
  label: string;
  points: SparklinePoint[];
  /** Appetite-style scores improve when they rise; pressure-style ones worsen. */
  increaseIsPositive?: boolean;
  /** How the strip names the window, e.g. "12 mo". */
  windowLabel: string;
};

/**
 * Small multiples of the composite signals: one cell per signal with the last
 * reading in the window, the move across it, and the series with its
 * interquartile band. The same encoding the hero uses for the boldness
 * budget, so a reader who has learned one has learned both. Replaced a pair of
 * lone twelve-month lines that carried no number and no band.
 *
 * The big number is the **last point of the window**, not this week's score,
 * and the two differ: this series is the month-end archive, so on a page whose
 * scorecard says funding pressure 77 this cell said 63. Both are right and
 * nothing said which was which — a reader comparing the two numbers for the
 * same named signal has no way in. Every cell now stamps the period its number
 * belongs to, taken from the point itself rather than passed in beside it,
 * because a caller that can name the wrong month is the defect this fixes.
 */
export function SignalSparklineStrip({ series }: { series: SignalSparklineSeries[] }) {
  const drawable = series.filter((item) => item.points.length >= 2);
  if (drawable.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Signal readings over the window">
      {drawable.flatMap((item) => {
        /* The window through the function the summary over this strip reads,
           so the closed question and the opened cells quote the same move. */
        const window = summarizeScoreWindow(item.points);
        if (!window) return [];
        const { last, delta, periodLabel: latestPeriodLabel } = window;
        const values = item.points.map((point) => point.value);
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
              <div className="min-w-0">
                <p className="tabular-nums">
                  <span className="text-2xl font-semibold text-slate-100">{Math.round(last)}</span>
                  <span className="text-sm text-slate-500">/100</span>
                  <span className={`ml-2 inline-flex items-center gap-1 text-fluid-xs ${trendToneClass(direction, item.increaseIsPositive)}`}>
                    <TrendGlyph direction={direction} className="h-3 w-3" />
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(0)} over {item.windowLabel}
                  </span>
                </p>
                {latestPeriodLabel ? (
                  <p className="mt-0.5 text-fluid-nano text-slate-500">
                    at {latestPeriodLabel} month-end
                  </p>
                ) : null}
              </div>
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
