"use client";

import { useEffect, useRef } from "react";

/**
 * The readout for /history's record figures (2026-11-18): point at or focus a mark
 * and the line beside the figure names it; leave and the line goes back to what the
 * server drew. The month grid and the advance-warning marks use it.
 *
 * It renders nothing and changes no words. Each mark is a link that carries its own
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
 */
export function HistoryReadout({ grid = false }: { grid?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scope = anchor.current?.closest<HTMLElement>("[data-readout-scope]");
    const rest = scope?.querySelector<HTMLElement>("[data-readout-rest]");
    const live = scope?.querySelector<HTMLElement>("[data-readout-live]");
    if (!scope || !rest || !live) return;
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
    /* Back to the focused mark if the keyboard is still in the figure, else to the resting line. */
    const settle = () => show(itemOf(scope.contains(document.activeElement) ? document.activeElement : null));

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

    /* The grid's cells by date, oldest first, and by year and month for Up and Down. */
    const ordered = [...items].sort((a, b) => (a.dataset.date ?? "").localeCompare(b.dataset.date ?? ""));
    const byYearMonth = new Map(ordered.map((item) => [`${item.dataset.year}-${item.dataset.month}`, item]));
    const onKey = (event: KeyboardEvent) => {
      const item = itemOf(event.target);
      if (!item) return;
      const at = ordered.indexOf(item);
      const year = Number(item.dataset.year);
      const month = item.dataset.month;
      let next: HTMLElement | undefined;
      if (event.key === "ArrowLeft") next = ordered[at - 1];
      else if (event.key === "ArrowRight") next = ordered[at + 1];
      else if (event.key === "ArrowUp") next = byYearMonth.get(`${year + 1}-${month}`);
      else if (event.key === "ArrowDown") next = byYearMonth.get(`${year - 1}-${month}`);
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
    if (grid) scope.addEventListener("keydown", onKey);
    return () => {
      scope.removeEventListener("pointerover", onOver);
      scope.removeEventListener("pointerleave", settle);
      scope.removeEventListener("focusin", onFocusIn);
      scope.removeEventListener("focusout", onFocusOut);
      scope.removeEventListener("keydown", onKey);
      show(null);
    };
  }, [grid]);

  return <span ref={anchor} hidden />;
}
