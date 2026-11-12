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

const RATE_MILESTONES = [
  { value: 0.0, label: "0.00% (zero rates)", align: "text-left" },
  { value: 2.5, label: "2.50% (neutral)", align: "text-center" },
  { value: 5.0, label: "5.00% (tight)", align: "text-center" },
  { value: 8.0, label: "8.00% (extreme)", align: "text-right" },
] as const;

const SLOPE_MILESTONES = [
  { value: -1.5, label: "-1.50% (deeply inverted)", align: "text-left" },
  { value: 0.0, label: "0.00% (flat)", align: "text-center" },
  { value: 1.0, label: "+1.00% (normal)", align: "text-center" },
  { value: 2.5, label: "+2.50% (steep)", align: "text-right" },
] as const;

function SliderNudgeValue({
  value,
  delta,
  min,
  max,
  step = 0.25,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  value: number;
  delta: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  /* The two keys keep their 24px square on a 320px phone, where the row squeezed them to
     14px wide, and take a 44px tap area round it (`weather-hit-box`, controls.css). */
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
        aria-label={decreaseLabel}
        className="weather-hit-box flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-700/80 bg-slate-800 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors"
      >
        −
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-bold text-slate-100">
        {value.toFixed(2)}%
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
        aria-label={increaseLabel}
        className="weather-hit-box flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-700/80 bg-slate-800 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors"
      >
        +
      </button>
      <span className="ml-1 text-xs text-slate-400">
        ({formatScenarioDelta(delta, "%")} vs this week)
      </span>
    </div>
  );
}

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
              <SlidersIcon className="h-4 w-4 text-slate-400" />
              Set the rates
            </h3>
            <Tag tone="amber">Not this week&apos;s data</Tag>
          </div>
          {/* No instruction line (2026-10-09): the page intro says to move the two
              sliders, and the sliders are directly below. */}
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

      <div className="weather-switch gap-6 [--col-min:18rem]">
        {/* Base Rate Slider */}
        <div className="weather-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="base-rate-slider" className="text-xs font-semibold text-slate-300">
              Short-term borrowing rate
            </label>
            <SliderNudgeValue
              value={simulatedBaseRate}
              delta={baseRateDelta}
              min={SCENARIO_RATE_RANGE.min}
              max={SCENARIO_RATE_RANGE.max}
              onChange={onBaseRateChange}
              decreaseLabel="Decrease short-term borrowing rate by 25 basis points"
              increaseLabel="Increase short-term borrowing rate by 25 basis points"
            />
          </div>
          <input
            id="base-rate-slider"
            type="range"
            min={SCENARIO_RATE_RANGE.min}
            max={SCENARIO_RATE_RANGE.max}
            step={SCENARIO_RATE_RANGE.step}
            value={simulatedBaseRate}
            onChange={(e) => onBaseRateChange(Number.parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          />
          <div className="flex justify-between text-fluid-nano text-slate-500 tabular-nums">
            {RATE_MILESTONES.map((milestone) => (
              <button
                key={milestone.value}
                type="button"
                onClick={() => onBaseRateChange(milestone.value)}
                className={`transition-colors hover:text-slate-300 ${milestone.align}`}
              >
                {milestone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Curve Slope Slider */}
        <div className="weather-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="curve-slope-slider" className="text-xs font-semibold text-slate-300">
              Recession warning gauge (10-year minus 2-year rate)
            </label>
            <SliderNudgeValue
              value={simulatedCurveSlope}
              delta={curveSlopeDelta}
              min={SCENARIO_SLOPE_RANGE.min}
              max={SCENARIO_SLOPE_RANGE.max}
              onChange={onCurveSlopeChange}
              decreaseLabel="Decrease recession warning gauge by 25 basis points"
              increaseLabel="Increase recession warning gauge by 25 basis points"
            />
          </div>
          <input
            id="curve-slope-slider"
            type="range"
            min={SCENARIO_SLOPE_RANGE.min}
            max={SCENARIO_SLOPE_RANGE.max}
            step={SCENARIO_SLOPE_RANGE.step}
            value={simulatedCurveSlope}
            onChange={(e) => onCurveSlopeChange(Number.parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          />
          <div className="flex justify-between text-fluid-nano text-slate-500 tabular-nums">
            {SLOPE_MILESTONES.map((milestone) => (
              <button
                key={milestone.value}
                type="button"
                onClick={() => onCurveSlopeChange(milestone.value)}
                className={`transition-colors hover:text-slate-300 ${milestone.align}`}
              >
                {milestone.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
