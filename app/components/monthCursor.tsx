"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MONTH_EVENT,
  markMonth,
  monthOfDetail,
  rangeHoldsMonth,
  recordMonthKeys,
  stepMonthKey,
  type MonthEventDetail,
  type MonthKey,
} from "../../lib/monthCursor";

/**
 * One month at a time, across every drawing on a page (2026-11-18). Point at, focus or
 * tap a mark that stands for a month and every other drawing on the page shows the
 * same month: its marks take an ink outline (month-active.css), and the readouts that
 * name a month (the record band's, /history's) name this one. `[` and `]` step through
 * the months the page draws, Escape lets go (KeyboardShortcuts.tsx binds them).
 *
 * The contract is in `lib/monthCursor.ts`. This module is its one listener: delegated
 * on `document`, so a drawing adds `data-month` to its marks and nothing else, and a
 * drawing that renders later (a disclosure, a client navigation) joins without
 * registering. Mounted once, beside the record band in the layout.
 *
 * An enhancement: every mark is drawn on the server and every month mark that opens a
 * month is a link, so with scripts off each drawing still reads and opens alone.
 */

const MARK = "[data-month],[data-month-from],[data-month-to]";

const markOf = (target: EventTarget | null): HTMLElement | SVGElement | null => {
  const mark = target instanceof Element ? target.closest(MARK) : null;
  return mark instanceof HTMLElement || mark instanceof SVGElement ? mark : null;
};

const monthOfMark = (mark: HTMLElement | SVGElement | null): MonthKey | null =>
  mark ? markMonth({ month: mark.dataset.month, monthFrom: mark.dataset.monthFrom, monthTo: mark.dataset.monthTo }) : null;

const holds = (mark: Element, month: MonthKey) => {
  if (!(mark instanceof HTMLElement || mark instanceof SVGElement)) return false;
  return mark.dataset.month === month || rangeHoldsMonth(month, mark.dataset.monthFrom, mark.dataset.monthTo);
};

/** The page's month, as `<html data-active-month>` holds it. */
const activeMonth = (): MonthKey | null => {
  const month = document.documentElement.dataset.activeMonth ?? null;
  return month && month.length === 7 ? month : null;
};

/* The elements marked now, so the next month unmarks exactly these. */
let marked: Element[] = [];
/* The screen reader's line for `[` and `]`, while the module is mounted. */
let status: HTMLOutputElement | null = null;

/** Marks every element that stands for `month`, and unmarks the rest. Changes no words. */
const markPage = (month: MonthKey | null) => {
  const root = document.documentElement;
  if (month) root.dataset.activeMonth = month;
  else delete root.dataset.activeMonth;
  const next = month ? Array.from(document.querySelectorAll(MARK)).filter((mark) => holds(mark, month)) : [];
  for (const mark of marked) {
    if (!next.includes(mark)) mark.removeAttribute("data-month-active");
  }
  for (const mark of next) mark.setAttribute("data-month-active", "");
  marked = next;
};

/**
 * Sets the page's month and tells every drawing. A drawing with a readout of its own
 * (the record band, the room-to-move chart) calls this when the reader moves it, and
 * follows `whether:month` for every other source; the same month twice is one event.
 */
export const setPageMonth = (month: MonthKey | null) => {
  if (typeof document === "undefined" || month === activeMonth()) return;
  document.dispatchEvent(new CustomEvent<MonthEventDetail>(MONTH_EVENT, { detail: { month } }));
};

/** Calls `follow` with every month the page is set to, from any source, until the return is called. */
export const followPageMonth = (follow: (month: MonthKey | null) => void) => {
  const listener = (event: Event) => follow(monthOfDetail(event instanceof CustomEvent ? event.detail : undefined));
  document.addEventListener(MONTH_EVENT, listener);
  return () => document.removeEventListener(MONTH_EVENT, listener);
};

const isDrawn = (element: Element) => element.getClientRects().length > 0;

/**
 * `[` (-1) and `]` (1): the next month among those the page draws, or along the record
 * band where the page draws none; with no month set, the latest. True when it moved.
 * The month is read out to a screen reader in the band's own words.
 */
export const stepPageMonth = (direction: -1 | 1): boolean => {
  const drawn = Array.from(document.querySelectorAll<HTMLElement | SVGElement>("[data-month]"))
    .filter(isDrawn)
    .map((mark) => mark.dataset.month ?? "");
  const band = document.querySelector<HTMLElement>("[data-record-band]");
  const months = drawn.length > 0 ? drawn : recordMonthKeys(band?.dataset.first ?? "", Math.floor((band?.dataset.months ?? "").length / 7));
  const next = stepMonthKey(months, activeMonth(), direction);
  if (!next) return false;
  setPageMonth(next);
  const words = document.querySelector<HTMLElement>("[data-record-band-readout]")?.textContent?.trim();
  if (status) status.textContent = words || next;
  return true;
};

/** Escape: lets go of the page's month. True when one was set. */
export const clearPageMonth = (): boolean => {
  if (!activeMonth()) return false;
  setPageMonth(null);
  if (status) status.textContent = "";
  return true;
};

export function MonthCursor() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    /* A touch has no leaving: a tapped month holds until the next tap lands off every mark. */
    let tapped = false;
    /* The mark under a mouse, so focus leaving a mark falls back to it. */
    let hovered: HTMLElement | SVGElement | null = null;

    const settle = () => setPageMonth(monthOfMark(hovered) ?? monthOfMark(markOf(document.activeElement)));

    const onOver = (event: PointerEvent) => {
      const mark = markOf(event.target);
      if (!mark) return;
      if (event.pointerType === "touch") tapped = true;
      else hovered = mark;
      setPageMonth(monthOfMark(mark));
    };
    const onOut = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !markOf(event.target) || markOf(event.relatedTarget)) return;
      hovered = null;
      settle();
    };
    /* Capture, so a drawing that answers the same tap (the record band) sets its month after this clears. */
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !tapped || markOf(event.target)) return;
      tapped = false;
      setPageMonth(null);
    };
    const onFocusIn = (event: FocusEvent) => {
      const mark = markOf(event.target);
      if (mark) setPageMonth(monthOfMark(mark));
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!markOf(event.target) || markOf(event.relatedTarget)) return;
      setPageMonth(monthOfMark(hovered));
    };

    const stop = followPageMonth(markPage);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      stop();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      markPage(null);
    };
  }, []);

  /* A new page starts with no month: the one set on the last page may not be drawn here. */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPageMonth(null);
  }, [pathname]);

  /* What `[` and `]` reach, read out in the record band's words. Empty otherwise. */
  return (
    <output
      className="sr-only"
      aria-live="polite"
      ref={(node) => {
        status = node;
      }}
    />
  );
}
