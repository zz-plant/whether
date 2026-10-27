"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportSectionLink } from "./reportShellNavigation";
import { useActiveSectionId } from "./AppSidebar";
import { scrollRowToItem } from "./scrollRowToItem";

/**
 * The outline rail, for phones.
 *
 * The desktop rail lists every section and marks the one on screen; below `lg`
 * it is hidden and nothing replaces it, on pages that run to 6,000–8,000px at
 * 430 wide. This is the same list as a sticky row of chips: one scroll gesture
 * to any section, and the current one marked, on the same anchors the rail
 * uses. Hidden where the rail shows.
 *
 * The row can be wider than the phone, so its edges fade wherever content is
 * hidden on that side — a row that silently clips reads as broken labels
 * rather than as something you can scroll (DD-001 made the same call for the
 * top nav). The fades are state, not decoration: each one renders only while
 * content actually sits beyond that edge.
 */
export function MobileSectionChips({ sectionLinks }: { sectionLinks: ReportSectionLink[] }) {
  const activeSectionId = useActiveSectionId(sectionLinks);
  const navRef = useRef<HTMLElement>(null);
  const activeChipRef = useRef<HTMLAnchorElement>(null);
  /* Right starts hidden: the row is wider than a phone on every route that
     renders it, and the server's frame is also what a capture taken before
     hydration shows. The first sync corrects it where the row fits. */
  const [hiddenEdges, setHiddenEdges] = useState({ left: false, right: true });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const syncEdges = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setHiddenEdges({
        left: nav.scrollLeft > 1,
        right: nav.scrollLeft < maxScrollLeft - 1,
      });
    };
    syncEdges();
    nav.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges, { passive: true });
    return () => {
      nav.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [sectionLinks]);

  // The row scrolls; the page it is stuck to does not (scrollRowToItem.ts).
  useEffect(() => {
    if (navRef.current && activeChipRef.current) {
      scrollRowToItem(navRef.current, activeChipRef.current, { smooth: true });
    }
  }, [activeSectionId]);

  if (sectionLinks.length < 2) return null;

  return (
    /* The fades sit on this wrapper, outside the scroller. Positioned inside
       it, they scrolled with the chips, so the right fade slid off the edge it
       marks on the first swipe. The wrapper carries `sticky` too, since a
       sticky element sticks within its parent. */
    <div className="sticky top-[var(--running-head-height,0px)] z-20 -mx-4 border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 backdrop-blur lg:hidden">
      <nav
        ref={navRef}
        aria-label="Page sections"
        className="overflow-x-auto overscroll-x-contain px-2 [scrollbar-width:none]"
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
                  className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-fluid-xs font-medium no-underline transition-colors weather-focus-ring ${
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
      {hiddenEdges.left ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[color:var(--bg-body)] from-25% to-transparent"
        />
      ) : null}
      {hiddenEdges.right ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[color:var(--bg-body)] from-25% to-transparent"
        />
      ) : null}
    </div>
  );
}
