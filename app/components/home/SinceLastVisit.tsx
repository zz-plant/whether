"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { createBrowserSource, useBrowserSource } from "../browserSource";
import { classifyReturnGap, weeksBetweenSlugs } from "../../../lib/activationFunnel";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../../../lib/isoWeek";
import { CloseIcon } from "../uiIcons";

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

const weeksBetweenRecordDates = (previousRecordDate: string, currentRecordDate: string) => {
  const from = weekSlugOf(previousRecordDate);
  const to = weekSlugOf(currentRecordDate);
  return from && to ? weeksBetweenSlugs(from, to) : null;
};

const weeksAgo = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * What a return has to be told, or null when there is nothing the card above has
 * not already said: nothing moved since this browser's last visit, or what moved is
 * the change of conditions the card's stamp line names ("Was Cloudy on Sep 30").
 */
export const sinceLastVisitDelta = (
  previous: Pick<SeenCall, "regimeLabel" | "call">,
  current: Pick<SeenCall, "regimeLabel" | "call">,
  cardEarlierRegimeLabel?: string,
): { regimeChanged: boolean; callChanged: boolean } | null => {
  const regimeChanged = previous.regimeLabel !== current.regimeLabel;
  const callChanged = previous.call !== current.call;
  if (!regimeChanged && !callChanged) return null;
  if (regimeChanged && previous.regimeLabel === cardEarlierRegimeLabel) return null;
  return { regimeChanged, callChanged };
};

/**
 * " (3 weeks ago)" after the date, once the gap is more than a week. A one-week
 * gap is the Monday ritual and the date alone says it; a longer one is the
 * reader the delta panel is for, and the count is what they are missing.
 */
export const elapsedWeeksSuffix = (previousRecordDate: string, currentRecordDate: string) => {
  const weeks = weeksBetweenRecordDates(previousRecordDate, currentRecordDate);
  return weeks !== null && weeks > 1 ? ` (${weeksAgo.format(-weeks, "week")})` : "";
};

