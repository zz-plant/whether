"use client";

import { useState } from "react";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";

type ModeOption = { mode: StartupVariantMode; label: string };

type ModeContent = {
  description: string;
  thresholdEmphasis: string;
  doNowBullets: string[];
  avoidBullets: string[];
  watchBullets: string[];
  reversalTriggerDiscipline: string;
};

const emptyModeContent: ModeContent = {
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
}: {
  options: ModeOption[];
  selectedMode: StartupVariantMode;
  contentByMode: Partial<Record<StartupVariantMode, ModeContent>>;
}) {
  const firstAvailableMode = options.find((option) => contentByMode[option.mode])?.mode;
  const [activeMode, setActiveMode] = useState(selectedMode);
  const effectiveMode = contentByMode[activeMode]
    ? activeMode
    : (contentByMode[selectedMode] ? selectedMode : firstAvailableMode);
  const activeContent = (effectiveMode && contentByMode[effectiveMode]) || emptyModeContent;

  return (
    <>
      <div className="rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">Company mode</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => setActiveMode(option.mode)}
              className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.06em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${effectiveMode === option.mode ? "border-sky-400/70 bg-sky-500/20 text-sky-100" : "border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-500/80"}`}
              aria-pressed={effectiveMode === option.mode}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-300">{activeContent.description} Threshold emphasis: {activeContent.thresholdEmphasis}</p>
      </div>

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
