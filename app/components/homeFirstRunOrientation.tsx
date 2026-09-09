"use client";

import Link from "next/link";
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

const orientationLinkClass =
  "font-medium text-slate-200 underline decoration-slate-600 underline-offset-4 hover:text-white hover:decoration-slate-400";

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
 * One-time plain-language explainer for visitors who land on the brief with no
 * context. Server-rendered, hidden pre-paint by the layout bootstrap once
 * dismissed (html[data-home-orientation-dismissed] + the injected style rule).
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
      className="mb-3 flex items-baseline gap-x-3 gap-y-1 border-b border-slate-800/60 pb-2 text-fluid-xs text-slate-300"
    >
      {/* One line, and the links live inside the sentence. This strip used to be four stacked rows — the sentence, a row of two
        links, a "Grade it for your stage" ask with four buttons that wrapped to
        two lines on a phone, and a Dismiss — and it sat above the weekly call.
        On a 430px screen that pushed the one thing this page exists to say
        below 440px, so the first screen of the product was its own preamble.
        The stage question is not lost: the brief carries the same control, in
        the block whose numbers the answer actually changes, where it can be
        answered by someone who has seen what it is for. */}
      <p className="min-w-0">
        How hard it is to raise money right now, and how much risk investors will fund, scored into
        one operating call each Monday —{" "}
        <Link href="/trust#formula-reference" className={orientationLinkClass}>
          how the score works
        </Link>{" "}
        ·{" "}
        {/* "How is this not a horoscope" is the first objection a cold visitor
          forms, and the method page answers a different one — that the number is
          derived. What answers this one is the record of held and changed calls,
          which /history owns. */}
        <Link href="/history#track-record-heading" className={orientationLinkClass}>
          track record
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss introduction"
        className="ml-auto inline-flex min-h-11 shrink-0 items-center text-slate-400 hover:text-white"
      >
        Dismiss
      </button>
    </section>
  );
}
