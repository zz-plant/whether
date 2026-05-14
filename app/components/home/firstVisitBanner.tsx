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
    <div className="weather-panel mx-auto mb-4 max-w-3xl rounded-lg border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm text-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-100">
            Whether is a weekly operating brief for startup leaders.
          </p>
          <p className="mt-1 text-slate-400">
            It turns macro signals into what to do this week. Start with the card above, then share it.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
          aria-label="Dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
