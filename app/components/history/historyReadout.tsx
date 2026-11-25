"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shiftMonthKey } from "../../../lib/monthCursor";
import { followPageMonth } from "../monthCursor";
import {
  TappedMarkCard,
  chooseTappedMark,
  isOtherControl,
  markNearest,
  releaseTappedMonth,
  tapOf,
  type MarkTapDown,
  type TappedMark,
} from "../ui/markReadout";

/**
 * The readout for /history's record figures (2026-11-18): point at or focus a mark
 * and the line beside the figure names it; leave and the line goes back to what the
 * server drew. The month grid and the advance-warning marks use it.
 *
 * It changes no words the server drew. Each mark is a link that carries its own
 * name (`aria-label`) and the same text in `data-readout-text`; the server draws the
 * readout line (`data-readout`) with its resting content (`data-readout-rest`, a key
 * or the figure's domain) and an empty, hidden slot for a mark's words
 * (`data-readout-live`), so with scripts off the figure is complete and every mark
 * still opens its month. The line is `aria-hidden`: a screen reader hears the focused
 * link's own name, which is the same sentence.
 *
 * `grid` adds the keys a calendar needs, with one stop in the tab order rather than
 * 178: Left and Right step a month, Up and Down a year (the newer year sits above),
 * Home and End go to the ends of the record. The server makes the newest month the
 * one stop; the keys move it.
 *
 * A mark that stands for a month carries it (`data-month`), and the line follows the
 * page's month (`monthCursor.tsx`): a month read anywhere on the page names its mark
 * here, and when it is let go the line goes back to the focused mark or its rest.
 *
 * Touch and pen (2026-11-25), as `MarkReadout` does it: a grid cell is about 25px
 * across on a phone, so a tap anywhere among the marks chooses the nearest one rather
 * than opening whichever cell the finger covered. The line names it, and a card above
 * the finger repeats the words with a 44px link that opens it ("Open Sep 2022"); the
 * line can be scrolled out of sight above a tall grid, the card cannot. A tap outside
 * the marks, the card's close key or Escape puts it away. The span this renders is the
 * card's anchor: positioned, sized zero, so it moves nothing.
 */
export function HistoryReadout({ grid = false }: { grid?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [tapped, setTapped] = useState<TappedMark | null>(null);
  /* The open card, for the listeners below, which are bound once. */
  const open = useRef<TappedMark | null>(null);
  useEffect(() => {
    open.current = tapped;
  }, [tapped]);

  const cardScope = useCallback(() => anchor.current?.closest<HTMLElement>("[data-readout-scope]") ?? null, []);
  const closeTapped = useCallback((target: EventTarget | null) => {
    if (open.current) releaseTappedMonth(open.current, target);
    open.current = null;
    setTapped(null);
  }, []);

  useEffect(() => {
    const origin = anchor.current;
    const scope = origin?.closest<HTMLElement>("[data-readout-scope]");
    const rest = scope?.querySelector<HTMLElement>("[data-readout-rest]");
    const live = scope?.querySelector<HTMLElement>("[data-readout-live]");
    if (!origin || !scope || !rest || !live) return;
    const items = Array.from(scope.querySelectorAll<HTMLElement>("[data-readout-text]"));
    if (items.length === 0) return;

    const itemOf = (target: EventTarget | null) => {
      const item = target instanceof Element ? target.closest<HTMLElement>("[data-readout-text]") : null;
      return item && scope.contains(item) ? item : null;
    };
    const show = (item: HTMLElement | null) => {
      const text = item?.dataset.readoutText;
      live.textContent = text ?? "";
      live.hidden = !text;
      rest.hidden = Boolean(text);
    };
    /* The marks by month, for the page's month and for the grid's Up and Down. */
    const byMonth = new Map(items.flatMap((item) => (item.dataset.month ? [[item.dataset.month, item] as const] : [])));
    const focused = () => itemOf(scope.contains(document.activeElement) ? document.activeElement : null);
    /* Back to the focused mark if the keyboard is still in the figure, else the page's month, else the resting line. */
    const settle = () => show(focused() ?? byMonth.get(document.documentElement.dataset.activeMonth ?? "") ?? null);

    const onOver = (event: PointerEvent) => {
      const item = itemOf(event.target);
      if (item) show(item);
    };
    const onFocusIn = (event: FocusEvent) => {
      const item = itemOf(event.target);
      if (!item) return;
      show(item);
      if (grid) {
        for (const other of items) other.tabIndex = other === item ? 0 : -1;
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !scope.contains(event.relatedTarget)) show(null);
    };

    /* Where the last finger or pen came down, so its click is read as a tap; a mouse's and a key's are not. */
    let down: MarkTapDown | null = null;
    const onDown = (event: PointerEvent) => {
      down = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    /* A finger that scrolled the page made no tap. */
    const onCancel = () => {
      down = null;
    };
    const onTap = (event: MouseEvent) => {
      const point = tapOf(down, event.timeStamp);
      down = null;
      if (!point) return;
      if (event.target instanceof Element && event.target.closest("[data-mark-tap-card]")) return;
      if (isOtherControl(event.target)) return;
      const item = markNearest(items, point, true);
      if (!item) {
        closeTapped(event.target);
        return;
      }
      event.preventDefault();
      show(item);
      const next = chooseTappedMark(item, item.dataset.readoutText ?? "", point, origin);
      open.current = next;
      setTapped(next);
    };

    const stopFollowing = followPageMonth((month) => show((month ? byMonth.get(month) : undefined) ?? focused()));

    /* The grid's cells by date, oldest first. */
    const ordered = [...items].sort((a, b) => (a.dataset.date ?? "").localeCompare(b.dataset.date ?? ""));
    const onKey = (event: KeyboardEvent) => {
      const item = itemOf(event.target);
      if (!item) return;
      const at = ordered.indexOf(item);
      const month = item.dataset.month;
      let next: HTMLElement | undefined;
      if (event.key === "ArrowLeft") next = ordered[at - 1];
      else if (event.key === "ArrowRight") next = ordered[at + 1];
      else if (event.key === "ArrowUp") next = month ? byMonth.get(shiftMonthKey(month, 12)) : undefined;
      else if (event.key === "ArrowDown") next = month ? byMonth.get(shiftMonthKey(month, -12)) : undefined;
      else if (event.key === "Home") next = ordered[0];
      else if (event.key === "End") next = ordered.at(-1);
      else return;
      event.preventDefault();
      next?.focus();
    };

    scope.addEventListener("pointerover", onOver);
    scope.addEventListener("pointerleave", settle);
    scope.addEventListener("focusin", onFocusIn);
    scope.addEventListener("focusout", onFocusOut);
    scope.addEventListener("pointerdown", onDown);
    scope.addEventListener("pointercancel", onCancel);
    scope.addEventListener("click", onTap);
    if (grid) scope.addEventListener("keydown", onKey);
    return () => {
      stopFollowing();
      scope.removeEventListener("pointerover", onOver);
      scope.removeEventListener("pointerleave", settle);
      scope.removeEventListener("focusin", onFocusIn);
      scope.removeEventListener("focusout", onFocusOut);
      scope.removeEventListener("pointerdown", onDown);
      scope.removeEventListener("pointercancel", onCancel);
      scope.removeEventListener("click", onTap);
      scope.removeEventListener("keydown", onKey);
      show(null);
    };
  }, [grid, closeTapped]);

  return (
    <span ref={anchor} className="absolute top-0 left-0 block size-0">
      {tapped ? <TappedMarkCard tapped={tapped} scope={cardScope} onClose={closeTapped} /> : null}
    </span>
  );
}
