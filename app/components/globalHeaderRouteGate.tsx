"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Settings } from "lucide-react";
import { useScrollDirection } from "./useScrollDirection";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { GLOBAL_HEADER_BRAND_LINK_CLASSNAME } from "./globalHeaderShared";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { CadenceSelector, ViewSelector } from "./cadenceSelector";
import { ThemeToggleButton } from "./themeToggleButton";
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";
import { SettingsPanel } from "./settingsPanel";
import { ShareRail } from "./shareRail";
import { HistoryIcon } from "./uiIcons";

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
    ? { href: buildToolkitLibraryHref(), label: "Toolkits" }
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
  const isHomeBrief = pathname === "/" || pathname === "/v2";
  const routeLabel = isHomeBrief ? "Weekly brief" : resolveGlobalHeaderRouteLabel(pathname);
  const reportHeaderAction = reportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <header
      className={`mx-auto sticky top-0 z-50 w-full max-w-[96rem] px-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${atTop ? "" : "shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]"}`}
    >
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
                  <button
                    type="button"
                    onClick={() => setShowShare(true)}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/[0.08] px-3 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97]"
                    aria-label="Share brief"
                  >
                    Share
                  </button>
                  <Link
                    href="/history"
                    className="hidden sm:inline-flex min-h-[36px] items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] no-underline transition-colors active:scale-[0.97]"
                    aria-label="History"
                  >
                    <HistoryIcon />
                    <span className="ml-1.5">History</span>
                  </Link>
                  <Link
                    href="/resolve"
                    className="hidden sm:inline-flex min-h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                    aria-label="Search"
                  >
                    <Search aria-hidden="true" size={16} strokeWidth={1.8} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="hidden sm:inline-flex min-h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                    aria-label="Settings"
                  >
                    <Settings aria-hidden="true" size={16} strokeWidth={1.8} />
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
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2 lg:hidden">
            <GlobalHeaderNavClient pathname={pathname} />
          </div>
        </div>
    </header>
  );
}
