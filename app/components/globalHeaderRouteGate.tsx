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
    <header className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="weather-appbar border-slate-800/80 bg-slate-950/72 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}
              >
                Whether
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Report surface
                </p>
                <p className="truncate text-xs font-medium text-slate-200">
                  {resolveGlobalHeaderRouteLabel(pathname)}
                </p>
              </div>
            </div>
            <NavigationOrientationBadge currentPath={pathname} className="max-w-full" />
          </div>

          <GlobalHeaderSearchForm className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_auto] sm:items-center lg:flex-shrink-0" />
        </div>
      </div>
    </header>
  );
}
