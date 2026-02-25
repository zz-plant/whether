"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";

type MobileAction = {
  href: string;
  label: string;
};

export const MobileActionSheet = ({
  triggerLabel,
  srHint,
  actions,
}: {
  triggerLabel: string;
  srHint: string;
  actions: MobileAction[];
}) => {
  const [open, setOpen] = useState(false);
  const suppressCloseAutoFocusRef = useRef(false);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          suppressCloseAutoFocusRef.current = false;
        }

        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger
        className="weather-pill inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-xs font-semibold tracking-[0.12em] text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        aria-label={`${triggerLabel}. ${open ? "Expanded" : "Collapsed"}.`}
      >
        <span>{triggerLabel}</span>
        <span
          aria-hidden="true"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="sr-only">
          {srHint}. {open ? "Expanded" : "Collapsed"}.
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/70" />
        <Dialog.Popup
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 max-h-[calc(100vh-2rem)] overflow-auto pt-6"
          finalFocus={() => {
            if (!suppressCloseAutoFocusRef.current) {
              return true;
            }

            suppressCloseAutoFocusRef.current = false;
            return false;
          }}
        >
          <div className="weather-mobile-panel weather-mobile-sheet w-full p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Dialog.Title className="text-xs font-semibold tracking-[0.2em] text-slate-300">More actions</Dialog.Title>
              <Dialog.Close className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/80 text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Close actions menu</span>
              </Dialog.Close>
            </div>
            <ul className="grid gap-2">
              {actions.map((action) => (
                <li key={`${action.href}-${action.label}`}>
                  <a
                    href={action.href}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-slate-700/70 px-3 py-2 text-center text-xs font-semibold leading-tight tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-300/80 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                    onClick={() => {
                      suppressCloseAutoFocusRef.current = true;
                      setOpen(false);
                    }}
                  >
                    {action.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
