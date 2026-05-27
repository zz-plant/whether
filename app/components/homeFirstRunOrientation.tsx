"use client";

import Link from "next/link";
import { useState } from "react";

type OrientationDestination = {
  href: string;
  label: string;
  description: string;
};

type QuickAction = {
  href: string;
  label: string;
};

type HomeFirstRunOrientationProps = {
  changeSummary: string;
  decisionNow: string;
  destinations: OrientationDestination[];
  quickActions?: QuickAction[];
  currentPath?: string;
};

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

export function HomeFirstRunOrientation({
  changeSummary,
  decisionNow,
  destinations,
  quickActions = [],
  currentPath = "/",
}: HomeFirstRunOrientationProps) {
  const [dismissed, setDismissed] = useState(getBootstrappedDismissedState);

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
    <section className="space-y-4" aria-label="Weekly overview">
      {!dismissed ? (
        <section
          data-weather-first-run-orientation="true"
          className="weather-surface-secondary space-y-4 px-4 py-4 sm:px-5"
          aria-label="First-run orientation"
          data-testid="first-run-orientation"
          suppressHydrationWarning
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">This week at a glance</p>
              <h2 className="text-sm font-semibold text-slate-100 sm:text-base">Weekly read</h2>
              <p className="text-xs text-slate-300">See what changed, confirm the read, then open the page you need.</p>
            </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="weather-button min-h-11 min-w-11 px-3 py-2 text-xs font-semibold"
              >
              Skip intro
            </button>
          </div>

          <dl className="grid gap-2 sm:grid-cols-2" aria-label="Weekly orientation cues">
            <div className="weather-surface rounded-lg border border-violet-500/45 bg-violet-500/10 px-3 py-2">
              <dt className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-violet-100">1 · Delta</dt>
              <dd className="mt-1 text-sm text-slate-100">{changeSummary}</dd>
            </div>
            <div className="weather-surface rounded-lg border border-sky-500/45 bg-sky-500/10 px-3 py-2">
              <dt className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-sky-100">2 · Decision now</dt>
              <dd className="mt-1 text-sm text-slate-100">{decisionNow}</dd>
            </div>
          </dl>

          <nav aria-label="Where to go next" className="grid gap-2 sm:grid-cols-3">
            {destinations.map((destination, index) => (
              <Link
                key={destination.href}
                href={destination.href}
                className="weather-surface block min-h-11 rounded-lg border border-slate-700/70 px-3 py-2 transition-colors hover:border-sky-400/70"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <p className="font-semibold text-slate-100">{destination.label}</p>
                  <span className="rounded-full border border-slate-600/70 px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-300">{index + 3}</span>
                </div>
                <p className="mt-1 text-fluid-xs text-slate-300">{destination.description}</p>
              </Link>
            ))}
          </nav>
        </section>
      ) : null}

      <section className="weather-surface-secondary space-y-3 px-4 py-4 sm:px-5" aria-label="Next step rail">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next step</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const isCurrent = action.href === currentPath;
            if (isCurrent) {
              return (
                <span
                  key={action.href}
                  aria-current="page"
                  className="weather-pill inline-flex min-h-[44px] items-center border-sky-300/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100"
                >
                  {action.label}
                </span>
              );
            }

            return (
              <Link
                key={action.href}
                href={action.href}
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
              >
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <details className="weather-surface-secondary weather-auto-chevron space-y-4 px-5 py-4" id="why-whether">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          More context
        </summary>
        <div className="space-y-5 pt-4">
          <section className="space-y-4" aria-label="Why Whether versus alternatives">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Why Whether</p>
              <h2 className="text-base font-semibold text-slate-100">More detail when you want it</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <article className="weather-surface space-y-2 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What it changes this week</p>
                <p className="text-sm text-slate-100">Turn the market update into one shared starting point so team leads begin from the same read.</p>
              </article>
              <article className="weather-surface space-y-2 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What to revisit</p>
                <p className="text-sm text-slate-100">Recheck hiring pace, spend windows, and pipeline bets against this week&apos;s limits before approving them.</p>
              </article>
              <article className="weather-surface space-y-2 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What changes the read</p>
                <p className="text-sm text-slate-100">Watch the main trigger in the weekly brief. If it trips, reset the plan.</p>
              </article>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <Link href="/planning" className="rounded-full border border-slate-700/80 px-3 py-1.5 transition-colors hover:border-sky-400/70 hover:text-sky-100">
                See the full plan
              </Link>
              <Link href="/evidence" className="rounded-full border border-slate-700/80 px-3 py-1.5 transition-colors hover:border-sky-400/70 hover:text-sky-100">
                See the full evidence view
              </Link>
            </div>
          </section>
        </div>
      </details>
    </section>
  );
}
