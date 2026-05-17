"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FIRST_VISIT_KEY = "whether_first_visit_dismissed";
const VISIT_COUNT_KEY = "whether_visit_count";

function getVisitCount(): number {
  try {
    return Number(localStorage.getItem(VISIT_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function incrementVisitCount(): number {
  const next = getVisitCount() + 1;
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
  } catch { /* noop */ }
  return next;
}

export function FirstVisitBanner() {
  const [visible, setVisible] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(FIRST_VISIT_KEY);
    const count = incrementVisitCount();
    setVisitCount(count);
    if (!dismissed && count <= 2) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(FIRST_VISIT_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="weather-surface-secondary mx-auto mb-4 max-w-3xl rounded-lg border border-sky-500/20 px-4 py-3 text-sm text-slate-200 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-semibold text-slate-100">
            {visitCount === 1
              ? "What are the macro signals telling you this week?"
              : "Welcome back — the brief has updated."}
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            Start with the <strong>decision card</strong> — it shows what to do, what to watch for, and when conditions shift.
            Then dig into <strong>Evidence</strong> to see what moved.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/evidence"
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 px-3 py-1 text-fluid-xs font-semibold text-sky-200 no-underline hover:bg-sky-500/10"
            >
              See the evidence →
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 px-3 py-1 text-fluid-xs font-semibold text-slate-300 no-underline hover:bg-slate-800/50"
            >
              How this works
            </Link>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-full px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.08em] text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
          aria-label="Dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
