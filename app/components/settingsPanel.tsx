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

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<CompanyStage | null>(null);
  const [sensitivity, setSensitivity] = useState<RateSensitivity | null>(null);

  useEffect(() => {
    setStage((localStorage.getItem(STAGE_KEY) as CompanyStage | null));
    setSensitivity((localStorage.getItem(SENSITIVITY_KEY) as RateSensitivity | null));
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:items-start">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="relative z-10 mt-14 mr-2 w-[20rem] rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl sm:mr-4"
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
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
                    onChange={() => saveStage(s.value)}
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
                    onChange={() => saveSensitivity(s.value)}
                    className="accent-sky-400"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <p className="mt-4 text-fluid-micro text-slate-500">
          Changes apply on next brief refresh.
        </p>
      </aside>
    </div>
  );
}
