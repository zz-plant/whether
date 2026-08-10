"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "whether.home.orientation.dismissed";

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
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
    document.documentElement.dataset.homeOrientationDismissed = "true";
    setDismissed(true);
  };

  return (
    <section
      data-weather-first-run-orientation="true"
      aria-label="What is Whether"
      data-testid="first-run-orientation"
      suppressHydrationWarning
      className="mb-4 rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3.5 backdrop-blur-sm sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-fluid-xs leading-5 text-slate-200">
          <span className="font-semibold text-white">New here?</span> Whether turns public macro
          data — Treasury yields, credit spreads, VIX — into a weekly operating call for startup
          leaders: what to tighten, what to loosen, and the thresholds that would flip the call.
          No signup, and the scoring is open.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="weather-button min-h-11 min-w-11 px-3 py-2 text-xs font-semibold"
        >
          Got it
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-fluid-xs">
        <Link
          href="/trust#formula-reference"
          className="inline-flex min-h-[44px] items-center font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          How the score is built
        </Link>
        <a
          href="https://github.com/zz-plant/whether"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          Source code
        </a>
        <Link
          href="/api-docs"
          className="inline-flex min-h-[44px] items-center font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          Free API
        </Link>
      </div>
    </section>
  );
}
