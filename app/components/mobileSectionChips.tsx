"use client";

import { useEffect, useRef } from "react";
import type { ReportSectionLink } from "./reportShellNavigation";
import { useActiveSectionId } from "./AppSidebar";

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
  const activeChipRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeSectionId]);

  if (sectionLinks.length < 2) return null;

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-4 py-1.5 backdrop-blur [scrollbar-width:none] lg:hidden"
    >
      <ul className="flex min-w-max items-center gap-1.5 pb-0.5">
        {sectionLinks.map((section, index) => {
          const isActive = section.href === `#${activeSectionId}`;
          const stepNum = `0${index + 1}`;
          return (
            <li key={section.href}>
              <a
                ref={isActive ? activeChipRef : undefined}
                href={section.href}
                aria-current={isActive ? "location" : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-fluid-nano font-medium no-underline transition-colors weather-focus-ring ${
                  isActive
                    ? "border-[color:var(--regime-accent)] bg-[color:var(--regime-accent)]/15 text-slate-100 font-semibold"
                    : "border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span
                  className={`font-mono text-[9.5px] tabular-nums ${
                    isActive ? "font-bold text-sky-300" : "text-slate-500"
                  }`}
                >
                  {stepNum}
                </span>
                <span>{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
