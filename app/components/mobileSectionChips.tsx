"use client";

import { useEffect, useRef } from "react";
import type { ReportSectionLink } from "./reportShellNavigation";
import { useActiveSectionId } from "./AppSidebar";
import { scrollRowToItem } from "./scrollRowToItem";

/**
 * The outline rail, for phones.
 *
 * The desktop rail lists every section and marks the one on screen; below `md`
 * it is hidden and nothing replaces it, on pages that run to 6,000–8,000px at
 * 430 wide. This is the same list as a sticky row of chips: one scroll gesture
 * to any section, and the current one marked, on the same anchors the rail
 * uses. Hidden where the rail shows.
 */
export function MobileSectionChips({ sectionLinks }: { sectionLinks: ReportSectionLink[] }) {
  const activeSectionId = useActiveSectionId(sectionLinks);
  const navRef = useRef<HTMLElement>(null);
  const activeChipRef = useRef<HTMLAnchorElement>(null);

  // The row scrolls; the page it is stuck to does not (scrollRowToItem.ts).
  useEffect(() => {
    if (navRef.current && activeChipRef.current) {
      scrollRowToItem(navRef.current, activeChipRef.current, { smooth: true });
    }
  }, [activeSectionId]);

  if (sectionLinks.length < 2) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Page sections"
      className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-2 backdrop-blur [scrollbar-width:none] lg:hidden"
    >
      {/* Text tabs with an underline, the register the header and the /operate
          workstream row use. They were bordered boxes, so a phone met a row of
          five outlined buttons, clipped at the edge, before the page's title. */}
      <ul className="flex min-w-max items-center gap-0.5">
        {sectionLinks.map((section) => {
          const isActive = section.href === `#${activeSectionId}`;
          return (
            <li key={section.href}>
              <a
                ref={isActive ? activeChipRef : undefined}
                href={section.href}
                aria-current={isActive ? "location" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-fluid-nano font-medium no-underline transition-colors weather-focus-ring ${
                  isActive
                    ? "border-[color:var(--regime-accent)] text-slate-100 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
