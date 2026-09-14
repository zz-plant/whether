"use client";

import { useEffect, useRef } from "react";
import type { ReportSectionLink } from "../reportShellNavigation";
import { useActiveSectionId } from "../AppSidebar";

export const BRIEF_SECTION_LINKS: ReportSectionLink[] = [
  { href: "#weekly-call", label: "The call" },
  { href: "#key-drivers", label: "Key drivers" },
  { href: "#since-last-visit", label: "Retrospective" },
  { href: "#direct-answers", label: "Direct answers" },
  { href: "#plan-and-evidence", label: "Plan & horizon" },
];

export function BriefSectionNav() {
  const activeSectionId = useActiveSectionId(BRIEF_SECTION_LINKS);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeLinkRef.current) {
      activeLinkRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeSectionId]);

  return (
    <nav
      aria-label="Brief section outline"
      className="sticky top-0 z-30 -mx-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-4 py-2 backdrop-blur-md [scrollbar-width:none] sm:mx-0 sm:rounded-xl sm:border sm:px-3 sm:py-2"
    >
      <ul className="flex min-w-max items-center gap-1.5">
        {BRIEF_SECTION_LINKS.map((section, index) => {
          const isActive = section.href === `#${activeSectionId}`;
          const stepNum = `0${index + 1}`;
          return (
            <li key={section.href}>
              <a
                ref={isActive ? activeLinkRef : undefined}
                href={section.href}
                aria-current={isActive ? "location" : undefined}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-fluid-xs no-underline transition-all duration-150 weather-focus-ring ${
                  isActive
                    ? "border border-sky-400/60 bg-sky-500/15 font-semibold text-white shadow-sm"
                    : "border border-transparent font-medium text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                <span
                  className={`font-mono text-[10.5px] tabular-nums ${
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
