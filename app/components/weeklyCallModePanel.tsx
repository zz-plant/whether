"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
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

const commandActions = [
  { label: "Jump: This week's call", href: "#weekly-call-core", type: "Section" },
  { label: "Jump: Decide the call", href: "#decision-snapshot-for-leadership-this-week", type: "Section" },
  { label: "Jump: Execution guidance", href: "#execution-guidance", type: "Section" },
  { label: "Jump: Evidence diagnostics", href: "#evidence-diagnostics", type: "Section" },
  { label: "Open Signals", href: "/signals", type: "Page" },
  { label: "Open Operations", href: "/operations", type: "Page" },
  { label: "Open Decide", href: "/decide", type: "Page" },
] as const;

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [stageSheetOpen, setStageSheetOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

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

  const confidenceValue = Math.max(0, Math.min(100, Math.round(confidencePercent)));
  const confidenceToneClass = confidenceLabel === "HIGH"
    ? "bg-emerald-400/80"
    : confidenceLabel === "MED"
      ? "bg-amber-400/80"
      : "bg-rose-400/80";

  const filteredCommandActions = commandActions.filter((action) =>
    `${action.label} ${action.type}`.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );

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
            <li className={compactInsetClassName}><span className="font-semibold text-slate-200">Confidence:</span> {confidenceValue}% ({confidenceLabel})</li>
            <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">Avoid:</span> {snapshotAvoid}</li>
            <li className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">Watch:</span> {snapshotWatch}</li>
          </ul>
        </details>
        <div className="mt-2 rounded-md border border-slate-700/60 bg-slate-950/55 px-2.5 py-2" aria-label="Decision confidence gauge">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decision confidence</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800/90" role="progressbar" aria-valuenow={confidenceValue} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence ${confidenceValue} percent`}>
            <div className={`h-full ${confidenceToneClass} transition-[width] duration-300`} style={{ width: `${confidenceValue}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-300">{confidenceValue}% confidence · use flip cues when this drops.</p>
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
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-slate-200">What environment?</span> {postureLabel} with a {trendLabel.toLowerCase()} trend at {confidenceValue}% confidence.</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">What should leadership do?</span> {snapshotDoNow}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">Avoid this week:</span> {snapshotAvoid}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">Watch / flip cues:</span> {snapshotWatch}</p>
        </div>

        <div className="rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStageSheetOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-slate-200 transition hover:border-slate-500/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>Refine by company stage</span>
              <span aria-hidden="true" className="text-sm">↗</span>
            </button>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-slate-200 transition hover:border-slate-500/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>Open command palette</span>
              <span aria-hidden="true" className="text-sm">⌘</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-300">Stage selected: {selectedModeLabel ?? "Default"}. Use command palette to jump to decision blocks fast.</p>
        </div>
      </article>

      <Dialog.Root open={stageSheetOpen} onOpenChange={setStageSheetOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/70" />
          <Dialog.Popup className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 max-h-[70vh] overflow-auto rounded-2xl border border-slate-700/80 bg-slate-950/98 p-4 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold tracking-[0.08em] text-slate-100">Refine by company stage</Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-slate-300">Choose the stage variant, then copy the adjusted do now / avoid / watch call.</Dialog.Description>
            <div className="mt-3 space-y-2" id="company-stage-refinement-panel">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Stage variant selected: {selectedModeLabel ?? "Default"}</p>
              <StartupModeSelector
                options={startupVariantPolicy.options}
                selectedMode={effectiveMode ?? startupVariantPolicy.selectedMode}
                onModeChange={setActiveMode}
                contentByMode={modeContentByMode}
              />
              <p className="text-[11px] text-slate-300">Stage-specific snapshot — DO NOW: {modeAdjustedSnapshot.doNow} · AVOID: {modeAdjustedSnapshot.avoid} · WATCH: {modeAdjustedSnapshot.watch}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <Dialog.Close className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200">Done</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/70" />
          <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-xl -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-950/98 p-4 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold tracking-[0.08em] text-slate-100">Command palette</Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-slate-300">Jump directly to decision sections or adjacent report pages.</Dialog.Description>
            <input
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search commands..."
              className="mt-3 min-h-[44px] w-full rounded-md border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            />
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
              {filteredCommandActions.map((action) => (
                <li key={action.href}>
                  {action.href.startsWith("/") ? (
                    <Link
                      href={action.href}
                      onClick={() => setCommandOpen(false)}
                      className="inline-flex min-h-[44px] w-full items-center justify-between rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] text-slate-100 hover:border-sky-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                      <span>{action.label}</span>
                      <span className="text-[10px] uppercase text-slate-400">{action.type}</span>
                    </Link>
                  ) : (
                    <a
                      href={action.href}
                      onClick={() => setCommandOpen(false)}
                      className="inline-flex min-h-[44px] w-full items-center justify-between rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] text-slate-100 hover:border-sky-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                      <span>{action.label}</span>
                      <span className="text-[10px] uppercase text-slate-400">{action.type}</span>
                    </a>
                  )}
                </li>
              ))}
              {filteredCommandActions.length === 0 ? <li className="text-xs text-slate-400">No command matches your search.</li> : null}
            </ul>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
