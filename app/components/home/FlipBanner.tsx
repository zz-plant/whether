"use client";

import { useEffect, useState } from "react";

type FlipBannerProps = {
  direction: "tighten" | "ease" | "hold" | "revisit";
  tightness: number;
};

const LAST_CALL_KEY = "whether_last_call";
const VISITED_KEY = "whether_visited";

export function FlipBanner({ direction, tightness }: FlipBannerProps) {
  const [visible, setVisible] = useState(false);
  const [prevDirection, setPrevDirection] = useState<string | null>(null);

  useEffect(() => {
    const visited = localStorage.getItem(VISITED_KEY);
    if (!visited) {
      localStorage.setItem(VISITED_KEY, "1");
      localStorage.setItem(LAST_CALL_KEY, direction);
      return;
    }

    const lastCall = localStorage.getItem(LAST_CALL_KEY);
    if (lastCall && lastCall !== direction) {
      setPrevDirection(lastCall);
      setVisible(true);
    }
    localStorage.setItem(LAST_CALL_KEY, direction);
  }, [direction]);

  if (!visible) return null;

  const isTightening = direction === "tighten";
  const wasEasing = prevDirection === "ease";

  const message = isTightening
    ? wasEasing
      ? `Conditions flipped — shifting from easing to tightening (${tightness})`
      : `Conditions have tightened since your last visit (${tightness})`
    : direction === "ease"
      ? `Conditions have eased since your last visit (${tightness})`
      : `The operating call has changed since your last visit`;

  return (
    <div className={`rounded-lg border px-4 py-3 mb-4 ${
      isTightening
        ? "border-rose-500/30 bg-rose-500/8"
        : "border-emerald-500/30 bg-emerald-500/8"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${isTightening ? "text-rose-200" : "text-emerald-200"}`}>
          {message}
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className={`flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors ${isTightening ? "hover:text-rose-300" : "hover:text-emerald-300"}`}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
