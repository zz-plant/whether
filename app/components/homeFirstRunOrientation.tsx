"use client";

import { useEffect, useState } from "react";

type OrientationDestination = {
  href: string;
  label: string;
  description: string;
};

type HomeFirstRunOrientationProps = {
  changeSummary: string;
  decisionNow: string;
  destinations: OrientationDestination[];
};

const DISMISS_KEY = "whether.home.orientation.dismissed";

export function HomeFirstRunOrientation({
  changeSummary,
  decisionNow,
  destinations,
}: HomeFirstRunOrientationProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(hasDismissed);
  }, []);

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <section
      className="weather-panel space-y-4 px-4 py-4 sm:px-5"
      aria-label="First-run orientation"
      data-testid="first-run-orientation"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Start here</p>
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">Fast orientation for this week</h2>
          <p className="text-xs text-slate-300">Scan delta, lock the call, then jump to execution surfaces.</p>
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
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100">1 · Delta</dt>
          <dd className="mt-1 text-sm text-slate-100">{changeSummary}</dd>
        </div>
        <div className="weather-surface rounded-lg border border-sky-500/45 bg-sky-500/10 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">2 · Decision now</dt>
          <dd className="mt-1 text-sm text-slate-100">{decisionNow}</dd>
        </div>
      </dl>

      <nav aria-label="Where to go next" className="grid gap-2 sm:grid-cols-3">
        {destinations.map((destination, index) => (
          <a
            key={destination.href}
            href={destination.href}
            className="weather-surface block min-h-11 rounded-lg border border-slate-700/70 px-3 py-2 transition-colors hover:border-sky-400/70"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <p className="font-semibold text-slate-100">{destination.label}</p>
              <span className="rounded-full border border-slate-600/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">{index + 3}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-300">{destination.description}</p>
          </a>
        ))}
      </nav>
    </section>
  );
}
