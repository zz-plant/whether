"use client";

import { useEffect } from "react";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { createBrowserSource, useBrowserSource } from "../browserSource";
import { classifyReturnGap, weeksBetweenSlugs } from "../../../lib/activationFunnel";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../../../lib/isoWeek";

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

const weekSlugOf = (recordDate: string): string | null => {
  const parsed = Date.parse(recordDate);
  if (Number.isNaN(parsed)) return null;
  return formatIsoWeekSlug(getIsoWeekInfo(new Date(parsed)));
};

/**
 * The gap between the last-seen call and now, bucketed the way the activation
 * funnel buckets it. The bucket is what decides whether a returning reader is
 * in the weekly ritual (`next_week`) or a lapsed user the product is trying to
 * win back (`within_month`, `lapsed`).
 */
const returnGapOf = (previousRecordDate: string, currentRecordDate: string) => {
  const from = weekSlugOf(previousRecordDate);
  const to = weekSlugOf(currentRecordDate);
  if (!from || !to) return null;
  const weeks = weeksBetweenSlugs(from, to);
  return weeks === null ? null : classifyReturnGap(weeks);
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
 *
 * A return after more than a week (`within_month` or `lapsed`) leads with a
 * delta panel — regime, call, and flip proximity — plus a one-click board
 * deck, because that reader is at a board or planning cadence, not a Monday
 * ritual. The weekly ritual return (`next_week`) keeps the compact line.
 */
export function SinceLastVisit({
  current,
  flipProximitySentence,
  boardDeckHref,
}: {
  current: SeenCall;
  /** The nearest flip distance in the market's units, as the hero prints it. */
  flipProximitySentence?: string;
  /** One-click board deck download for the lapsed return path. */
  boardDeckHref?: string;
}) {
  const seen = useBrowserSource(lastSeenCallSource);

  useEffect(() => {
    rememberSeenCall(current);
  }, [current]);

  const previous = seen && seen.recordDate !== current.recordDate ? seen : null;
  if (!previous) return null;

  const regimeChanged = previous.regimeLabel !== current.regimeLabel;
  const callChanged = previous.call !== current.call;
  const gap = returnGapOf(previous.recordDate, current.recordDate);
  const isLapsedReturn = gap === "within_month" || gap === "lapsed";

  const compact = (
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

  if (!isLapsedReturn) return compact;

  /* A lapsed return is at a board or planning cadence, so lead with the delta
     and put the deck one click away — the QAU conversion surface. */
  return (
    <div data-testid="lapsed-return" className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-4 py-3 space-y-2">
      <p className="text-fluid-xs leading-5 text-slate-200">
        <span className="font-semibold text-white">Since your last read on {previous.recordDateLabel}:</span>{" "}
        {regimeChanged
          ? `the regime changed from ${previous.regimeLabel} to ${current.regimeLabel}.`
          : `still ${current.regimeLabel}${callChanged ? ", but the call moved" : ""}.`}
      </p>
      <p className="text-fluid-xs leading-5 text-white/60">
        {callChanged ? <>Then: “{previous.call}” · Now: “{current.call}”</> : <>The call holds: “{current.call}”</>}
        {flipProximitySentence ? <span className="block text-sky-200/80">{flipProximitySentence}</span> : null}
      </p>
      {boardDeckHref ? (
        <a
          href={boardDeckHref}
          target="_blank"
          rel="noreferrer"
          className="weather-button inline-flex min-h-[36px] items-center px-3 py-1.5 text-fluid-micro font-semibold no-underline"
        >
          Download this week&apos;s board deck
        </a>
      ) : null}
      <p className="text-fluid-nano text-slate-400">
        Runway is a quarterly question, and this gap is longer.{" "}
        <a
          href="#runway-notes"
          className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white"
        >
          Re-check your runway band
        </a>
        {" "}— the notes under the call rescale without a reload.
      </p>
    </div>
  );
}
