"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyStage, RateSensitivity } from "../../lib/report/operatorContext";
import { getSubscriberStore } from "../../lib/email/subscriberStore";

import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import { CloseIcon } from "./uiIcons";

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
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
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
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[20rem] sm:mr-4 top-0 right-0 rounded-lg border border-slate-700/70 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Settings</h2>
            <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close settings">
              <CloseIcon />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 border-b border-slate-800/60 pb-2">Personalization</p>
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

            <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 border-b border-slate-800/60 pb-2 mt-4">Display &amp; notifications</p>
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

          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Weekly delivery</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Get the weekly brief delivered to your inbox.
            </p>
            <div className="mt-2 flex gap-2">
              <label htmlFor="settings-email" className="sr-only">Email address</label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="weather-input min-h-[44px] flex-1 rounded-md px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!email || !email.includes("@")) {
                    setSubscribeMsg("Enter a valid email.");
                    return;
                  }
                  try {
                    await getSubscriberStore().subscribe(email);
                    setSubscribed(true);
                    setSubscribeMsg("Subscribed! Check your inbox.");
                  } catch {
                    setSubscribeMsg("Subscription update failed.");
                  }
                  setSaved(false);
                  setTimeout(() => setSubscribeMsg(""), 3000);
                }}
                className="weather-button-primary min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold"
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>
            {subscribeMsg ? (
              <p className="mt-1 text-fluid-micro text-emerald-200">{subscribeMsg}</p>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Alerts</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Get notified when the regime changes.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <Switch.Root
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors data-[checked]:bg-sky-500 bg-slate-700"
              >
                <Switch.Thumb className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[checked]:translate-x-[18px]" />
              </Switch.Root>
              Regime change alerts
            </label>
          </fieldset>
        </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-fluid-micro text-slate-500">Changes apply on next brief refresh.</p>
            {saved ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-fluid-micro font-semibold text-emerald-200">Saved</span>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
