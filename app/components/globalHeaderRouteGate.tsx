"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";
import { NavigationOrientationBadge } from "./navigationOrientationBadge";

const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export const isReportShellRoute = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return reportShellCorePaths.some((route) => pathMatchesLink(route, normalizedPathname));
};

const resolveRouteLabel = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return navigationLayers.find((layer) => pathMatchesLink(layer.href, normalizedPathname))?.label ?? "Report";
};

export function GlobalHeaderRouteGate({ children }: { children: ReactNode }) {
  const pathname = normalizePathname(usePathname() ?? "/");

  if (!isReportShellRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="weather-appbar border-slate-800/80 bg-slate-950/72 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-sky-100"
              >
                Whether
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Report surface
                </p>
                <p className="truncate text-xs font-medium text-slate-200">
                  {resolveRouteLabel(pathname)}
                </p>
              </div>
            </div>
            <NavigationOrientationBadge currentPath={pathname} className="max-w-full" />
          </div>

          <Link
            href="/search"
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.08em] lg:flex-shrink-0"
            aria-label="Open global search"
          >
            Search
          </Link>
        </div>
      </div>
    </header>
  );
}
