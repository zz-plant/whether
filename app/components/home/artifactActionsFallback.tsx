import { Skeleton } from "../skeleton";

export const ArtifactActionsFallback = () => (
  <div
    aria-busy="true"
    aria-label="Loading share artifacts"
    className="space-y-3 rounded-lg border border-slate-700/70 bg-slate-950/65 px-3 py-3"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Preparing share artifacts</span>
      <Skeleton className="h-3 w-16 rounded-full bg-slate-600/60" />
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
      <Skeleton className="h-9 w-full rounded-full bg-slate-600/70" />
    </div>
  </div>
);
