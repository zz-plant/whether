"use client";

import Link from "next/link";

export default function MethodologyError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <section className="weather-panel space-y-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Methodology unavailable</p>
          <h1 className="text-2xl font-semibold text-slate-100">We’re unable to load full methodology details right now.</h1>
          <p className="text-sm text-slate-300">Signal formulas are still deterministic and based on:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
            <li>1M Treasury yield</li>
            <li>10Y–2Y spread</li>
            <li>CPI (YoY)</li>
            <li>U-3 unemployment</li>
            <li>BBB OAS</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em]">
              Retry
            </button>
            <Link href="/methodology" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
              View static spec →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
