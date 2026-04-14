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
    return { href: "/operations#ops-monthly-action-summary", label: "Open Planning Deck" };
  }

  if (pathname.startsWith("/signals")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Approve the Plan" };
  }

  if (pathname.startsWith("/operations")) {
    return { href: "#ops-export-briefs", label: "Open Share Formats" };
  }

  if (pathname.startsWith("/decide")) {
    return { href: "/operations#ops-monthly-action-summary", label: "Back to Weekly Plan" };
  }

  if (pathname.startsWith("/method")) {
    return { href: "/signals#decision-summary", label: "Open First Proof Block" };
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
  const routeSummary = isHomeBrief
    ? "This week's call comes first."
    : (tagline.description ?? "Move to the next workflow only when the weekly brief needs support.");

  return (
    <header className="mx-auto sticky top-0 z-50 w-full max-w-[88rem] px-4 pt-2 sm:px-6 sm:pt-2.5 lg:px-8 lg:pt-3">
      <div className="weather-appbar weather-topbar px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
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
              <div className="min-w-0 space-y-1">
                <p className="weather-brief-kicker">
                  {isHomeBrief ? "Operator desk" : "Support workspace"}
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-slate-100 sm:text-[12px]">
                    {routeLabel}
                  </p>
                  <p className="text-[11px] leading-5 text-slate-400">
                    {routeSummary}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2.5 sm:w-auto sm:grid-cols-none sm:grid-flow-col sm:auto-cols-max sm:flex-wrap sm:items-center sm:justify-end">
              {isReportRoute ? (
                <>
                  {reportHeaderAction ? (
                    <Link
                      href={reportHeaderAction.href}
                      className="weather-button-primary col-span-2 inline-flex min-h-[42px] items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100 sm:col-span-1"
                    >
                      {reportHeaderAction.label}
                    </Link>
                  ) : null}
                  {isHomeBrief ? (
                    <Link
                      href="/search"
                      className="weather-pill inline-flex min-h-[44px] items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-[0.04em] text-slate-200"
                    >
                      Search tools
                    </Link>
                  ) : (
                    <Link
                      href="/"
                      className="weather-pill inline-flex min-h-[44px] items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-[0.04em] text-slate-100"
                    >
                      Weekly brief
                    </Link>
                  )}
                  <ThemeToggleButton className="min-h-[44px]" />
                </>
              ) : (
                <>
                  <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                  <ThemeToggleButton />
                </>
              )}
            </div>
          </div>

          <nav
            aria-label="Global navigation"
            className={`${isHomeBrief ? "border-t border-slate-800/65 pt-2" : ""}`}
          >
            <GlobalHeaderNavClient pathname={pathname} variant="compact" />
          </nav>
        </div>
      </div>
    </header>
  );
}
