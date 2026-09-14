"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { STORAGE_KEYS } from "../../lib/storage/keys";
import { DEFAULT_OPERATOR_STAGE, OPERATOR_STAGE_OPTIONS, type OperatorStage } from "../../lib/report/operatorStage";
import { persistOperatorStage } from "./useOperatorStage";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // Asked once, here, instead of defaulted silently. The brief used to grade
  // every stress test for a Series A team unless the reader noticed a pill row
  // mid-page; a seed founder got the wrong answer and never learned why. The
  // cookie is what the server renders the next request from, so the choice
  // takes effect on this visit, and the hero's control stays as the place to
  // change it later.
  const handleStage = (stage: OperatorStage) => {
    persistOperatorStage(stage);
    /*
     * Write the choice to the URL, not just the cookie. `StagePersonaSelector` — the
     * persistent control further down the same page — already does this, so the same
     * setting was shareable when chosen there and invisible when chosen here. The
     * difference is not observable to a reader: both are four buttons labelled with the
     * same four stages. `router.push` also re-renders, so the `refresh()` this replaces
     * is redundant. The default stage carries no param, matching the other control.
     */
    const params = new URLSearchParams(searchParams.toString());
    if (stage === DEFAULT_OPERATOR_STAGE) {
      params.delete("stage");
    } else {
      params.set("stage", stage);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
    handleDismiss();
  };

  return (
    <section
      data-weather-first-run-orientation="true"
      aria-label="What is Whether"
      data-testid="first-run-orientation"
      suppressHydrationWarning
      className="mb-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 sm:p-4 text-fluid-xs text-slate-300 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
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
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-2.5">
        <div className="flex items-center gap-3">
          <Link href="/trust#formula-reference" className={orientationLinkClass}>
            How the score works
          </Link>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <Link href="/history#track-record-heading" className={orientationLinkClass}>
            Track record
          </Link>
        </div>
        <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0 sm:ml-auto">
          <legend className="sr-only">Grade it for your stage:</legend>
          <span className="text-xs text-slate-400 mr-1" aria-hidden="true">Stage:</span>
          {OPERATOR_STAGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleStage(option.key)}
              className="inline-flex min-h-[32px] items-center rounded-md border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 text-xs font-medium text-slate-200 hover:border-teal-500/50 hover:text-white transition-colors"
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
