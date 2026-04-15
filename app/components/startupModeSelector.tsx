"use client";
import { useId } from "react";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";

type ModeOption = { mode: StartupVariantMode; label: string };

export type StartupModeContent = {
  description: string;
  thresholdEmphasis: string;
  doNowBullets: string[];
  avoidBullets: string[];
  watchBullets: string[];
  reversalTriggerDiscipline: string;
};

const emptyModeContent: StartupModeContent = {
  description: "Mode details are temporarily unavailable.",
  thresholdEmphasis: "Use core weekly posture guidance until mode details refresh.",
  doNowBullets: ["Use the core weekly brief recommendations for this week."],
  avoidBullets: ["Avoid irreversible commitments until mode details are available."],
  watchBullets: ["Recheck mode guidance after the next data refresh."],
  reversalTriggerDiscipline: "Keep decisions reversible until mode guidance is restored.",
};

export function StartupModeSelector({
  options,
  selectedMode,
  contentByMode,
  onModeChange,
}: {
  options: ModeOption[];
  selectedMode: StartupVariantMode;
  contentByMode: Partial<Record<StartupVariantMode, StartupModeContent>>;
  onModeChange?: (mode: StartupVariantMode) => void;
}) {
  const radioGroupName = `startup-mode-${useId()}`;
  const firstAvailableMode = options.find((option) => contentByMode[option.mode])?.mode;
  const effectiveMode = contentByMode[selectedMode] ? selectedMode : firstAvailableMode;
  const activeContent = (effectiveMode && contentByMode[effectiveMode]) || emptyModeContent;

  return (
    <>
      <fieldset className="rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-3 space-y-2">
        <legend className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
          Company mode
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => (
            <label
              key={option.mode}
              className={`relative inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.06em] transition touch-manipulation ${
                effectiveMode === option.mode
                  ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                  : "border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-500/80"
              }`}
            >
              <input
                type="radio"
                name={radioGroupName}
                value={option.mode}
                checked={effectiveMode === option.mode}
                onChange={() => onModeChange?.(option.mode)}
                className="peer sr-only"
              />
              <span className="rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-300">
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-300">{activeContent.description} Threshold emphasis: {activeContent.thresholdEmphasis}</p>
      </fieldset>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/5 px-3 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">DO NOW</p>
          <ul className="space-y-1 text-xs text-emerald-100">
            {activeContent.doNowBullets.map((bullet) => <li key={`do-${bullet}`}>• {bullet}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-rose-500/35 bg-rose-500/5 px-3 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-200">AVOID</p>
          <ul className="space-y-1 text-xs text-rose-100">
            {activeContent.avoidBullets.map((bullet) => <li key={`avoid-${bullet}`}>• {bullet}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-sky-500/35 bg-sky-500/5 px-3 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">WATCH</p>
        <ul className="space-y-1 text-xs text-sky-100">
          {activeContent.watchBullets.map((bullet) => <li key={`watch-${bullet}`}>• {bullet}</li>)}
        </ul>
        <p className="text-xs text-sky-100/90">Reversal discipline: {activeContent.reversalTriggerDiscipline}</p>
      </div>
    </>
  );
}
