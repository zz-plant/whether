"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  hasVisibleActiveNavLink,
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
  resolveReportHeaderNextStep,
} from "../../lib/navigation/globalHeader";
import { primaryNavigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
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
    return { href: "/resolve#toolkit-library", label: "Toolkits" };
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
  // Only where the nav row will not mark the route itself. Below `md` the nav
  // trigger always carries it, so this stays a desktop-only fallback.
  const fallbackRouteLabel = hasVisibleActiveNavLink(pathname)
    ? null
    : resolveGlobalHeaderRouteLabel(pathname);
  const isHomeBrief = pathname === "/";
  const reportHeaderAction = resolveReportHeaderNextStep(pathname);
  const reportHeaderUtilityAction = resolveReportHeaderUtilityAction(pathname);

  // Home brief: one band (brand · tabs · actions). The cadence control used to
  // live here and, below lg, on a second rail; it belongs to the brief, not to
  // the global header, and renders inside the page now. Below md the tabs are
  // the bottom bar, so the phone header is wordmark, route and actions.
  if (isHomeBrief) {
    return (
      <GlobalHeaderScrollWrapper>
        <div className="rounded-b-md border-b border-white/[0.10] bg-[var(--bg-body)]">
          <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-3">
            <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.08em] text-white/80 no-underline">
              Whether
            </Link>
            <span className="text-fluid-xs font-medium tracking-[0.04em] text-[var(--app-text-muted)] md:hidden">Weekly Brief</span>
            <GlobalHeaderNavClient pathname={pathname} />
            <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-sky-400">
              <GlobalHeaderActionsClient showPresentMode />
            </div>
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
              above it. One is enough — but "the nav names it" only holds for the
              six loop routes. On `/pricing`, `/about`, `/brief/<week>` and
              `/resources/...` nothing in the desktop nav is active, so the label
              comes back for exactly those. */}
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.08em] text-white no-underline">
              Whether
            </Link>
            {/* Desktop: only where no tab names the route. Phone: always, since
                the bottom bar shows three of the six loop routes. */}
            <span className={`truncate text-fluid-xs font-medium tracking-[0.04em] text-[var(--app-text-muted)] ${fallbackRouteLabel ? "" : "md:hidden"}`}>
              {fallbackRouteLabel ?? resolveGlobalHeaderRouteLabel(pathname)}
            </span>
          </div>

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

        {/* No vertical padding: the nav sets the band's height (h-9) so the
            active tab's underline lands on the band's own bottom edge. */}
        <div className="hidden items-stretch justify-between gap-2 border-t border-white/[0.05] px-3 md:flex">
          <GlobalHeaderNavClient pathname={pathname} />
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
