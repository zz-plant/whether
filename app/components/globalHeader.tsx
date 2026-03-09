"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationGroupLabels, navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";
import { ThemeToggleButton } from "./themeToggleButton";

export function GlobalHeader() {
  const pathname = usePathname();
  const normalizedPathname = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const isHome = pathMatchesLink("/", pathname);
  const isReportShellRoute = reportShellCorePaths.some((route) => route === normalizedPathname);

  if (isReportShellRoute) {
    return null;
  }

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
                Startup market weather: weekly posture for hiring, fundraising, and runway.
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">
                Operating posture navigation
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.08em]"
              aria-label="Open global search"
            >
              Search
            </Link>
            <ThemeToggleButton />
          </div>
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
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300/90">
                      {navigationGroupLabels[link.group]}
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
