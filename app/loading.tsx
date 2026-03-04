export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Loading latest brief…</p>
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-slate-800/90" />
        <div className="h-4 w-full animate-pulse rounded-md bg-slate-800/70" />
        <div className="h-4 w-11/12 animate-pulse rounded-md bg-slate-800/70" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="weather-panel space-y-3 px-5 py-5">
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-slate-800/80" />
          <div className="h-4 w-full animate-pulse rounded-md bg-slate-800/70" />
          <div className="h-4 w-10/12 animate-pulse rounded-md bg-slate-800/70" />
          <div className="h-10 w-36 animate-pulse rounded-full bg-slate-800/90" />
        </div>
        <div className="weather-panel space-y-3 px-5 py-5">
          <div className="h-4 w-2/5 animate-pulse rounded-md bg-slate-800/80" />
          <div className="h-4 w-full animate-pulse rounded-md bg-slate-800/70" />
          <div className="h-4 w-9/12 animate-pulse rounded-md bg-slate-800/70" />
          <div className="h-10 w-36 animate-pulse rounded-full bg-slate-800/90" />
        </div>
      </section>
    </main>
  );
}
