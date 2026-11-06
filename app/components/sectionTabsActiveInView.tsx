"use client";

import { useEffect, useRef } from "react";
import { scrollRowToItem } from "./scrollRowToItem";
import { watchRowEdges } from "./rowEdges";

/**
 * Brings the current tab into view in the phone's one-line tab row. The row
 * scrolls sideways below sm, and This week's third tab and Decide's fourth end
 * past a 375px screen's edge, so a reader landing on /trust saw the tab for the
 * page they were on cut in half. Renders nothing; it reaches its row through
 * the DOM so `SectionTabs` stays a server component.
 *
 * It also marks which ends of the row have tabs past them (`data-row-fade`), and
 * the row fades those ends (layout-effects.css). The row clipped its last tab
 * mid-word with nothing to say it scrolled, under a section chip row that did
 * fade (2026-11-06).
 */
export function SectionTabsActiveInView() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const row = markerRef.current?.parentElement;
    if (!row) return;
    const active = row.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && row.scrollWidth > row.clientWidth) {
      scrollRowToItem(row, active);
    }
    return watchRowEdges(row, ({ start, end }) => {
      const fade = start && end ? "both" : start ? "start" : end ? "end" : null;
      if (fade) row.dataset.rowFade = fade;
      else delete row.dataset.rowFade;
    });
  }, []);

  return <span ref={markerRef} hidden />;
}
