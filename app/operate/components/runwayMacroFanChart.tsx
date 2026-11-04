import type { RunwayMacroFanModel } from "../../../lib/report/runwayMacroFan";
import { ScreenshotCaption } from "../../components/screenshotCaption";

/**
 * Runway Macro Fan Chart (ui-ux-standards §XV, §XVI).
 * Draws cash depletion curves (Baseline vs. Committed Decision) against
 * historical macro regime duration bands (Current, Median, and Longest past spell).
 */
export function RunwayMacroFanChart({
  model,
  className = "",
}: {
  model: RunwayMacroFanModel;
  className?: string;
}) {
  const { points, maxMonths, initialCashUsd, baselineCashOutMonth, committedCashOutMonth, benchmark } = model;
  if (points.length === 0 || initialCashUsd <= 0) return null;

  const W = 460;
  const H = 220;
  const pad = { l: 60, r: 24, t: 20, b: 36 };

  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const xOf = (m: number) => pad.l + (Math.min(m, maxMonths) / maxMonths) * plotW;
  const yOf = (cash: number) => pad.t + plotH - (Math.min(cash, initialCashUsd) / initialCashUsd) * plotH;

  const formatCash = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(val / 1_000)}k`;
  };

  const baselinePath = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${xOf(p.monthOffset).toFixed(1)} ${yOf(p.baselineCashUsd).toFixed(1)}`)
    .join(" ");

  const hasCommitted = points.some((p) => p.committedCashUsd !== null);
  const committedPath = hasCommitted
    ? points
        .map((p, idx) => `${idx === 0 ? "M" : "L"}${xOf(p.monthOffset).toFixed(1)} ${yOf(p.committedCashUsd ?? 0).toFixed(1)}`)
        .join(" ")
    : null;

  // Month tick markers every 6 months
  const monthTicks = Array.from({ length: Math.floor(maxMonths / 6) + 1 }, (_, i) => i * 6);

  const effectiveCashOut = committedCashOutMonth ?? baselineCashOutMonth;
  const outlastVerdict = benchmark && effectiveCashOut !== null
    ? effectiveCashOut >= benchmark.medianPastSpellMonths
      ? `Your ${effectiveCashOut}-month runway outlasts the median ${benchmark.regimeLabel} spell (${benchmark.medianPastSpellMonths} mo)${
          effectiveCashOut < benchmark.longestPastSpellMonths
            ? `, but depletes before the longest past spell (${benchmark.longestPastSpellMonths} mo).`
            : " and outlasts the longest recorded spell."
        }`
      : `Your ${effectiveCashOut}-month runway depletes ${benchmark.medianPastSpellMonths - effectiveCashOut} months before the median ${benchmark.regimeLabel} spell ends (${benchmark.medianPastSpellMonths} mo).`
    : null;

  return (
    <figure data-runway-macro-fan className={`weather-surface space-y-2 p-4 ${className}`.trim()}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">Runway depletion vs. cycle duration</span>
        <span className="tabular-nums text-slate-400">
          {baselineCashOutMonth !== null ? `Cash-out: month ${baselineCashOutMonth}` : "Runway > 36 mo"}
          {committedCashOutMonth !== null && committedCashOutMonth !== baselineCashOutMonth
            ? ` (with decision: month ${committedCashOutMonth})`
            : ""}
        </span>
      </figcaption>

      {outlastVerdict ? (
        <p className="text-fluid-sm text-slate-300 leading-snug border-l-2 border-amber-400/80 pl-2.5 py-0.5" data-outlast-verdict>
          {outlastVerdict}
        </p>
      ) : null}

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot block h-auto w-full text-slate-300" aria-hidden="true">
          {/* Y Axis grid & ticks */}
          {[0, 0.5, 1].map((pct) => {
            const cash = initialCashUsd * pct;
            const y = yOf(cash);
            return (
              <g key={pct}>
                <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray={pct === 0 ? "none" : "2 3"} />
                <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--app-text-muted)">
                  {formatCash(cash)}
                </text>
              </g>
            );
          })}

          {/* Historical Macro Duration Band (Median to Longest Spell) */}
          {benchmark ? (
            <g>
              <rect
                x={xOf(0)}
                y={pad.t}
                width={Math.max(2, xOf(benchmark.medianPastSpellMonths) - xOf(0))}
                height={plotH}
                fill="var(--phase-trace)"
                opacity="0.14"
              />
              <rect
                x={xOf(benchmark.medianPastSpellMonths)}
                y={pad.t}
                width={Math.max(2, xOf(benchmark.longestPastSpellMonths) - xOf(benchmark.medianPastSpellMonths))}
                height={plotH}
                fill="var(--phase-trace)"
                opacity="0.06"
              />
              <line
                x1={xOf(benchmark.medianPastSpellMonths)}
                x2={xOf(benchmark.medianPastSpellMonths)}
                y1={pad.t}
                y2={pad.t + plotH}
                stroke="var(--phase-boundary)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={xOf(benchmark.medianPastSpellMonths) + 4}
                y={pad.t + 12}
                fontSize="9"
                fill="var(--app-text-muted)"
              >
                Past median ({benchmark.medianPastSpellMonths} mo)
              </text>
            </g>
          ) : null}

          {/* X Axis ticks */}
          {monthTicks.map((m) => {
            const x = xOf(m);
            return (
              <g key={m}>
                <line x1={x} x2={x} y1={pad.t + plotH} y2={pad.t + plotH + 4} stroke="var(--border-default)" />
                <text x={x} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--app-text-muted)">
                  {m === 0 ? "now" : `${m} mo`}
                </text>
              </g>
            );
          })}

          {/* Baseline Curve */}
          <path d={baselinePath} fill="none" stroke="var(--app-text)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Committed Decision Curve */}
          {committedPath ? (
            <path
              d={committedPath}
              fill="none"
              stroke="var(--line-crossed)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          ) : null}

          {/* Zero cash floor line */}
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + plotH} y2={pad.t + plotH} stroke="var(--line-crossed)" strokeWidth="1" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-fluid-nano text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3.5 bg-[var(--app-text)]" />
            <span>Current plan</span>
          </span>
          {hasCommitted ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3.5 border-t-2 border-dashed border-[var(--line-crossed)]" />
              <span>With decision</span>
            </span>
          ) : null}
          {benchmark ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 bg-[var(--phase-trace)] opacity-30" />
              <span>{benchmark.regimeLabel} cycle duration (median {benchmark.medianPastSpellMonths} mo)</span>
            </span>
          ) : null}
        </div>
      </div>
      <ScreenshotCaption detail="Runway trajectory vs. historical macro cycles" />
    </figure>
  );
}
