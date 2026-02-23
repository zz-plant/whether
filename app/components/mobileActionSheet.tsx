"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handleDirectionalFocus } from "./directionalFocus";

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
  const dialogId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocusRef = useRef(true);

  const closeSheet = ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
    shouldRestoreFocusRef.current = restoreFocus;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    shouldRestoreFocusRef.current = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      if (shouldRestoreFocusRef.current) {
        triggerElement?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  const handleFocusTrap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (sheet) {
      handleDirectionalFocus(event, sheet);
    }

    if (event.key !== "Tab") {
      return;
    }

    if (!sheet) {
      return;
    }

    const focusableItems = sheet.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusableItems.length === 0) {
      return;
    }

    const firstFocusable = focusableItems[0];
    const lastFocusable = focusableItems[focusableItems.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="weather-pill inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-xs font-semibold tracking-[0.12em] text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        aria-label={`${triggerLabel}. ${open ? "Expanded" : "Collapsed"}.`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
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
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end bg-slate-950/70 px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-6"
          role="presentation"
          onClick={() => closeSheet()}
        >
          <div
            ref={sheetRef}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="weather-mobile-panel weather-mobile-sheet w-full overflow-auto p-4 shadow-2xl"
            onKeyDown={handleFocusTrap}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p id={titleId} className="text-xs font-semibold tracking-[0.2em] text-slate-300">More actions</p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => closeSheet()}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/80 text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Close actions menu</span>
              </button>
            </div>
            <ul className="grid gap-2">
              {actions.map((action) => (
                <li key={`${action.href}-${action.label}`}>
                  <a
                    href={action.href}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-slate-700/70 px-3 py-2 text-center text-xs font-semibold leading-tight tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-300/80 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                    onClick={() => closeSheet({ restoreFocus: false })}
                  >
                    {action.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
};
