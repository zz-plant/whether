"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackActivationEvent } from "../../lib/activationFunnel";
import {
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
} from "../../lib/report/reportCopy";
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
      /* A standfirst, not a notice. Boxed, blurred and sitting first on the
         page, this read as a cookie banner — the one register a product's
         opening line must not have. A line over a hairline keeps the
         orientation and lets the week title be the first thing that is
         framed. */
      className="mb-3 border-b border-white/[0.08] pb-3 text-fluid-xs text-slate-300"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 max-w-[64ch] font-normal text-slate-300 leading-relaxed">
          How hard it is to raise money right now, and how much risk investors will fund, scored into
          one operating call each Monday.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss introduction"
          className="shrink-0 -mr-2 -mt-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/*
        Collapsed, under the line it belongs to.

        The three steps, the four highlights and the next links have been written
        and tested since before this component existed, in `reportCopy.ts`, and no
        page rendered any of them — `tests/reportCopy.test.ts` asserted there were
        exactly three steps and that each carried an example, which is what kept
        them alive past every gate. They go here rather than in a panel of their
        own: this element is already the one thing on the page addressed to
        someone who has never seen it, and the comment above records what it cost
        the last time this spot grew a second block of controls.
      */}
      <details className="weather-auto-chevron group mt-3">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-md text-fluid-xs text-slate-400 hover:text-slate-200">
          How to read this page
          <span className="text-slate-500">{FIRST_TIME_GUIDE_STEPS.length} steps</span>
        </summary>

        <ol className="mt-2 space-y-2">
          {FIRST_TIME_GUIDE_STEPS.map((step, index) => (
            <li key={step.label} className="max-w-[72ch] leading-relaxed">
              <span className="font-semibold text-slate-200">
                {index + 1}. {step.label}.
              </span>{" "}
              <span className="text-slate-300">{step.detail}</span>{" "}
              <span className="text-slate-400">{step.example}</span>
            </li>
          ))}
        </ol>

        <ul className="mt-3 max-w-[72ch] space-y-1 text-slate-400">
          {FIRST_TIME_GUIDE_HIGHLIGHTS.map((highlight) => (
            <li key={highlight.text}>— {highlight.text}</li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {FIRST_TIME_GUIDE_NEXT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center text-sky-200 underline decoration-sky-700 underline-offset-4 hover:text-sky-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}
