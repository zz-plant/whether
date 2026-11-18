"use client";

import { useEffect, useRef } from "react";
import type { MonthKey } from "../../../lib/monthCursor";
import { followPageMonth, setPageMonth } from "../monthCursor";

/**
 * The room-to-move chart as a slider (2026-11-18), on the record band's model
 * (`recordBandReadout.tsx`): point along the plot and the line above it names that
 * month, its score and its conditions; Left and Right step a month, Shift a year, Home
 * and End go to the ends; a click or Enter opens the brief as it read that month;
 * Escape, leaving or blurring puts the line back.
 *
 * It renders nothing and imports nothing that holds data: every month's words, link
 * and height are on its link in the server-drawn chart (`data-readout-text`, `href`,
 * `data-top`). With scripts off the chart is a picture whose months are links. The
 * plot keeps `touch-action: pan-y`, so a vertical swipe on a phone still scrolls.
 *
 * Its month is the page's (`monthCursor.tsx`): moving along the plot sets it, and a
 * month set anywhere else (the record band, the year grid, `[` and `]`) reads out
 * here as if pointed at, and goes when that month is let go.
 */
export function LatitudeChartReadout() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const figure = anchor.current?.closest<HTMLElement>("[data-latitude-chart]");
    const plot = figure?.querySelector<HTMLElement>("[data-latitude-plot]");
    const rest = figure?.querySelector<HTMLElement>("[data-latitude-readout] [data-readout-rest]");
    const live = figure?.querySelector<HTMLElement>("[data-latitude-readout] [data-readout-live]");
    const cursor = figure?.querySelector<HTMLElement>("[data-latitude-cursor]");
    const dot = figure?.querySelector<HTMLElement>("[data-latitude-dot]");
    if (!figure || !plot || !rest || !live || !cursor || !dot) return;
    const months = Array.from(plot.querySelectorAll<SVGAElement>("a[data-index]"));
    const count = months.length;
    if (count === 0) return;

    const imageLabel = plot.getAttribute("aria-label");
    let current = count - 1;
    /* The month read out now, if any. */
    let shown: MonthKey | null = null;
    /* True while the chart follows a month set elsewhere: it moves and says nothing back. */
    let following = false;
    const monthAt = (index: number) => months[index]?.dataset.month ?? null;

    const textAt = (index: number) => months[index]?.dataset.readoutText ?? "";
    const show = (index: number) => {
      current = Math.min(Math.max(index, 0), count - 1);
      const text = textAt(current);
      const left = `${((current + 0.5) / count) * 100}%`;
      live.textContent = text;
      live.hidden = false;
      rest.hidden = true;
      cursor.style.left = left;
      cursor.hidden = false;
      dot.style.left = left;
      dot.style.top = `${months[current]?.dataset.top ?? 0}%`;
      dot.hidden = false;
      plot.setAttribute("aria-valuenow", String(current + 1));
      plot.setAttribute("aria-valuetext", text);
      shown = monthAt(current);
      if (!following) setPageMonth(shown);
    };
    const clear = () => {
      live.hidden = true;
      rest.hidden = false;
      cursor.hidden = true;
      dot.hidden = true;
      const had = shown;
      shown = null;
      if (!following && had) setPageMonth(null);
    };
    const follow = (month: MonthKey | null) => {
      if (month === shown) return;
      const index = month ? months.findIndex((item) => item.dataset.month === month) : -1;
      following = true;
      if (index < 0) clear();
      else show(index);
      following = false;
    };
    const open = () => {
      const href = months[current]?.getAttribute("href");
      if (href) window.location.assign(href);
    };
    const indexAt = (clientX: number) => {
      const box = plot.getBoundingClientRect();
      return Math.floor(((clientX - box.left) / Math.max(box.width, 1)) * count);
    };

    plot.setAttribute("role", "slider");
    plot.setAttribute("tabindex", "0");
    plot.setAttribute("aria-label", plot.dataset.sliderLabel ?? "Month on the record");
    plot.setAttribute("aria-valuemin", "1");
    plot.setAttribute("aria-valuemax", String(count));
    plot.setAttribute("aria-valuenow", String(count));
    plot.setAttribute("aria-valuetext", textAt(count - 1));

    const onMove = (event: PointerEvent) => show(indexAt(event.clientX));
    const onKey = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 12 : 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") show(current - step);
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") show(current + step);
      else if (event.key === "Home") show(0);
      else if (event.key === "End") show(count - 1);
      else if (event.key === "Enter" || event.key === " ") open();
      else if (event.key === "Escape") clear();
      else return;
      event.preventDefault();
    };
    const onFocus = () => show(current);

    const stopFollowing = followPageMonth(follow);
    plot.addEventListener("pointermove", onMove);
    plot.addEventListener("pointerdown", onMove);
    plot.addEventListener("pointerleave", clear);
    plot.addEventListener("pointercancel", clear);
    plot.addEventListener("keydown", onKey);
    plot.addEventListener("focus", onFocus);
    plot.addEventListener("blur", clear);
    return () => {
      stopFollowing();
      plot.removeEventListener("pointermove", onMove);
      plot.removeEventListener("pointerdown", onMove);
      plot.removeEventListener("pointerleave", clear);
      plot.removeEventListener("pointercancel", clear);
      plot.removeEventListener("keydown", onKey);
      plot.removeEventListener("focus", onFocus);
      plot.removeEventListener("blur", clear);
      for (const name of ["tabindex", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) {
        plot.removeAttribute(name);
      }
      plot.setAttribute("role", "img");
      if (imageLabel) plot.setAttribute("aria-label", imageLabel);
      following = true;
      clear();
    };
  }, []);

  return <span ref={anchor} hidden />;
}
