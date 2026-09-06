"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OPERATOR_STAGE_OPTIONS, type OperatorStage } from "../../lib/report/operatorStage";
import { requestSubscription } from "./subscribeRequest";
import { useOperatorStage } from "./useOperatorStage";

import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "./uiIcons";

const DISPLAY_KEY = "whether-display-mode";

const displayModes = [
  { value: "auto", label: "Auto" },
  { value: "tv", label: "TV / Kiosk" },
] as const;

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { stage, setStage } = useOperatorStage();
  const [displayMode, setDisplayMode] = useState<string>("auto");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayMode(localStorage.getItem(DISPLAY_KEY) ?? "auto");
  }, []);

  const showSaved = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  // The brief is server-rendered from the stage cookie, so the choice is
  // applied by refreshing the route rather than promised for "next refresh".
  const saveStage = useCallback((value: OperatorStage) => {
    setStage(value);
    router.refresh();
    showSaved();
  }, [router, setStage, showSaved]);

  const saveDisplayMode = useCallback((value: string) => {
    setDisplayMode(value);
    localStorage.setItem(DISPLAY_KEY, value);
    document.documentElement.dataset.displayMode = value;
    showSaved();
  }, [showSaved]);

  const handleSubscribe = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubscribing(true);
    const result = await requestSubscription(email);
    setSubscribed(result.ok);
    setSubscribeMsg(result.message);
    setIsSubscribing(false);
    setSaved(false);
    setTimeout(() => setSubscribeMsg(""), 6000);
  }, [email]);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 mt-14 mr-2 w-[calc(100vw-1.5rem)] sm:w-[20rem] sm:mr-4 top-0 right-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-eyebrow text-slate-300">Settings</h2>
            <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close settings">
              <CloseIcon />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <p className="type-eyebrow border-b border-slate-800/60 pb-2">Personalization</p>
            <fieldset>
              <legend className="type-eyebrow">Company stage</legend>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                The stage the weekly call, the plan stress test, and the runway planner are calibrated for.
                Same control the brief's Calibrate stage uses.
              </p>
              <div className="mt-2 space-y-1">
                {OPERATOR_STAGE_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      stage === option.key
                        ? "bg-sky-500/12 text-sky-100"
                        : "text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="company-stage"
                      value={option.key}
                      checked={stage === option.key}
                      onChange={() => saveStage(option.key)}
                      className="accent-sky-400"
                    />
                    <span>{option.label}</span>
                    <span className="text-fluid-micro text-slate-500">· {option.sublabel}</span>
                  </label>
                ))}
              </div>
              {stage === null ? (
                <p className="mt-2 text-fluid-micro text-slate-500">
                  Not set. The brief keeps its stage-agnostic default until you choose one.
                </p>
              ) : null}
            </fieldset>

            <p className="type-eyebrow border-b border-slate-800/60 pb-2 mt-4">Display &amp; notifications</p>
            <fieldset>
              <legend className="type-eyebrow">Display mode</legend>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Larger text and buttons for screens across the room.
              </p>
              <div className="mt-2 flex gap-2">
                {displayModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => saveDisplayMode(mode.value)}
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
            <legend className="type-eyebrow">Weekly delivery</legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Get the weekly brief delivered to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="mt-2 flex gap-2">
              <label htmlFor="settings-email" className="sr-only">Email address</label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="weather-input min-h-[44px] flex-1 px-3 py-2 text-base sm:text-xs"
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="weather-button-primary min-h-[44px] px-4 py-2 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubscribing ? "…" : subscribed ? "Check inbox" : "Subscribe"}
              </button>
            </form>
            {subscribeMsg ? (
              <p
                aria-live="polite"
                className={`mt-1 text-fluid-micro ${subscribed ? "text-emerald-200" : "text-rose-300"}`}
              >
                {subscribeMsg}
              </p>
            ) : null}
          </fieldset>
        </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-fluid-micro text-slate-400">Settings are stored in this browser.</p>
            {saved ? (
              <span className="rounded-sm bg-emerald-500/15 px-2.5 py-0.5 text-fluid-micro font-semibold text-emerald-200">Saved</span>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
