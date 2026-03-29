"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { NavigationOrientationBadge } from "./navigationOrientationBadge";
import { GLOBAL_HEADER_BRAND_LINK_CLASSNAME } from "./globalHeaderShared";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";

import type { ReactNode } from "react";

type GlobalHeaderRouteGateProps = {
  defaultHeader: ReactNode;
};

export function GlobalHeaderRouteGate({ defaultHeader }: GlobalHeaderRouteGateProps) {
  const pathname = normalizePathname(usePathname() ?? "/");

  if (!isReportShellRoute(pathname)) {
    return <>{defaultHeader}</>;
  }

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pt-4">
      <div className="weather-appbar weather-topbar px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="relative flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/"
                className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}
              >
                Whether
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                  {resolveGlobalHeaderRouteLabel(pathname)}
                </p>
              </div>
            </div>
            <NavigationOrientationBadge currentPath={pathname} className="max-w-full" />
          </div>

          <div className="flex items-center justify-end gap-2 lg:flex-shrink-0">
            <Link
              href="/search"
              className="weather-pill inline-flex min-h-[40px] items-center rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200 sm:hidden"
            >
              Search
            </Link>
            <GlobalHeaderSearchForm compact className="hidden gap-2 sm:grid sm:grid-cols-[minmax(0,14rem)_auto] sm:items-center" />
          </div>
        </div>
      </div>
    </header>
  );
}
