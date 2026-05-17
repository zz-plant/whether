"use client";

import { useEffect, useState } from "react";

const FIRST_VISIT_KEY = "whether_first_visit_dismissed";

export function FirstVisitBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(FIRST_VISIT_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(FIRST_VISIT_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="weather-surface-secondary mx-auto mb-4 max-w-3xl px-4 py-3 text-sm text-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-100">
            Weekly macro signals → what to do this week. Start with the weekly decision card.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-full px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.08em] text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
          aria-label="Dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
