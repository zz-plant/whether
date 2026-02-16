"use client";

import { useEffect, useState } from "react";
import type { ReportSectionLink } from "./reportShellNavigation";

export const MobileSectionChips = ({
  links,
}: {
  links: ReportSectionLink[];
}) => {
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    const updateHash = () => {
      setActiveHash(window.location.hash || "");
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Quick section jumps" className="sm:hidden overflow-hidden">
      <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-slate-400">Jump to section</p>
      <ul className="flex w-full max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link) => {
          const isActive = activeHash === link.href;
          return (
            <li key={link.href} className="flex-shrink-0">
              <a
                href={link.href}
                aria-current={isActive ? "location" : undefined}
                className={`weather-pill inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
                  isActive
                    ? "border-sky-300/80 bg-sky-500/15 text-sky-100"
                    : "text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
