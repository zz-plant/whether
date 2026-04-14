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
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { ThemeToggleButton } from "./themeToggleButton";

const resolveReportHeaderAction = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/operations#ops-monthly-action-summary", label: "Open planning" };
  }

  if (pathname.startsWith("/signals")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Make the plan" };
  }

  if (pathname.startsWith("/operations")) {
    return { href: "#ops-export-briefs", label: "Share the brief" };
  }

  if (pathname.startsWith("/decide")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Back to planning" };
  }

  if (pathname.startsWith("/method")) {
    return { href: "/signals#decision-summary", label: "Check evidence" };
  }

  return null;
};

type GlobalHeaderRouteGateProps = {
  initialPathname?: string;
};

export function GlobalHeaderRouteGate({ initialPathname = "/" }: GlobalHeaderRouteGateProps) {
  const currentPathname = normalizePathname(usePathname() ?? initialPathname);
  const [pathname, setPathname] = useState(() => normalizePathname(initialPathname));

  useEffect(() => {
    setPathname(currentPathname);
  }, [currentPathname]);

  const isReportRoute = isReportShellRoute(pathname);
  const isHomeBrief = pathname === "/";
  const tagline = resolveGlobalHeaderTagline(pathname);
  const routeLabel = isHomeBrief ? "Weekly brief" : resolveGlobalHeaderRouteLabel(pathname);
  const reportHeaderAction = resolveReportHeaderAction(pathname);

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pt-4">
      <div className="weather-appbar weather-topbar px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <Link href="/" className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}>
                  Whether
                </Link>
                {isReportRoute && !isHomeBrief ? (
                  <span className="weather-tag weather-tag-slate">
                    Core workflow
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
                  {routeLabel}
                </p>
                <p className="max-w-3xl text-[12px] leading-relaxed text-slate-300">
                  {isHomeBrief
                    ? "Read this week's call first. Open planning or proof only when the room needs the next step."
                    : (tagline.description ?? "Move to the next workflow only when the weekly brief needs support.")}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {isReportRoute ? (
                <>
                  {reportHeaderAction ? (
                    <Link
                      href={reportHeaderAction.href}
                      className="weather-button-primary inline-flex min-h-[42px] items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
                    >
                      {reportHeaderAction.label}
                    </Link>
                  ) : null}
                  {!isHomeBrief ? (
                    <Link
                      href="/"
                      className="weather-pill inline-flex min-h-[42px] items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
                    >
                      Weekly brief
                    </Link>
                  ) : (
                    <Link
                      href="/signals#decision-summary"
                      className="weather-pill inline-flex min-h-[42px] items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
                    >
                      See proof
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                  <ThemeToggleButton />
                </>
              )}
            </div>
          </div>

          {isHomeBrief ? (
            <details className="rounded-xl border border-slate-800/70 bg-slate-950/45 px-3 py-2.5">
              <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                Browse workspaces
              </summary>
              <div className="mt-3">
                <GlobalHeaderNavClient pathname={pathname} variant="compact" />
              </div>
            </details>
          ) : (
            <nav aria-label="Global navigation">
              <GlobalHeaderNavClient pathname={pathname} variant="compact" />
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
