import { Skeleton } from "../skeleton";

export const WeeklyDiagnosticsFallback = () => (
  <section aria-label="Loading diagnostics lane" className="space-y-3" aria-busy="true">
    <article className="rounded-xl border border-slate-800/45 bg-slate-950/62 p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-44 rounded-full bg-slate-600/75" />
        <Skeleton className="h-3 w-20 rounded-full bg-slate-600/65" />
      </div>
      <Skeleton className="mt-3 h-10 w-full rounded-lg bg-slate-600/55" />
      <Skeleton className="mt-2 h-10 w-full rounded-lg bg-slate-600/55" />
      <Skeleton className="mt-2 h-10 w-11/12 rounded-lg bg-slate-600/50" />
    </article>
    <article className="rounded-xl border border-slate-700/55 bg-slate-950/84 p-5">
      <Skeleton className="h-4 w-40 rounded-full bg-slate-600/75" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-16 w-full rounded-lg bg-slate-600/55" />
        <Skeleton className="h-16 w-full rounded-lg bg-slate-600/55" />
      </div>
    </article>
  </section>
);
