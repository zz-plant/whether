"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { ThemeToggleButton } from "./themeToggleButton";

const groupBadgeStyles = {
  core: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  workflow: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  reference: "border-violet-300/30 bg-violet-400/10 text-violet-100",
} as const;

const groupLabels = {
  core: "Now",
  workflow: "Operate",
  reference: "Reference",
} as const;

export function GlobalHeader() {
  const pathname = usePathname();
  const isHome = pathMatchesLink("/", pathname);

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="weather-appbar px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
            >
              Whether
            </Link>
            {isHome ? (
              <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
                Weekly operating posture for product, hiring, and spend decisions.
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">
                Operating posture navigation
              </p>
            )}
          </div>
          <ThemeToggleButton />
        </div>

        <nav aria-label="Global navigation" className="mt-4">
          <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigationLayers.map((link) => {
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
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${groupBadgeStyles[link.group]}`}
                    >
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
        </nav>
      </div>
    </header>
  );
}
