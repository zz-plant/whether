"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isReportShellRoute,
  normalizePathname,
  resolveReportHeaderNextStep,
} from "../../lib/navigation/globalHeader";
import { primaryNavigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { CadenceSelector } from "./cadenceSelector";
import { GlobalHeaderActionsClient } from "./globalHeaderActionsClient";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";
import { GlobalHeaderScrollWrapper } from "./globalHeaderScrollWrapper";

/**
 * The header's secondary destination, or null when there isn't a distinct one.
 *
 * `primaryNavigationLayers` holds exactly one layer — the weekly brief at `/` —
 * so on every report route this used to fall through to `{ href: "/", label:
 * "Home" }` and render a pill next to the `Weekly Brief` CTA, which
 * `resolveReportHeaderNextStep` also points at `/`. Two adjacent buttons, two
 * labels, one destination. A matching layer was no better: it would have linked
 * to the page the reader is already on.
 *
 * So the slot is now filled only when it names somewhere the primary action
 * does not, and the caller renders nothing otherwise.
 */
export const resolveReportHeaderUtilityAction = (pathname: string) => {
  if (pathname === "/") {
    return { href: "/answer#toolkit-library", label: "Toolkits" };
  }

  const activeLayer = primaryNavigationLayers.find((layer) => pathMatchesLink(layer.href, pathname));
  if (!activeLayer || pathMatchesLink(activeLayer.href, pathname)) {
    return null;
  }

  return { href: activeLayer.href, label: activeLayer.navLabel ?? activeLayer.label };
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
  const reportHeaderAction = resolveReportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);

  // Home brief: one band on lg+ (brand · nav · cadence/view/icons) so the shell
  // above the weekly call stays compressed. Below lg, cadence moves to a second
  // rail; below md the nav collapses into the drawer trigger.
  if (isHomeBrief) {
    return (
      <GlobalHeaderScrollWrapper>
        <div className="rounded-b-md border-b border-white/[0.10] bg-[var(--bg-body)]">
          {/* px-2 under 360px: the wordmark, the drawer trigger and four 44px
              controls leave no slack at that width, and the inset is the only
              thing here that can give without shrinking a touch target. */}
          <div className="flex items-center gap-1 min-[360px]:gap-2 px-2 min-[360px]:px-3 py-1.5 sm:gap-3">
            <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.08em] text-white/80 no-underline">
              Whether
            </Link>
            <GlobalHeaderNavClient pathname={pathname} />
            <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2">
              <div className="hidden items-center gap-1.5 lg:flex">
                <CadenceSelector />
              </div>
              <div className="flex items-center gap-1.5 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-sky-400">
                <GlobalHeaderActionsClient showPresentMode />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.05] px-3 py-1.5 lg:hidden">
            <CadenceSelector />
          </div>
        </div>
      </GlobalHeaderScrollWrapper>
    );
  }

  return (
    <GlobalHeaderScrollWrapper>
      <div className="rounded-b-md border-b border-white/[0.10] bg-[var(--bg-body)]">
        <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-3">
          {/* The route named itself three times here: this span, the nav
              trigger's label below `md`, and the active item in the nav row
              above it. One is enough, and it belongs next to the navigation
              that sets it rather than beside the brand. */}
          <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.08em] text-white no-underline">
            Whether
          </Link>

          <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2">
            {isReportRoute ? (
              <>
                {/* Inline from sm up. Below that it moves to the rail below,
                    for the same reason the search form did: a text CTA beside
                    four 44px icon buttons has a min-content width this row
                    cannot shrink below, so at 390px the document went to ~440px
                    and every report route scrolled sideways — against §VI. */}
                {reportHeaderAction ? (
                  <Link
                    href={reportHeaderAction.href}
                    className="weather-button-primary hidden sm:inline-flex sm:min-h-[36px] items-center justify-center px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.08em] text-slate-100 sm:flex-none"
                  >
                    {reportHeaderAction.label}
                  </Link>
                ) : null}
                {reportHeaderUtilityAction ? (
                  <Link
                    href={reportHeaderUtilityAction.href}
                    className="weather-pill hidden min-h-[34px] items-center justify-center px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.04em] text-slate-100 sm:inline-flex"
                  >
                    {reportHeaderUtilityAction.label}
                  </Link>
                ) : null}
                <div className="flex items-center gap-1.5 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-sky-400">
                  <GlobalHeaderActionsClient />
                </div>
              </>
            ) : (
              <>
                {/* Hidden below sm. The inline field's min-content width (a 13rem
                    input plus the Search button) cannot shrink, so on a 430px
                    viewport it forced the whole document to ~650px and the page
                    scrolled horizontally — against §VI. Search is not lost: the
                    magnifier in GlobalHeaderActionsClient opens the command
                    palette, which is how report routes have always offered it. */}
                <GlobalHeaderSearchForm className="hidden sm:grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                <GlobalHeaderActionsClient />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] px-3 py-1.5">
          <GlobalHeaderNavClient pathname={pathname} />
          {isReportRoute && reportHeaderAction ? (
            <Link
              href={reportHeaderAction.href}
              className="weather-button-primary inline-flex min-h-[44px] shrink-0 items-center justify-center px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.08em] text-slate-100 sm:hidden"
            >
              {reportHeaderAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
