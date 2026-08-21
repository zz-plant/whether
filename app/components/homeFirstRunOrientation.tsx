"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "whether.home.orientation.dismissed";

const orientationLinkClass =
  "inline-flex min-h-11 items-center font-medium text-slate-200 underline decoration-slate-600 underline-offset-4 hover:text-white hover:decoration-slate-400";

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
      className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800/60 pb-2 text-fluid-xs text-slate-300"
    >
      {/* The line a first-time visitor reads. It previously opened with "Treasury
          yields, credit spreads, and VIX" — three undefined terms in the one
          sentence written for people with no context. Say the job first; the
          inputs are one click away on /trust. */}
      <p className="w-full min-w-0">
        How hard it is to raise money right now, and how much risk investors will fund, scored into
        one operating call each Monday.
      </p>
      <Link href="/trust#formula-reference" className={orientationLinkClass}>
        How the score works
      </Link>
      <Link href="/trust#beginner-glossary" className={orientationLinkClass}>
        Glossary
      </Link>
      <a
        href="https://github.com/zz-plant/whether"
        target="_blank"
        rel="noreferrer"
        className={orientationLinkClass}
      >
        Source
      </a>
      <Link href="/api-docs" className={orientationLinkClass}>
        API
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss introduction"
        className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-white"
      >
        Dismiss
      </button>
    </section>
  );
}
