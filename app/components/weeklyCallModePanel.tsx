"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { StartupModeSelector, type StartupModeContent } from "./startupModeSelector";

type WeeklyCallModePanelProps = {
  startupVariantPolicy: StartupVariantPolicy;
  modeContentByMode: Partial<Record<StartupVariantMode, StartupModeContent>>;
  postureLabel: string;
  operatingCall: string;
  trendLabel: string;
  confidencePercent: number;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  snapshotDoNow: string;
  snapshotAvoid: string;
  snapshotWatch: string;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  actions?: ReactNode;
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  modeContentByMode,
  postureLabel,
  operatingCall,
  trendLabel,
  confidencePercent,
  confidenceLabel,
  snapshotDoNow,
  snapshotAvoid,
  snapshotWatch,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  actions,
}: WeeklyCallModePanelProps) {
  const firstAvailableMode = startupVariantPolicy.options.find((option) => modeContentByMode[option.mode])?.mode;
  const [activeMode, setActiveMode] = useState<StartupVariantMode>(startupVariantPolicy.selectedMode);
  const [showModeRefinement, setShowModeRefinement] = useState(false);
  const effectiveMode = modeContentByMode[activeMode]
    ? activeMode
    : (modeContentByMode[startupVariantPolicy.selectedMode] ? startupVariantPolicy.selectedMode : firstAvailableMode);
  const activeContent = effectiveMode ? modeContentByMode[effectiveMode] : undefined;
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === effectiveMode)?.label;

  const modeAdjustedSnapshot = useMemo(() => ({
    doNow: activeContent?.doNowBullets[0] ?? snapshotDoNow,
    avoid: activeContent?.avoidBullets[0] ?? snapshotAvoid,
    watch: activeContent?.watchBullets[0] ?? snapshotWatch,
  }), [activeContent, snapshotAvoid, snapshotDoNow, snapshotWatch]);

  return (
    <>
      <article className="rounded-xl border border-slate-700/75 bg-slate-950/92 p-3" aria-label="Weekly call snapshot">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-[0.01em] text-slate-50">Weekly call snapshot</h2>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Quick share summary for this week</p>
        </div>
        <ol className="mt-2 grid gap-1.5 text-[11px] text-slate-100" aria-label="Weekly decision transmission order">
          <li className={compactInsetClassName}><span className="font-semibold text-slate-200">Regime:</span> {postureLabel}</li>
          <li className={compactInsetClassName}><span className="font-semibold text-slate-200">Call:</span> {operatingCall}</li>
          <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">Do now:</span> {snapshotDoNow}</li>
          <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">Flip conditions:</span> {effectiveFlipLabels[0] ?? snapshotWatch}</li>
        </ol>
        <details className="mt-2 rounded-md border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Secondary diagnostics</summary>
          <ul className="mt-2 grid gap-1.5 text-[11px] text-slate-100 sm:grid-cols-2">
            <li className={compactInsetClassName}><span className="font-semibold text-slate-200">Trend:</span> {trendLabel}</li>
            <li className={compactInsetClassName}><span className="font-semibold text-slate-200">Confidence:</span> {Math.round(confidencePercent)}% ({confidenceLabel})</li>
            <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">Avoid:</span> {snapshotAvoid}</li>
            <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">Watch:</span> {snapshotWatch}</li>
          </ul>
        </details>
        <div className="mt-2 rounded-md border border-sky-500/25 bg-sky-500/5 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Flip conditions</p>
          <ul className="mt-1 space-y-1 text-[11px] text-slate-100">
            {(effectiveFlipLabels.length > 0 ? effectiveFlipLabels : [snapshotWatch]).map((condition) => (
              <li key={`flip-condition-${condition}`}>• {condition}</li>
            ))}
          </ul>
        </div>
        {actions ? (
          <div className="mt-2 rounded-xl border border-sky-400/45 bg-gradient-to-r from-sky-600/18 via-sky-500/12 to-slate-950/35 p-3" aria-label="Share this week's call">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-100">Share this week&apos;s call</p>
            <div className="mt-2">{actions}</div>
          </div>
        ) : null}
      </article>

      <article id="weekly-call-core" className={`${tierOnePanelClassName} weather-motion-card ${sectionSpacingClassName} bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
        <h2 className={tierOneHeadingClassName}>This week&apos;s call</h2>
        <p className="text-xs text-slate-300">Whether does not predict markets; it tells founders how to operate inside them this week.</p>
        <div className="grid gap-2 text-xs text-slate-100">
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-slate-200">What environment?</span> {postureLabel} with a {trendLabel.toLowerCase()} trend at {Math.round(confidencePercent)}% confidence.</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">What should leadership do?</span> {snapshotDoNow}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">Avoid this week:</span> {snapshotAvoid}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">Watch / flip cues:</span> {snapshotWatch}</p>
        </div>

        <div className="rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowModeRefinement((current) => !current)}
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-slate-200 transition hover:border-slate-500/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            aria-expanded={showModeRefinement}
            aria-controls="company-stage-refinement-panel"
          >
            <span>Refine by company stage</span>
            <span aria-hidden="true" className={`text-sm transition ${showModeRefinement ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showModeRefinement ? (
            <div id="company-stage-refinement-panel" className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Stage variant selected: {selectedModeLabel ?? "Default"}</p>
              <StartupModeSelector
                options={startupVariantPolicy.options}
                selectedMode={effectiveMode ?? startupVariantPolicy.selectedMode}
                onModeChange={setActiveMode}
                contentByMode={modeContentByMode}
              />
              <p className="text-[11px] text-slate-300">Stage-specific snapshot — DO NOW: {modeAdjustedSnapshot.doNow} · AVOID: {modeAdjustedSnapshot.avoid} · WATCH: {modeAdjustedSnapshot.watch}</p>
            </div>
          ) : null}
        </div>
      </article>
    </>
  );
}
