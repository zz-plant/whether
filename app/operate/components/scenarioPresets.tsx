"use client";

import {
  SCENARIO_PRESETS,
  formatScenarioDelta,
  type ScenarioPreset,
} from "../../../lib/report/scenarioStudio";

export function ScenarioPresets({
  simulatedBaseRate,
  simulatedCurveSlope,
  isAtLiveBaseline,
  onApplyPreset,
  onResetToLive,
}: {
  simulatedBaseRate: number;
  simulatedCurveSlope: number;
  isAtLiveBaseline: boolean;
  onApplyPreset: (preset: ScenarioPreset) => void;
  onResetToLive: () => void;
}) {
  return (
    <section aria-labelledby="scenario-presets-heading" className="weather-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="scenario-presets-heading" className="type-eyebrow">
            Presets
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Four preset scenarios. Each sets the short-term borrowing rate and the recession warning gauge (10-year minus 2-year rate).
          </p>
        </div>
        {/* Rendered only once the values differ from this week's: at the
            baseline there is nothing to reset to, and a disabled control
            standing in for that is ornament. */}
        {isAtLiveBaseline ? null : (
          <button
            type="button"
            onClick={onResetToLive}
            className="weather-button inline-flex min-h-[44px] items-center px-3 py-1.5 text-xs font-semibold"
          >
            Reset to this week
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIO_PRESETS.map((preset) => {
          const isActive =
            Math.abs(simulatedBaseRate - preset.rate) < 0.05 &&
            Math.abs(simulatedCurveSlope - preset.slope) < 0.05;

          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onApplyPreset(preset)}
              className={`weather-surface flex flex-col items-start p-3.5 text-left transition-colors ${
                isActive
                  ? "border-sky-400 bg-sky-500/15"
                  : "hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <span className="text-xs font-semibold text-slate-100">
                {/* Named as the two sliders are named, so a preset reads as a setting of them. */}
                Short-term borrowing rate {preset.rate.toFixed(2)}%, recession warning gauge {formatScenarioDelta(preset.slope, "%")}
              </span>
              <p className="mt-2 text-[11px] leading-snug text-slate-400">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
