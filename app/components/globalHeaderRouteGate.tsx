"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderTagline,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { GLOBAL_HEADER_BRAND_LINK_CLASSNAME } from "./globalHeaderShared";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";

import type { ReactNode } from "react";

type GlobalHeaderRouteGateProps = {
  defaultHeader: ReactNode;
};

export function GlobalHeaderRouteGate({ defaultHeader }: GlobalHeaderRouteGateProps) {
  const pathname = normalizePathname(usePathname() ?? "/");
  const tagline = resolveGlobalHeaderTagline(pathname);

  if (!isReportShellRoute(pathname)) {
    return <>{defaultHeader}</>;
  }

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pt-4">
      <div className="weather-appbar weather-topbar px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="relative flex flex-col gap-2">
          <div className="flex min-w-0 items-center justify-between gap-2.5">
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
                {tagline.description ? (
                  <p className="hidden text-[11px] leading-relaxed text-slate-400 sm:block">
                    {tagline.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/search"
              className="weather-pill inline-flex min-h-[38px] items-center rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200"
            >
              Search
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <GlobalHeaderNavClient pathname={pathname} variant="compact" />
        </div>
      </div>
    </header>
  );
}
