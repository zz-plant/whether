"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Menu, Search, Share2 } from "lucide-react";
import {
  hasVisibleActiveNavLink,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { useHydrated } from "./browserSource";
import { GlobalHeaderActionsClient } from "./globalHeaderActionsClient";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderScrollWrapper } from "./globalHeaderScrollWrapper";
import { openShareRail } from "./globalShareRail";
import { RunwayServerSync } from "./RunwayServerSync";
import {
  MASTHEAD_DATE_IN_WORDS,
  MASTHEAD_SITE_HOST,
  MastheadSectionJumper,
  useMastheadReading,
} from "./runningHead";
import { useScrollDirection } from "./useScrollDirection";

type GlobalHeaderRouteGateProps = {
  initialPathname?: string;
};

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const subscribeToDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readIsDesktop = () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
const serverIsDesktop = () => true;

/**
 * Single morphing sticky masthead across desktop and mobile.
 *
 * Replaces the old two-bar stack (`GlobalHeader` hiding/returning + separate fixed
 * `RunningHead` sliding beneath it, which created 84px–128px of stacked chrome on
 * scroll-up). One 48px bar stays anchored at the top:
 *
 * - At top of page: Brand + 4 primary groups (with hover/click sibling popovers) +
 *   Forecast ink actions on desktop; Brand + Search + Share on EVERY mobile route
 *   (including `/`).
 * - Scrolled past the hero/intro:
 *   - Desktop scroll-down morphs in place into the live reading context (condition,
 *     tension, date, current section, address, and a 1-click Menu button to reveal
 *     full nav in place). Desktop scroll-up swaps back to full nav in the same 48px slot.
 *   - Mobile stays in reading mode past the hero (since `MobileTabBar` already owns
 *     bottom site nav), exposing a tappable section jumper (`MastheadSectionJumper`)
 *     that replaces the redundant sticky mobile chip scroller.
 */
