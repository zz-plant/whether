"use client";

import { ActionLink } from "../ui/actionLink";

export function HomeBriefLoadError() {
  return (
    <div className="weather-card my-8 mx-auto max-w-xl text-center py-14 space-y-4" role="alert">
      <div className="space-y-2">
        <p className="text-slate-100 font-medium text-base">Couldn&apos;t load this week&apos;s brief.</p>
        <p className="text-slate-400 text-fluid-micro">Data sources are temporarily unavailable or delayed.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button type="button" onClick={() => window.location.reload()} className="weather-button inline-flex min-h-11 items-center gap-2 px-4 py-2 text-emerald-300 text-sm font-medium">
          Retry now
        </button>
        <ActionLink href="/trust" variant="inline">Check data status →</ActionLink>
      </div>
    </div>
  );
}
