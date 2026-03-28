import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-3xl space-y-6 weather-panel-static px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Route unavailable</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          That link moved, but your next step is still available.
        </h1>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Some older routes were replaced during the IA update. Continue with the current command surface,
          review Evidence first, or open Planning without losing intent.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Open Weekly Brief
          </Link>
          <Link
            href="/signals"
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Review evidence
          </Link>
          <Link
            href="/operations"
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Open Planning
          </Link>
        </div>
      </section>
    </main>
  );
}
