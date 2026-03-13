"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationLayer } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

type NavigationGroupLabelMap = Record<NavigationLayer["group"], string>;

type GlobalHeaderNavClientProps = {
  navigationLinks: readonly NavigationLayer[];
  groupLabels: NavigationGroupLabelMap;
};

export function GlobalHeaderNavClient({ navigationLinks, groupLabels }: GlobalHeaderNavClientProps) {
  const pathname = usePathname();

  return (
    <div className="relative">
      <ul className="flex gap-2 overflow-x-auto pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80">
        {navigationLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, pathname);

          return (
            <li key={link.href} className="flex-shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                title={link.boundary}
                className={`weather-pill inline-flex min-h-[44px] min-w-[132px] flex-col items-start justify-center rounded-xl px-3 py-2 text-left transition-colors touch-manipulation ${
                  isActive
                    ? "border-sky-300/90 bg-sky-500/25 text-sky-50"
                    : "text-slate-100 hover:border-sky-400/70"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300/90">
                  {groupLabels[link.group]}
                </span>
                <span className="mt-1 text-xs font-semibold tracking-[0.08em] sm:text-sm">
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950 to-transparent sm:hidden"
      />
      <p className="pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:hidden">
        Swipe for more sections →
      </p>
    </div>
  );
}
