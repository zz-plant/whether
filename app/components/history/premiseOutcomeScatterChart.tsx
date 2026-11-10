import type { PremiseTestBacktestModel } from "../../../lib/research/premiseBacktestModel";
import { ScreenshotCaption } from "../../components/screenshotCaption";

/**
 * Premise Outcome Comparison Chart (ui-ux-standards §XV, §XVI).
 * Draws forward 4-quarter VC deal growth across 51 quarters comparing
 * Tight conditions (funding pressure > 70) vs. Calm conditions (<= 70).
 */
export function PremiseOutcomeScatterChart({
  model,
  className = "",
}: {
  model: PremiseTestBacktestModel;
  className?: string;
}) {
  const { quarters, tightDistribution, calmDistribution } = model;
  if (quarters.length === 0) return null;

  const W = 360;
  const H = 240;
  const pad = { l: 60, r: 24, t: 20, b: 36 };

  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const minVal = -0.5;
  const maxVal = 0.8;
  const span = maxVal - minVal;

  const yOf = (val: number) => pad.t + plotH - ((val - minVal) / span) * plotH;
  const xColTight = pad.l + plotW * 0.28;
  const xColCalm = pad.l + plotW * 0.72;

  const percent = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;

  return (
    <figure data-premise-outcome-chart className={`weather-surface space-y-2 p-4 ${className}`.trim()}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">Venture deal value growth over the next four quarters</span>
        <span className="tabular-nums text-slate-400">
          51 quarters (2012–2024)
        </span>
      </figcaption>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot block h-auto w-full text-slate-300" aria-hidden="true">
          {/* Zero line */}
          <line x1={pad.l} x2={W - pad.r} y1={yOf(0)} y2={yOf(0)} stroke="var(--border-default)" strokeWidth="1" />
          <text x={pad.l - 6} y={yOf(0) + 3.5} textAnchor="end" fontSize="10" fill="var(--app-text-muted)">
            0%
          </text>

          {/* Grid lines */}
          {[-0.4, 0.4].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)} stroke="var(--border-subtle)" strokeDasharray="2 3" />
              <text x={pad.l - 6} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--app-text-muted)">
                {percent(v)}
              </text>
            </g>
          ))}

          {/* Column Dividers & Labels */}
          <text x={xColTight} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--app-text)">
            Tight ({tightDistribution.count}Q)
          </text>
          <text x={xColCalm} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--app-text)">
            Calm ({calmDistribution.count}Q)
          </text>

          {/* Median Bars */}
          <line
            x1={xColTight - 24}
            x2={xColTight + 24}
            y1={yOf(tightDistribution.medianForwardValue)}
            y2={yOf(tightDistribution.medianForwardValue)}
            stroke="var(--line-crossed)"
            strokeWidth="3"
          />
          <line
            x1={xColCalm - 24}
            x2={xColCalm + 24}
            y1={yOf(calmDistribution.medianForwardValue)}
            y2={yOf(calmDistribution.medianForwardValue)}
            stroke="var(--color-condition-sunny)"
            strokeWidth="3"
          />

          {/* Scatter dots */}
          {quarters.map((q, idx) => {
            const cx = q.tight ? xColTight : xColCalm;
            // Jitter x slightly based on index
            const jitter = ((idx % 7) - 3) * 4;
            const cy = yOf(q.forwardValue);

            return (
              <circle
                key={q.quarter}
                cx={cx + jitter}
                cy={cy}
                r={3}
                fill={q.tight ? "var(--line-crossed)" : "var(--color-condition-sunny)"}
                fillOpacity={0.65}
                stroke="var(--bg-panel)"
                strokeWidth="1"
              >
                <title>{`${q.quarter}: funding pressure ${q.fundingPressure}, deal value over the next four quarters ${percent(q.forwardValue)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-fluid-nano text-slate-400 border-t border-[color:var(--border-faint)] pt-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-3 bg-[var(--line-crossed)]" />
          <span>Tight (funding pressure &gt; 70) median: {percent(tightDistribution.medianForwardValue)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-3 bg-[var(--color-condition-sunny)]" />
          <span>Calm (funding pressure &le; 70) median: {percent(calmDistribution.medianForwardValue)}</span>
        </span>
      </div>
      <ScreenshotCaption detail="NVCA venture deal value, 51 quarters, 2012–2024" />
    </figure>
  );
}
