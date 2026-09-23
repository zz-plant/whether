"use client";

import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { CopyIcon, SlidersIcon } from "../../components/uiIcons";
import { Tag } from "../../components/ui/tag";
import {
  SCENARIO_RATE_RANGE,
  SCENARIO_SLOPE_RANGE,
  formatScenarioDelta,
} from "../../../lib/report/scenarioStudio";

type ClipboardUiState = "idle" | "copying" | "copied" | "error";

export function ScenarioSliders({
  simulatedBaseRate,
  simulatedCurveSlope,
  baseRateDelta,
  curveSlopeDelta,
  onBaseRateChange,
  onCurveSlopeChange,
  linkClipboardState,
  briefClipboardState,
  onCopyShareableLink,
  onCopySimulatedBrief,
}: {
  simulatedBaseRate: number;
  simulatedCurveSlope: number;
  baseRateDelta: number;
  curveSlopeDelta: number;
  onBaseRateChange: (value: number) => void;
  onCurveSlopeChange: (value: number) => void;
  linkClipboardState: ClipboardUiState;
  briefClipboardState: ClipboardUiState;
  onCopyShareableLink: () => void;
  onCopySimulatedBrief: () => void;
}) {
  return (
    <section aria-labelledby="sliders-controls-heading" className="weather-panel p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="sliders-controls-heading" className="type-section text-slate-100 flex items-center gap-2">
              <SlidersIcon className="h-4 w-4 text-sky-400" />
              Sliders
            </h3>
            <Tag tone="amber">Not this week&apos;s data</Tag>
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Move either slider. The guidance, the scores, and the rules below update while you move it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardActionRow
            label="Copy link"
            state={linkClipboardState}
            onClick={onCopyShareableLink}
            leadingIcon={<CopyIcon className="h-3.5 w-3.5" />}
            buttonLabels={{ copied: "Link copied" }}
            buttonVariant="pill"
            compact
          />
          <ClipboardActionRow
            label="Copy this scenario"
            state={briefClipboardState}
            onClick={onCopySimulatedBrief}
            leadingIcon={<CopyIcon className="h-3.5 w-3.5" />}
            buttonVariant="pill"
            compact
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Base Rate Slider */}
        <div className="weather-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="base-rate-slider" className="text-xs font-semibold text-slate-300">
              Short-term borrowing rate
            </label>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-sm font-bold text-sky-200">
                {simulatedBaseRate.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-400">
                ({formatScenarioDelta(baseRateDelta, "%")} vs this week)
              </span>
            </div>
          </div>
          <input
            id="base-rate-slider"
            type="range"
            min={SCENARIO_RATE_RANGE.min}
            max={SCENARIO_RATE_RANGE.max}
            step={SCENARIO_RATE_RANGE.step}
            value={simulatedBaseRate}
            onChange={(e) => onBaseRateChange(Number.parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
            <span>0.00% (zero rates)</span>
            <span>2.50% (neutral)</span>
            <span>5.00% (tight)</span>
            <span>8.00% (extreme)</span>
          </div>
        </div>

        {/* Curve Slope Slider */}
        <div className="weather-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="curve-slope-slider" className="text-xs font-semibold text-slate-300">
              Recession warning gauge (10-year minus 2-year rate)
            </label>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-sm font-bold text-sky-200">
                {simulatedCurveSlope.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-400">
                ({formatScenarioDelta(curveSlopeDelta, "%")} vs this week)
              </span>
            </div>
          </div>
          <input
            id="curve-slope-slider"
            type="range"
            min={SCENARIO_SLOPE_RANGE.min}
            max={SCENARIO_SLOPE_RANGE.max}
            step={SCENARIO_SLOPE_RANGE.step}
            value={simulatedCurveSlope}
            onChange={(e) => onCurveSlopeChange(Number.parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
            <span>-1.50% (deeply inverted)</span>
            <span>0.00% (flat)</span>
            <span>+1.00% (normal)</span>
            <span>+2.50% (steep)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
