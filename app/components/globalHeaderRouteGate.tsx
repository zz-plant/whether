"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useScrollDirection } from "./useScrollDirection";
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
import { SettingsPanel } from "./settingsPanel";
import { ShareRail } from "./shareRail";
import { HistoryIcon } from "./uiIcons";

export const reportHeaderNextStep = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/evidence", label: "Evidence" };
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
    ? { href: buildToolkitLibraryHref(), label: "Toolkits" }
    : { href: "/", label: "Weekly brief" };

type GlobalHeaderRouteGateProps = {
  initialPathname?: string;
};

export function GlobalHeaderRouteGate({ initialPathname = "/" }: GlobalHeaderRouteGateProps) {
  const currentPathname = normalizePathname(usePathname() ?? initialPathname);
  const [pathname, setPathname] = useState(() => normalizePathname(initialPathname));
  const { direction, isPastThreshold } = useScrollDirection();
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    setPathname(currentPathname);
  }, [currentPathname]);

  /* Hide header on scroll down past threshold, reveal on scroll up */
  useEffect(() => {
    if (!isPastThreshold) {
      setHidden(false);
      setAtTop(true);
      return;
    }
    setAtTop(false);
    setHidden(direction === "down");
  }, [direction, isPastThreshold]);

  const isReportRoute = isReportShellRoute(pathname);
  const isHomeBrief = pathname === "/";
  const routeLabel = isHomeBrief ? "Weekly brief" : resolveGlobalHeaderRouteLabel(pathname);
  const reportHeaderAction = reportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <header
      className={`mx-auto sticky top-0 z-50 w-full max-w-[96rem] px-3 pt-1 sm:px-5 sm:pt-1.5 lg:px-8 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${atTop ? "" : "shadow-[0_8px_20px_-16px_rgba(2,6,23,0.72)]"}`}
    >
      <div className="weather-appbar weather-topbar px-3 py-2 sm:px-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link href="/" className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}>
                  Whether
                </Link>
                <span className="weather-tag weather-tag-slate">
                  {isHomeBrief ? "Weekly Brief" : routeLabel}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {isReportRoute ? (
                <>
                  {reportHeaderAction ? (
                    <Link
                      href={reportHeaderAction.href}
                      className="weather-button-primary inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.08em] text-slate-100 sm:flex-none"
                    >
                      {reportHeaderAction.label}
                    </Link>
                  ) : null}
                  {isHomeBrief ? (
                    <Link
                      href={reportHeaderUtilityAction.href}
                      className="weather-pill hidden min-h-[34px] items-center justify-center rounded-full px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.04em] text-slate-200 sm:inline-flex"
                    >
                      {reportHeaderUtilityAction.label}
                    </Link>
                  ) : (
                    <Link
                      href={reportHeaderUtilityAction.href}
                      className="weather-pill hidden min-h-[34px] items-center justify-center rounded-full px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.04em] text-slate-100 sm:inline-flex"
                    >
                      {reportHeaderUtilityAction.label}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowShare(true)}
                    className="weather-button inline-flex min-h-[36px] items-center justify-center rounded-full px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.04em]"
                    aria-label="Share brief"
                  >
                    Share
                  </button>
                  <Link
                    href="/history"
                    className="weather-button hidden min-h-[36px] items-center justify-center rounded-full px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.04em] no-underline sm:inline-flex"
                    aria-label="History"
                  >
                    <HistoryIcon />
                    <span className="ml-1.5">History</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="weather-button hidden min-h-[36px] w-[36px] items-center justify-center rounded-full p-0 text-sm text-slate-200 sm:inline-flex"
                    aria-label="Settings"
                  >
                    <Settings aria-hidden="true" className="text-slate-100" size={18} strokeWidth={2.4} />
                  </button>
                  <ThemeToggleButton className="min-h-[36px]" />
                </>
              ) : (
                <>
                  <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                  <ThemeToggleButton />
                </>
              )}
              {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
              {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
            </div>
          </div>

          {/* Navigation — workflow stepper on desktop, sheet on mobile */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-800/65 pt-2 lg:hidden">
            <GlobalHeaderNavClient pathname={pathname} />
          </div>
        </div>
      </div>
    </header>
  );
}
