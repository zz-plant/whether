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
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";

export const reportHeaderNextStep = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/evidence", label: "Open evidence" };
  }

  if (pathname.startsWith("/evidence")) {
    return { href: "/planning", label: "Open planning" };
  }

  if (pathname.startsWith("/planning")) {
    return { href: "/resolve", label: "Resolve questions" };
  }

  if (pathname.startsWith("/resolve")) {
    return { href: "/trust", label: "Verify call" };
  }

  if (pathname.startsWith("/trust")) {
    return { href: "/", label: "Back to brief" };
  }

  return null;
};

export const resolveReportHeaderUtilityAction = (pathname: string) =>
  pathname === "/"
    ? { href: buildToolkitLibraryHref(), label: "Find a tool" }
    : { href: "/", label: "Weekly brief" };

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
  const reportHeaderAction = reportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);
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
                      href={reportHeaderUtilityAction.href}
                      className="weather-pill hidden min-h-[40px] items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-200 sm:inline-flex"
                    >
                      {reportHeaderUtilityAction.label}
                    </Link>
                  ) : (
                    <Link
                      href={reportHeaderUtilityAction.href}
                      className="weather-pill hidden min-h-[40px] items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-100 sm:inline-flex"
                    >
                      {reportHeaderUtilityAction.label}
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
            <nav aria-label="Workflow steps" className="flex items-center gap-1 overflow-x-auto py-1">
              {[1, 2, 3, 4, 5].map((step) => {
                const href = step === 1 ? "/" : step === 2 ? "/evidence" : step === 3 ? "/planning" : step === 4 ? "/resolve" : "/trust";
                const label = step === 1 ? "Brief" : step === 2 ? "Evidence" : step === 3 ? "Plan" : step === 4 ? "Resolve" : "Verify";
                const isActive = step === 1;
                return (
                  <Link
                    key={step}
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                      isActive
                        ? "border border-sky-400/60 bg-sky-400/10 text-sky-100"
                        : "border border-slate-700/50 text-slate-400 hover:border-slate-500/70 hover:text-slate-200"
                    }`}
                  >
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${isActive ? "bg-sky-400/30 text-sky-100" : "bg-slate-800 text-slate-500"}`}>{step}</span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
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
