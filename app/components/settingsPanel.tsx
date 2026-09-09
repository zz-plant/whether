"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OPERATOR_STAGE_OPTIONS, type OperatorStage } from "../../lib/report/operatorStage";
import { useOperatorStage } from "./useOperatorStage";

import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "./uiIcons";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { stage, setStage } = useOperatorStage();
  const [saved, setSaved] = useState(false);

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

            <p className="type-eyebrow border-b border-slate-800/60 pb-2 mt-4">Notifications</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              The weekly email and the change alert are one subscription, on the brief itself:{" "}
              <Link href="/#subscribe" className="font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200">subscribe under this week&apos;s call</Link>.
            </p>
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
