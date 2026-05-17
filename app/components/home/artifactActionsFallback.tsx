import { Skeleton } from "../skeleton";

export const ArtifactActionsFallback = () => (
  <div
    aria-busy="true"
    aria-label="Loading share artifacts"
    className="space-y-3 rounded-md border border-slate-700/70 bg-slate-950/72 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Loading share actions</span>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-cyan-100">
        <span className="weather-loading-beacon" />
        Loading
      </span>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <Skeleton className="h-10 w-full rounded-full bg-slate-500/40" />
      <Skeleton className="h-10 w-full rounded-full bg-slate-500/35" />
      <Skeleton className="h-10 w-full rounded-full bg-slate-500/30" />
    </div>
  </div>
);
