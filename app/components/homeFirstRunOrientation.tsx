"use client";

import { useEffect, useState } from "react";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { STORAGE_KEYS } from "../../lib/storage/keys";

const DISMISS_KEY = STORAGE_KEYS.homeOrientationDismissed;

/* Module-level on purpose: the dismissal writes to the document, which the
   React compiler's immutability rule refuses inside a component body. */
const markOrientationDismissed = () => {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
  document.documentElement.dataset.homeOrientationDismissed = "true";
};

const getBootstrappedDismissedState = () => {
  if (typeof document !== "undefined") {
    const bootstrappedDismissed = document.documentElement.dataset.homeOrientationDismissed;
    if (bootstrappedDismissed === "true" || bootstrappedDismissed === "false") {
      return bootstrappedDismissed === "true";
    }
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * One-line plain-language explainer for visitors who land on the brief with no
 * context. Server-rendered, hidden pre-paint by the layout bootstrap once
 * dismissed (html[data-home-orientation-dismissed] + the injected style rule).
 *
 * It used to carry two links and a four-button stage fieldset under the line.
 * Trust and History are header tabs, and the fieldset was a third stage control
 * on the page — the header pill on phones and the hero's tablist above `sm`
 * already cover every width — so a first visit showed the same four stage
 * buttons twice within one screen. The stage is asked once, in the hero.
 */
export function FirstVisitExplainer() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(getBootstrappedDismissedState());
  }, []);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    markOrientationDismissed();
    setDismissed(true);
    // Dismissing is the cheapest available proof that someone read the line and
    // knew what they were looking at, which is the step between arriving and
    // doing anything deliberate.
    trackActivationEvent({ step: "oriented", path: "/" });
  };

  return (
    <section
      data-weather-first-run-orientation="true"
      aria-label="What is Whether"
      data-testid="first-run-orientation"
      suppressHydrationWarning
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 sm:p-4 text-fluid-xs text-slate-300 backdrop-blur-sm"
    >
      <p className="min-w-0 font-normal text-slate-200 leading-relaxed">
        How hard it is to raise money right now, and how much risk investors will fund, scored into
        one operating call each Monday.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss introduction"
        className="shrink-0 -mr-1 -mt-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        Dismiss
      </button>
    </section>
  );
}
