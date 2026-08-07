"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
  resolveReportHeaderNextStep,
} from "../../lib/navigation/globalHeader";
import { primaryNavigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { CadenceSelector, ViewSelector } from "./cadenceSelector";
import { GlobalHeaderActionsClient } from "./globalHeaderActionsClient";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { GlobalHeaderScrollWrapper } from "./globalHeaderScrollWrapper";

// On the brief, the utility slot points at the toolkit library; on any other
// hub it links back to that hub's root using its canonical IA label.
export const resolveReportHeaderUtilityAction = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/resolve#toolkit-library", label: "Toolkits" };
  }

  const activeLayer = primaryNavigationLayers.find((layer) => pathMatchesLink(layer.href, pathname));
  return activeLayer
    ? { href: activeLayer.href, label: activeLayer.navLabel ?? activeLayer.label }
    : { href: "/", label: "Home" };
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
  const reportHeaderAction = resolveReportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);

  return (
    <GlobalHeaderScrollWrapper>
      <div className="rounded-b-md border-b border-white/[0.10] bg-[var(--bg-body)]">
        <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-3 sm:py-2">
          <div className="flex items-center gap-2">
            <Link href="/" className="shrink-0 font-display text-sm font-semibold tracking-[0.08em] text-white/80 no-underline">
              Whether
            </Link>
            <span className="hidden text-fluid-micro font-medium tracking-[0.04em] text-[var(--app-text-muted)] min-[360px]:inline sm:text-fluid-xs">
              {isHomeBrief ? "Weekly Brief" : routeLabel}
            </span>
          </div>

          <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2">
            {isReportRoute ? (
              <>
                {isHomeBrief ? (
                  <div className="hidden items-center justify-end gap-1.5 sm:flex">
                    <CadenceSelector />
                    <div className="flex items-center gap-1.5">
                      <ViewSelector />
                    </div>
                  </div>
                ) : (
                  <>
                    {reportHeaderAction ? (
                      <Link
                        href={reportHeaderAction.href}
                        className="weather-button-primary inline-flex min-h-[44px] sm:min-h-[36px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.08em] text-slate-100 sm:flex-none"
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
                <div className="flex items-center gap-1.5 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-sky-400">
                  <GlobalHeaderActionsClient />
                </div>
              </>
            ) : (
              <>
                <GlobalHeaderSearchForm className="grid grid-cols-[1fr_auto] w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                <GlobalHeaderActionsClient />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] px-3 py-1.5">
          <GlobalHeaderNavClient pathname={pathname} />
          {isHomeBrief ? (
            <div className="ml-auto flex min-w-0 items-center gap-1.5 overflow-x-auto sm:hidden">
              <CadenceSelector />
            </div>
          ) : null}
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
