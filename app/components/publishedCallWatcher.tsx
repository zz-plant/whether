/**
 * Tells a page that has been open a while that the call moved.
 *
 * The polling lives here and the judgement lives in
 * `lib/report/publishedCallWatch.ts`, which is what makes the interesting part
 * testable without a DOM: what counts as a change, and what a reader is told
 * about it.
 *
 * Two rules the implementation exists to keep. It never polls a hidden tab —
 * the common shape here is a tab left open for days, and a background tab
 * asking every quarter of an hour forever is traffic nobody reads. And it polls
 * the moment a tab becomes visible again, which is the one moment the answer
 * actually matters: someone coming back to a page they left yesterday.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  describePublishedCallChange,
  parsePublishedCallState,
  publishedCallNoticeCopy,
  PUBLISHED_CALL_POLL_MS,
  type PublishedCallChange,
  type PublishedCallState,
} from "../../lib/report/publishedCallWatch";

const POSTURE_ENDPOINT = "/api/posture/current";

export const PublishedCallWatcher = ({ rendered }: { rendered: PublishedCallState }) => {
  const [change, setChange] = useState<PublishedCallChange>(null);
  const [dismissed, setDismissed] = useState(false);
  /* Read inside the poll so a re-render cannot restart the interval, which is
     how a "poll every 15 minutes" turns into a poll per render. Assigned in an
     effect rather than during render: a ref written while rendering is the
     `react/refs` finding, and this one has no reason to be. */
  const renderedRef = useRef(rendered);
  useEffect(() => {
    renderedRef.current = rendered;
  }, [rendered]);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(POSTURE_ENDPOINT, { headers: { accept: "application/json" } });
      if (!response.ok) return;
      const next = describePublishedCallChange(renderedRef.current, parsePublishedCallState(await response.json()));
      if (next) setChange(next);
    } catch {
      /* A poll that fails is not news. The page keeps rendering what it
         rendered, which is exactly what it would do without this component. */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const pollIfVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };

    const onVisibility = () => {
      pollIfVisible();
    };

    const interval = window.setInterval(pollIfVisible, PUBLISHED_CALL_POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  if (!change || dismissed) return null;

  return (
    <output
      aria-live="polite"
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3"
    >
      <p className="text-sm leading-6 text-sky-100">{change.message}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-sm border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-50 transition hover:bg-sky-500/30"
        >
          {publishedCallNoticeCopy.action}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-sm px-2 py-1 text-xs text-sky-200/80 transition hover:text-sky-100"
        >
          Not now
        </button>
      </div>
    </output>
  );
};
