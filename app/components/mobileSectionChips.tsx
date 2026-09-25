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
  const [hiddenEdges, setHiddenEdges] = useState({ left: false, right: false });

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
    <nav
      ref={navRef}
      aria-label="Page sections"
      className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-4 py-1.5 backdrop-blur [scrollbar-width:none] lg:hidden"
    >
      <ul className="flex min-w-max items-center gap-1.5 pb-0.5">
        {sectionLinks.map((section) => {
          const isActive = section.href === `#${activeSectionId}`;
          return (
            <li key={section.href}>
              <a
                ref={isActive ? activeChipRef : undefined}
                href={section.href}
                aria-current={isActive ? "location" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-md border px-3 text-fluid-nano font-medium no-underline transition-colors weather-focus-ring ${
                  isActive
                    ? "border-[color:var(--regime-accent)] bg-[color:var(--regime-accent)]/15 text-slate-100 font-semibold"
                    : "border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
      {hiddenEdges.left ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[color:var(--bg-body)] to-transparent"
        />
      ) : null}
      {hiddenEdges.right ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[color:var(--bg-body)] to-transparent"
        />
      ) : null}
    </nav>
  );
}
