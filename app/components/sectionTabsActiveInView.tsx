"use client";

import { useEffect, useRef } from "react";
import { scrollRowToItem } from "./scrollRowToItem";

/**
 * Brings the current tab into view in the phone's one-line tab row. The row
 * scrolls sideways below sm, and This week's third tab and Decide's fourth end
 * past a 375px screen's edge, so a reader landing on /trust saw the tab for the
 * page they were on cut in half. Renders nothing; it reaches its row through
 * the DOM so `SectionTabs` stays a server component.
 */
export function SectionTabsActiveInView() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const row = markerRef.current?.parentElement;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && active && row.scrollWidth > row.clientWidth) {
      scrollRowToItem(row, active);
    }
  }, []);

  return <span ref={markerRef} hidden />;
}
