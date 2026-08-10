"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "./uiIcons";
import { ActionLink } from "./ui/actionLink";
import { TimeMachineDatePicker } from "./timeMachineDatePicker";
import { useState } from "react";
import { CalendarButton } from "./calendarButton";
import { ShareRail } from "./shareRail";

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="weather-slide-panel fixed z-50 bottom-0 right-0 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-700/70 bg-slate-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-xl sm:top-0 sm:bottom-auto sm:mt-14 sm:mr-4 sm:w-[22rem] sm:rounded-lg" aria-label="History & export">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">History & Export</h2>
            <Dialog.Close className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close">
              <CloseIcon />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Past Briefs</p>
              <nav className="space-y-1" aria-label="History and compare">
                <ActionLink href="/history" variant="inline" className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/50">
                  Full archive
                </ActionLink>
                <ActionLink href="/history/compare" variant="inline" className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/50">
                  Compare epochs
                </ActionLink>
              </nav>
            </div>

            <div className="border-t border-slate-800/60 pt-4">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Export & Share</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowShare(true)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/50 transition-colors"
                >
                  Share brief
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/50 transition-colors"
                >
                  Pick a week
                </button>
                <CalendarButton
                  title="Whether Weekly Brief"
                  description="Review the weekly operating brief from Whether."
                  date={(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                    return d.toISOString().split("T")[0];
                  })()}
                />
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
      {showDatePicker ? <TimeMachineDatePicker onClose={() => setShowDatePicker(false)} /> : null}
      {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
    </Dialog.Root>
  );
}
