"use client";

import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

export function HowItWorks() {
  const [visitCount] = useLocalStorageState<number>("whether_visit_count", 0);
  const isFirstVisit = visitCount <= 1;

  return (
    <div className={`rounded-lg border px-4 py-3 ${isFirstVisit ? "border-sky-500/30 bg-sky-950/20" : "border-slate-700/60 bg-slate-950/30"}`}>
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
        {isFirstVisit ? "New to Whether? Here's how it works" : "How it works"}
      </p>
      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
        Macro context for weekly operating decisions. Whether helps leadership teams pressure-test hiring, fundraising, spending, product, and expansion plans against current public economic and market signals. Each weekly brief translates macro conditions into planning prompts, guardrails, confidence signals, and trigger points — so teams can decide what to continue, what to pause, and what would change the call. It is decision-support software, not an authority.
      </p>
      <a href="/trust" className="inline-flex text-fluid-micro font-semibold text-sky-200 hover:text-sky-100 no-underline mt-1">
        Read the full methodology →
      </a>
    </div>
  );
}
