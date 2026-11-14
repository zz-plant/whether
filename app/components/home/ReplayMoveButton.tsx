"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Plays the week's move again (`app/styles/week-move.css`). The motion is CSS keyed on the
 * card's `data-week-move`, so a replay is that attribute taken off and put back; the
 * stylesheet shows this button only where the motion runs (not under reduced motion,
 * print or screenshot mode).
 */
export function ReplayMoveButton({ since }: { since: string }) {
  const [replaying, setReplaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      data-week-move-replay
      data-replaying={replaying ? "" : undefined}
      aria-label={`Replay the move since ${since}`}
      title={`Replay the move since ${since}`}
      className="week-move-replay weather-hit ml-1.5 items-center gap-1 rounded-sm align-baseline text-fluid-sm font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
      onClick={(event) => {
        const card = event.currentTarget.closest<HTMLElement>("[data-week-move]");
        if (!card) return;
        card.dataset.weekMove = "off";
        /* Read layout so the browser drops the finished animations before they are asked for again. */
        void card.offsetWidth;
        card.dataset.weekMove = "again";
        if (timerRef.current) clearTimeout(timerRef.current);
        setReplaying(true);
        timerRef.current = setTimeout(() => setReplaying(false), 900);
      }}
    >
      <RotateCcw size={14} aria-hidden="true" />
      {/* The glyph alone on a phone, where the word took a line of its own above the call. */}
      <span className="max-sm:sr-only">{replaying ? "Replaying" : "Replay"}</span>
    </button>
  );
}
