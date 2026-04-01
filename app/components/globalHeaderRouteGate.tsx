"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tagline = isHydrated
    ? resolveGlobalHeaderTagline(pathname)
    : {
        title: "Operating posture navigation",
        description: "Open one deeper page only after the weekly brief leaves one specific question unresolved.",
      };

  if (!isReportShellRoute(pathname)) {
    return <>{defaultHeader}</>;
  }

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pt-4">
      <div className="weather-appbar weather-topbar px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="relative flex flex-col gap-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}
              >
                Whether
              </Link>
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-xs font-semibold tracking-[0.08em] text-slate-100 sm:text-[13px]">
                  {isHydrated ? resolveGlobalHeaderRouteLabel(pathname) : "Report"}
                </p>
                {tagline.description ? (
                  <p className="hidden max-w-[42rem] text-[12px] leading-relaxed text-slate-400 md:block">
                    {tagline.description}
                  </p>
                ) : null}
              </div>
            </div>
            <Link
              href="/decide#unresolved-question-router"
              className="weather-pill inline-flex min-h-[42px] flex-shrink-0 items-center rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            >
              Decision Tools
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <GlobalHeaderNavClient pathname={pathname} variant="compact" deferPathResolution={true} />
        </div>
      </div>
    </header>
  );
}
