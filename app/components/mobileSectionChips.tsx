"use client";

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
  if (sectionLinks.length < 2) return null;

  return (
    <nav
      aria-label="Page sections"
      // The nav is the width-constrained scroll container and the list is the
      // thing wider than it: overflow on the list itself, with min-w-max, gave
      // the list nothing to scroll and let the page clip the trailing chips.
      // Shown until the rail appears at lg, not md — between the two the shell
      // used to reserve a rail column with nothing in it.
      className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-4 py-1.5 backdrop-blur [scrollbar-width:none] lg:hidden"
    >
      <ul className="flex min-w-max gap-1.5 pb-0.5">
        {sectionLinks.map((section) => {
          const isActive = section.href === `#${activeSectionId}`;
          return (
            <li key={section.href}>
              <a
                href={section.href}
                aria-current={isActive ? "location" : undefined}
                className={`inline-flex min-h-[40px] items-center whitespace-nowrap rounded-md border px-3 text-fluid-nano font-medium no-underline transition-colors ${
                  isActive
                    ? "border-[color:var(--regime-accent)] bg-[color:var(--regime-accent)]/15 text-slate-100"
                    : "border-slate-800/80 text-slate-400 hover:text-slate-200"
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