export const compareHrefForRecordDate = (recordDate: string): string => {
  const year = recordDate.slice(0, 4);
  const rawMonth = Number.parseInt(recordDate.slice(5, 7), 10);
  return /^\d{4}$/.test(year) && !Number.isNaN(rawMonth) && rawMonth >= 1 && rawMonth <= 12
    ? `/history/compare?yearB=${year}&monthB=${rawMonth}`
    : "/history/compare";
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
 * Renders `fallback` (nothing, on the homepage) on a first visit, when the
 * call the reader last saw is this week's, and once the note is dismissed. The homepage mounts its standfirst
 * (`FirstVisitExplainer`) separately at the top, where it stays until
 * dismissed; this line sits under the call and appears only once there is a
 * previous call to compare against. An archived week shows neither.
 * Storage is read through a store rather than during render, so the server's
 * markup — the fallback — is what hydration renders too.
 *
 * A return after more than a week (`within_month` or `lapsed`) leads with a
 * delta panel — the change and the call the reader last saw — plus a one-click
 * board deck, because that reader is at a board or planning cadence, not a Monday
 * ritual. The weekly ritual return (`next_week`) keeps the compact line.
 *
 * Only a real delta, and only the part the card above does not say (2026-10-09).
 * It printed on every return, "the guidance held" included, and on the week of
 * Oct 5, 2026 it said "conditions changed from Cloudy to Freezing" under a card
 * whose stamp line said "Was Cloudy on Sep 30", over a section that opened with
 * the same change. It also carried what would change the guidance and the
 * lines-crossed sentence, which are sections of their own further down. Now it
 * renders when the conditions or the call differ from what this browser last
 * saw, and not when the only difference is the earlier conditions the card
 * already names (`cardEarlierRegimeLabel`).
 */
export function SinceLastVisit({
  current,
  cardEarlierRegimeLabel,
  boardDeckHref,
  fallback = null,
}: {
  current: SeenCall;
  /**
   * The earlier conditions the card's stamp line names ("Was Cloudy on Sep 30"),
   * when it names any. A visit that last saw those same conditions has nothing to
   * learn from this note that the card has not said.
   */
  cardEarlierRegimeLabel?: string;
  /** One-click board deck download for the lapsed return path. */
  boardDeckHref?: string;
  /** What a reader with nothing to compare against sees in this slot instead. */
  fallback?: ReactNode;
}) {
  const seen = useBrowserSource(lastSeenCallSource);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    rememberSeenCall(current);
  }, [current]);

  const previous = seen && seen.recordDate !== current.recordDate ? seen : null;
  if (!previous || isDismissed) return fallback;

  const delta = sinceLastVisitDelta(previous, current, cardEarlierRegimeLabel);
  if (!delta) return fallback;
  const { regimeChanged, callChanged } = delta;
  /* Bucketed the way the activation funnel buckets it: the weekly ritual
     (`next_week`) keeps the compact line, a lapsed reader the product is
     trying to win back (`within_month`, `lapsed`) gets the delta panel. */
  const weeks = weeksBetweenRecordDates(previous.recordDate, current.recordDate);
  const gap = weeks === null ? null : classifyReturnGap(weeks);
  const isLapsedReturn = gap === "within_month" || gap === "lapsed";
  const elapsedLabel = elapsedWeeksSuffix(previous.recordDate, current.recordDate);

  /* For this page load only. The visit has already recorded this week's call,
     so the next one compares against it and the note does not come back. The
     44px target overhangs the padding rather than growing the line. */
  const dismissButton = (
    <button
      type="button"
      onClick={() => setIsDismissed(true)}
      aria-label="Dismiss"
      className="-my-2.5 -mr-3 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-200 weather-focus-ring"
    >
      <CloseIcon className="size-3.5" />
    </button>
  );

  const compact = (
    <div
      data-testid="since-last-visit"
      className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-4 py-2.5 text-fluid-xs leading-5 text-slate-200"
    >
      <div>
        <span className="font-semibold text-slate-50">Monday check &mdash; since you were here on {previous.recordDateLabel}{elapsedLabel}:</span>{" "}
        {regimeChanged
          ? `conditions changed from ${previous.regimeLabel} to ${current.regimeLabel}.`
          : `still ${current.regimeLabel}, but the guidance changed.`}
        {callChanged ? (
          <span className="block text-slate-400">Then: “{previous.call}”</span>
        ) : null}
      </div>
      {dismissButton}
    </div>
  );

  if (!isLapsedReturn) return compact;

  /* A lapsed return is at a planning cadence, so lead with the delta and put
     the one-slide summary one click away — the QAU conversion surface. */
  return (
    <div data-testid="lapsed-return" className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-fluid-xs leading-5 text-slate-200">
          <span className="font-semibold text-slate-50">Monday check &mdash; since your last read on {previous.recordDateLabel}{elapsedLabel}:</span>{" "}
          {regimeChanged
            ? `conditions changed from ${previous.regimeLabel} to ${current.regimeLabel}.`
            : `still ${current.regimeLabel}, but the guidance changed.`}
        </p>
        {dismissButton}
      </div>
      {/* The call the reader last saw; the call now is the card's heading. */}
      {callChanged ? <p className="text-fluid-xs leading-5 text-slate-400">Then: “{previous.call}”</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {boardDeckHref ? (
          <a
            href={boardDeckHref}
            target="_blank"
            rel="noreferrer"
            className="weather-button inline-flex min-h-[36px] items-center px-3 py-1.5 text-fluid-micro font-semibold no-underline"
          >
            Download this week&apos;s guidance as a slide
          </a>
        ) : null}
        <Link
          href={compareHrefForRecordDate(previous.recordDate)}
          className="weather-button inline-flex min-h-[36px] items-center px-3 py-1.5 text-fluid-micro font-semibold no-underline text-sky-200 hover:text-slate-50"
        >
          Compare against your last visit &rarr;
        </Link>
      </div>
      <p className="text-fluid-nano text-slate-400">
        Runway is a quarterly question, and this gap is longer.{" "}
        <a
          href="#runway-notes"
          className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-slate-50"
        >
          Re-check your runway band
        </a>
        .
      </p>
    </div>
  );
}
