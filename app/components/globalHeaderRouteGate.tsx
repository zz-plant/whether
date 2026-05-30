"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { CadenceSelector, ViewSelector } from "./cadenceSelector";
import { ThemeToggleButton } from "./themeToggleButton";
import { GlobalHeaderScrollWrapper } from "./globalHeaderScrollWrapper";
import { GlobalHeaderActionsClient } from "./globalHeaderActionsClient";

export const reportHeaderNextStep = (pathname: string) => {
  if (pathname === "/" || pathname === "/v2") {
    return { href: "/evidence", label: "Evidence" };
  }

  if (pathname.startsWith("/evidence")) {
    return { href: "/planning", label: "Planning" };
  }

  if (pathname.startsWith("/planning")) {
    return { href: "/resolve", label: "Resolve" };
  }

  if (pathname.startsWith("/resolve")) {
    return { href: "/trust", label: "Readiness" };
  }

  if (pathname.startsWith("/trust")) {
    return { href: "/", label: "Brief" };
  }

  return null;
};

export const resolveReportHeaderUtilityAction = (pathname: string) =>
  pathname === "/" || pathname === "/v2"
    ? { href: "/v2", label: "Toolkits" }
    : pathname.startsWith("/evidence")
      ? { href: "/evidence", label: "Evidence" }
      : pathname.startsWith("/planning")
        ? { href: "/planning", label: "Plan" }
        : pathname.startsWith("/resolve")
          ? { href: "/resolve", label: "Resolve" }
          : pathname.startsWith("/trust")
            ? { href: "/trust", label: "Readiness" }
            : { href: "/", label: "Home" };

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
  const isHomeBrief = pathname === "/" || pathname === "/v2";
  const routeLabel = isHomeBrief ? "Weekly brief" : resolveGlobalHeaderRouteLabel(pathname);
  const reportHeaderAction = reportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);

  return (
    <GlobalHeaderScrollWrapper>
      <div className="border-b border-white/[0.06] bg-[var(--bg-body)]/95 rounded-b-lg">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-display text-sm font-semibold tracking-[0.08em] text-white/80 no-underline">
              Whether
            </Link>
            <span className="text-fluid-micro font-medium tracking-[0.04em] text-white/30">
              {isHomeBrief ? "Weekly Brief" : routeLabel}
            </span>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {isReportRoute ? (
              <>
                {isHomeBrief ? (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <CadenceSelector />
                    <ViewSelector />
                  </div>
                ) : (
                  <>
                    {reportHeaderAction ? (
                      <Link
                        href={reportHeaderAction.href}
                        className="weather-button-primary inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.08em] text-slate-100 sm:flex-none"
                      >
                        {reportHeaderAction.label}
                      </Link>
                    ) : null}
                    <Link
                      href={reportHeaderUtilityAction.href}
                      className="weather-pill hidden min-h-[34px] items-center justify-center rounded-full px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.04em] text-slate-100 sm:inline-flex"
                    >
                      {reportHeaderUtilityAction.label}
                    </Link>
                  </>
                )}
                <GlobalHeaderActionsClient />
              </>
            ) : (
              <>
                <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                <ThemeToggleButton />
              </>
            )}
          </div>
        </div>

        {/* Navigation — workflow stepper on desktop, sheet on mobile */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2 lg:hidden">
          <GlobalHeaderNavClient pathname={pathname} />
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
