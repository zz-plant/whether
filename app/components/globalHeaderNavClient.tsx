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
      <ul className="flex gap-2 overflow-x-auto pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pr-0 md:grid-cols-3 lg:grid-cols-5">
        {navigationLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, pathname);

          return (
            <li key={link.href} className="flex-shrink-0 sm:min-w-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                title={link.boundary}
                className={`weather-pill group inline-flex min-h-[72px] min-w-[144px] flex-col items-start justify-start rounded-[1.1rem] px-3 py-3 text-left transition-colors touch-manipulation sm:min-w-0 sm:h-full ${
                  isActive
                    ? "border-sky-300/90 bg-sky-500/25 text-sky-50"
                    : "text-slate-100 hover:border-sky-400/70"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300/90">
                  {groupLabels[link.group]}
                </span>
                <span className="mt-1 text-xs font-semibold tracking-[0.06em] sm:text-sm">
                  {link.label}
                </span>
                <span
                  className={`mt-2 hidden text-[11px] leading-relaxed xl:block ${
                    isActive ? "text-sky-100/90" : "text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  {link.description}
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
