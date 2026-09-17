"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { createBrowserSource, useBrowserSource } from "../browserSource";

type SeenCall = {
  recordDate: string;
  recordDateLabel: string;
  regimeLabel: string;
  call: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSeenCall = (value: unknown): value is SeenCall =>
  isRecord(value)
  && typeof value.recordDate === "string"
  && typeof value.recordDateLabel === "string"
  && typeof value.regimeLabel === "string"
  && typeof value.call === "string";

const readSeenCall = (): SeenCall | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.lastSeenCall);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSeenCall(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/*
 * The read and the write are the same slot, and the read has to win.
 *
 * This visit overwrites what the last one stored, so the previous call is gone
 * the moment the write lands. The source caches on its first read and never
 * re-reads, which is what makes "what this browser last saw" a fact about the
 * page load rather than a race with the write beside it; `rememberSeenCall`
 * takes that snapshot explicitly before writing rather than relying on the
 * order React happens to run two effects in.
 */
const lastSeenCallSource = createBrowserSource<SeenCall | null>({
  read: readSeenCall,
  serverValue: null,
});

const rememberSeenCall = (current: SeenCall) => {
  lastSeenCallSource.getSnapshot();
  try {
    window.localStorage.setItem(STORAGE_KEYS.lastSeenCall, JSON.stringify(current));
  } catch {
    // Storage blocked: the page still works, the comparison waits for a browser that keeps it.
  }
};

/**
 * "Since you were last here", with nothing saved on purpose.
 *
 * Decision memory asked the reader to save the call at decision time and come
 * back to the same browser to see whether its assumptions had moved. The one
 * thing the product can record without being asked is which call this browser
 * last saw, so that is all this stores — written on every visit, read on the
 * next — and the comparison is computed against what the call is now.
 *
 * Renders nothing on a first visit and nothing when the call the reader last
 * saw is this week's. Storage is read through a store rather than during
 * render, so the server's markup — nothing — is what hydration renders too.
 */
export function SinceLastVisit({ current }: { current: SeenCall }) {
  const seen = useBrowserSource(lastSeenCallSource);

  useEffect(() => {
    rememberSeenCall(current);
  }, [current]);

  const previous = seen && seen.recordDate !== current.recordDate ? seen : null;
  if (!previous) return null;

  const regimeChanged = previous.regimeLabel !== current.regimeLabel;
  const callChanged = previous.call !== current.call;

  return (
    <p
      data-testid="since-last-visit"
      className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-4 py-2.5 text-fluid-xs leading-5 text-slate-200"
    >
      <span className="font-semibold text-white">Since you were here on {previous.recordDateLabel}:</span>{" "}
      {regimeChanged
        ? `the regime changed from ${previous.regimeLabel} to ${current.regimeLabel}.`
        : callChanged
          ? `still ${current.regimeLabel}, but the call moved.`
          : `the call held, ${current.regimeLabel} and the same do-now line.`}
      {callChanged ? (
        <span className="block text-white/60">Then: “{previous.call}”</span>
      ) : null}
    </p>
  );
}
