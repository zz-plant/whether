"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyStage, RateSensitivity } from "../../lib/report/operatorContext";

const STAGE_KEY = "whether-company-stage";
const SENSITIVITY_KEY = "whether-rate-sensitivity";

const stages: { value: CompanyStage; label: string }[] = [
  { value: "pre-seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b-plus", label: "Series B+" },
  { value: "public", label: "Public company" },
];

const sensitivities: { value: RateSensitivity; label: string }[] = [
  { value: "high", label: "High (capital-intensive)" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low (capital-light)" },
];

const DISPLAY_KEY = "whether-display-mode";

const displayModes = [
  { value: "auto", label: "Auto" },
  { value: "tv", label: "TV / Kiosk" },
] as const;

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<CompanyStage | null>(null);
  const [sensitivity, setSensitivity] = useState<RateSensitivity | null>(null);
  const [displayMode, setDisplayMode] = useState<string>("auto");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStage((localStorage.getItem(STAGE_KEY) as CompanyStage | null));
    setSensitivity((localStorage.getItem(SENSITIVITY_KEY) as RateSensitivity | null));
    setDisplayMode(localStorage.getItem(DISPLAY_KEY) ?? "auto");
  }, []);

  const saveStage = useCallback((value: CompanyStage) => {
    setStage(value);
    localStorage.setItem(STAGE_KEY, value);
    document.cookie = `${STAGE_KEY}=${value};path=/;max-age=31536000`;
  }, []);

  const saveSensitivity = useCallback((value: RateSensitivity) => {
    setSensitivity(value);
    localStorage.setItem(SENSITIVITY_KEY, value);
    document.cookie = `${SENSITIVITY_KEY}=${value};path=/;max-age=31536000`;
  }, []);

  const saveDisplayMode = useCallback((value: string) => {
    setDisplayMode(value);
    localStorage.setItem(DISPLAY_KEY, value);
    document.documentElement.dataset.displayMode = value;
  }, []);

  const showSaved = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const saveStageWithFeedback = useCallback((value: CompanyStage) => {
    saveStage(value);
    showSaved();
  }, [saveStage, showSaved]);

  const saveSensitivityWithFeedback = useCallback((value: RateSensitivity) => {
    saveSensitivity(value);
    showSaved();
  }, [saveSensitivity, showSaved]);

  const saveDisplayModeWithFeedback = useCallback((value: string) => {
    saveDisplayMode(value);
    showSaved();
  }, [saveDisplayMode, showSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:items-start">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="weather-slide-panel relative z-10 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[20rem] rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl sm:mr-4"
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Settings</h2>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Company stage</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Adjusts operating knobs to your company&apos;s maturity.
            </p>
            <div className="mt-2 space-y-1">
              {stages.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    stage === s.value
                      ? "bg-sky-500/12 text-sky-100"
                      : "text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="company-stage"
                    value={s.value}
                    checked={stage === s.value}
                    onChange={() => saveStageWithFeedback(s.value)}
                    className="accent-sky-400"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Rate sensitivity</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              How much interest rates affect your business.
            </p>
            <div className="mt-2 space-y-1">
              {sensitivities.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    sensitivity === s.value
                      ? "bg-sky-500/12 text-sky-100"
                      : "text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rate-sensitivity"
                    value={s.value}
                    checked={sensitivity === s.value}
                    onChange={() => saveSensitivityWithFeedback(s.value)}
                    className="accent-sky-400"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Display mode</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Larger text and buttons for screens across the room.
            </p>
            <div className="mt-2 flex gap-2">
              {displayModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => saveDisplayModeWithFeedback(mode.value)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    displayMode === mode.value
                      ? "bg-sky-500/12 text-sky-100 border border-sky-500/30"
                      : "text-slate-300 border border-slate-800/60 hover:bg-slate-800/50"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-fluid-micro text-slate-500">
            Changes apply on next brief refresh.
          </p>
          {saved ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-fluid-micro font-semibold text-emerald-200">
              Saved
            </span>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
