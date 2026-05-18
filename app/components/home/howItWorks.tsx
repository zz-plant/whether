"use client";

import { useEffect, useState } from "react";

export function HowItWorks() {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const vc = Number(localStorage.getItem("whether_visit_count") ?? "0");
      if (vc <= 1) setIsFirstVisit(true);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className={`weather-surface px-5 py-4 space-y-3 ${isFirstVisit ? "border-sky-500/30" : ""}`}>
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{isFirstVisit ? "New to Whether? Here's how it works" : "How it works"}</p>
      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
        Whether tracks four macro signals — Treasury yields, credit spreads, inflation, and employment — and maps them to a 2D score (tightness × risk appetite) that determines the current regime. Each regime produces a bounded decision: an action, a threshold that would pause it, and a condition that would reverse it. The brief updates weekly and is delivered to your inbox every Monday.
      </p>
      <a href="/trust" className="inline-flex text-fluid-micro font-semibold text-sky-200 hover:text-sky-100 no-underline">
        Read the full methodology →
      </a>
    </div>
  );
}