export function GlobalHeaderRouteGate({ initialPathname = "/" }: GlobalHeaderRouteGateProps) {
  const currentPathname = normalizePathname(usePathname() ?? initialPathname);
  const hydrated = useHydrated();
  const pathname = hydrated ? currentPathname : normalizePathname(initialPathname);
  const isDesktop = useSyncExternalStore(subscribeToDesktop, readIsDesktop, serverIsDesktop);

  const { direction, isPastThreshold } = useScrollDirection();
  const { facts, section, sections, sectionStep, pastHero } = useMastheadReading(pathname);
  const [navOverride, setNavOverride] = useState<{ path: string; pinned: boolean }>({
    path: pathname,
    pinned: false,
  });

  const navPinned = navOverride.path === pathname && navOverride.pinned && direction !== "down";

  const isHomeBrief = pathname === "/";
  const fallbackRouteLabel = hasVisibleActiveNavLink(pathname)
    ? null
    : resolveGlobalHeaderRouteLabel(pathname);
  const sublabel = fallbackRouteLabel ?? resolveGlobalHeaderRouteLabel(pathname);

  const readingMode =
    hydrated &&
    pastHero &&
    facts !== null &&
    (isDesktop ? direction === "down" && !navPinned : true);

  const showPhoneCallLine = !isDesktop && readingMode && Boolean(facts?.call);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--top-chrome-height",
      showPhoneCallLine ? "4.75rem" : "3rem",
    );
  }, [showPhoneCallLine]);

  const place = section ?? facts?.title ?? null;
  const address = `${MASTHEAD_SITE_HOST}${pathname && pathname !== "/" ? pathname : ""}`;
  const phoneDate = facts?.date?.match(MASTHEAD_DATE_IN_WORDS)?.[0] ?? null;

  return (
    <GlobalHeaderScrollWrapper
      scrolled={hydrated && (isPastThreshold || pastHero)}
      mode={readingMode ? "reading" : "nav"}
      regime={facts?.regime ?? null}
    >
      {/* Every route has the header, so the runway band's one re-render
          listener lives here rather than beside any one control. */}
      <RunwayServerSync />

      {readingMode && facts ? (
        <div data-running-head>
          <div className="mx-auto flex h-12 max-w-[96rem] items-center justify-between gap-2 px-4 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-fluid-nano leading-none text-[var(--app-text-muted)]">
              <Link
                href="/"
                aria-label="Whether home"
                className="weather-focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-1 text-[var(--app-text)] no-underline hover:bg-[var(--bg-nested)]"
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M2 14c3-5 6-5 9 0s6 5 9 0" />
                </svg>
                <span className="font-[family-name:var(--font-display)] text-sm font-extrabold tracking-[-0.01em] max-sm:hidden">
                  Whether
                </span>
              </Link>

              {facts.condition ? (
                <span
                  className="type-stamp shrink-0 font-semibold"
                  style={{ color: "var(--regime-ink)" }}
                >
                  {facts.condition}
                </span>
              ) : null}

              {facts.tension ? (
                <span
                  className={`shrink-0 font-semibold tabular-nums max-sm:hidden ${
                    facts.tensionNear ? "weather-caveat-mark text-caveat-fg" : "text-[var(--app-text)]"
                  }`}
                >
                  {facts.tension}
                </span>
              ) : null}

              {facts.date ? (
                <span className="shrink-0 tabular-nums">
                  {phoneDate && phoneDate !== facts.date ? (
                    <>
                      <span className="sm:hidden">{phoneDate}</span>
                      <span className="max-sm:hidden">{facts.date}</span>
                    </>
                  ) : (
                    facts.date
                  )}
                </span>
              ) : null}

              {place ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span aria-hidden="true" className="text-[var(--border-strong)]">
                    /
                  </span>
                  {!isDesktop && sections.length >= 2 ? (
                    <MastheadSectionJumper currentLabel={place} sections={sections} />
                  ) : (
                    <span className="min-w-0 truncate text-[var(--app-text-secondary)]">
                      {facts.call ? (
                        <span className="font-medium text-[var(--app-text)] max-md:hidden">
                          {facts.call} &middot;{" "}
                        </span>
                      ) : facts.title && place !== facts.title ? (
                        <span className="max-md:hidden">{facts.title} &middot; </span>
                      ) : null}
                      {place}
                      {sectionStep ? (
                        <span
                          className="ml-1.5 tabular-nums text-[var(--app-text-muted)] max-md:hidden"
                          data-running-head-step
                        >
                          ({sectionStep})
                        </span>
                      ) : null}
                    </span>
                  )}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <span
                aria-hidden="true"
                className="mr-2 hidden text-fluid-nano text-[var(--app-text-muted)] xl:inline"
              >
                {address}
              </span>
              <button
                type="button"
                onClick={() => setNavOverride({ path: pathname, pinned: true })}
                className="weather-focus-ring hidden min-h-9 items-center gap-1.5 rounded-lg px-2 text-fluid-nano font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)] md:inline-flex"
                aria-label="Show navigation"
                title="Show site navigation"
              >
                <Menu aria-hidden="true" size={14} strokeWidth={1.9} />
                <span>Nav</span>
              </button>
              <button
                type="button"
                onClick={() => document.dispatchEvent(new CustomEvent("whether-open-command-palette"))}
                className="weather-focus-ring inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]"
                aria-label="Search"
                title="Search or jump to… ⌘K"
              >
                <Search aria-hidden="true" size={15} strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={openShareRail}
                className="weather-focus-ring inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]"
                aria-label="Share this page"
                title="Share this page ⇧S"
              >
                <Share2 aria-hidden="true" size={15} strokeWidth={1.9} />
              </button>
            </div>
          </div>

          {showPhoneCallLine && facts.call ? (
            <div className="mx-auto flex h-7 max-w-[96rem] items-center gap-2 border-t border-[color:var(--border-faint)] px-4 text-fluid-sm md:hidden">
              <span aria-hidden="true" className="min-w-0 flex-1 truncate font-medium text-[var(--app-text)]">
                {facts.call}
              </span>
              {facts.jump ? (
                <a
                  href={facts.jump.href}
                  className="weather-focus-ring weather-hit inline-flex shrink-0 items-center font-medium text-[var(--app-text)] underline decoration-[var(--border-strong)] underline-offset-4"
                >
                  {facts.jump.label}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto flex h-12 max-w-[96rem] items-center justify-between gap-2 px-4 sm:gap-3 md:px-6">
          <Link
            href="/"
            className="weather-hit-box weather-focus-ring flex min-w-0 items-center gap-2 rounded-md no-underline"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--app-text)]"
            >
              <path d="M2 14c3-5 6-5 9 0s6 5 9 0" />
              <circle cx="5" cy="11" r="1.5" fill="currentColor" />
              <circle cx="19" cy="11" r="1.5" fill="currentColor" />
            </svg>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-[family-name:var(--font-display)] text-[1.0625rem] font-extrabold leading-none tracking-[-0.01em] text-[var(--app-text)]">
                Whether
              </span>
              <span
                className={`truncate text-fluid-nano font-medium text-[var(--app-text-muted)] ${
                  fallbackRouteLabel ? "" : "md:hidden"
                }`}
              >
                {sublabel}
              </span>
            </div>
          </Link>

          <GlobalHeaderNavClient pathname={pathname} />

          <GlobalHeaderActionsClient showPresentMode={isHomeBrief} />
        </div>
      )}
    </GlobalHeaderScrollWrapper>
  );
}
