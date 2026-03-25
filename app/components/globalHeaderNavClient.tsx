"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  globalHeaderGroupLabels,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";

type GlobalHeaderNavClientProps = {
  pathname: string;
};

function NavigationLinkCard({ link }: { link: GlobalHeaderNavigationLink }) {
  return (
    <li key={link.href} className="flex-shrink-0 sm:min-w-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        title={link.boundary}
        className={`weather-pill group inline-flex min-h-[72px] min-w-[144px] flex-col items-start justify-start rounded-[1.1rem] px-3 py-3 text-left transition-colors touch-manipulation sm:h-full sm:min-w-0 ${
          link.isActive
            ? "border-sky-300/90 bg-sky-500/25 text-sky-50"
            : "text-slate-100 hover:border-sky-400/70"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300/90">
          {globalHeaderGroupLabels[link.group]}
        </span>
        <span className="mt-1 text-xs font-semibold tracking-[0.06em] sm:text-sm">{link.label}</span>
        <span
          className={`mt-2 hidden text-[11px] leading-relaxed xl:block ${
            link.isActive ? "text-sky-100/90" : "text-slate-400 group-hover:text-slate-300"
          }`}
        >
          {link.description}
        </span>
      </Link>
    </li>
  );
}

export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const navigationLinks = useMemo(() => resolveGlobalHeaderNavigationLinks(pathname), [pathname]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative">
      <div className="mb-2 sm:hidden">
        <button
          type="button"
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-semibold tracking-[0.08em]"
          aria-controls="global-header-nav-list"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? "Hide sections" : "Browse sections"}
        </button>
      </div>
      <ul
        id="global-header-nav-list"
        className={`${isMenuOpen ? "flex" : "hidden"} gap-2 overflow-x-auto pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pr-0 md:grid-cols-3 lg:grid-cols-5`}
      >
        {navigationLinks.map((link) => (
          <NavigationLinkCard key={link.href} link={link} />
        ))}
      </ul>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950 to-transparent sm:hidden ${
          isMenuOpen ? "block" : "hidden"
        }`}
      />
      <p className="pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:hidden">
        {isMenuOpen ? "Swipe for more sections →" : "Open sections to navigate →"}
      </p>
    </div>
  );
}
