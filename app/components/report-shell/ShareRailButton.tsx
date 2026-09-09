"use client";

import { openShareRail } from "../globalShareRail";

/**
 * Opens the one global share rail from a report page's nav block. The block
 * itself is a server component; the click handler has to live here.
 */
export function ShareRailButton() {
  return (
    <button
      type="button"
      onClick={openShareRail}
      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
    >
      Share
    </button>
  );
}
