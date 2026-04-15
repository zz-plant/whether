"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { GLOBAL_HEADER_BRAND_LINK_CLASSNAME } from "./globalHeaderShared";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { ThemeToggleButton } from "./themeToggleButton";

const resolveReportHeaderAction = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/operations#ops-monthly-action-summary", label: "Planning" };
  }

  if (pathname.startsWith("/signals")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Planning" };
  }

  if (pathname.startsWith("/operations")) {
    return { href: "#ops-export-briefs", label: "Share formats" };
  }

  if (pathname.startsWith("/decide")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Back to plan" };
  }

  if (pathname.startsWith("/method")) {
    return { href: "/signals#decision-summary", label: "Evidence" };
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
  const routeLabel = isHomeBrief ? "Weekly brief" : resolveGlobalHeaderRouteLabel(pathname);
  const reportHeaderAction = resolveReportHeaderAction(pathname);
  const showCollapsedWorkflowPicker = isHomeBrief;

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-2.5 lg:px-8 lg:pt-3">
      <div className="weather-appbar weather-topbar px-4 py-3 sm:px-5 sm:py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <Link href="/" className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}>
                  Whether
                </Link>
                <span className="weather-tag weather-tag-slate">
                  {isHomeBrief ? "Weekly Brief" : routeLabel}
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              {isReportRoute ? (
                <>
                  {reportHeaderAction ? (
                    <Link
                      href={reportHeaderAction.href}
                      className="weather-button-primary inline-flex min-h-[42px] items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
                    >
                      {reportHeaderAction.label}
                    </Link>
                  ) : null}
                  {isHomeBrief ? (
                    <Link
                      href="/search"
                      className="weather-pill hidden min-h-[40px] items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-200 sm:inline-flex"
                    >
                      Search tools
                    </Link>
                  ) : (
                    <Link
                      href="/"
                      className="weather-pill hidden min-h-[40px] items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-100 sm:inline-flex"
                    >
                      Weekly brief
                    </Link>
                  )}
                  <ThemeToggleButton className="min-h-[42px]" />
                </>
              ) : (
                <>
                  <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                  <ThemeToggleButton />
                </>
              )}
            </div>
          </div>

          {showCollapsedWorkflowPicker ? (
            <details className="rounded-2xl border border-slate-800/70 bg-slate-950/45 px-3 py-2">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Browse workflow
              </summary>
              <div className="mt-3">
                <GlobalHeaderNavClient pathname={pathname} variant="compact" />
              </div>
            </details>
          ) : (
            <>
              <details className="rounded-2xl border border-slate-800/70 bg-slate-950/45 px-3 py-2 md:hidden">
                <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Browse workflow
                </summary>
                <div className="mt-3">
                  <GlobalHeaderNavClient pathname={pathname} variant="compact" />
                </div>
              </details>

              <nav aria-label="Global navigation" className="hidden border-t border-slate-800/65 pt-2 md:block">
                <GlobalHeaderNavClient pathname={pathname} variant="compact" />
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
