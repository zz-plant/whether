"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Search, Share2 } from "lucide-react";
import { openShareRail } from "./globalShareRail";
import { CloseIcon } from "./uiIcons";
import { ThemeToggleButton } from "./themeToggleButton";
import {
  findActivePage,
  resolveGlobalHeaderNavigationLinks,
  resolveNavigationGroupLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import {
  headerUtilityLinks,
  pagesInGroup,
  utilityLinks,
} from "../../lib/navigation/informationArchitecture";
import { CLOSE_CONTROL_CLASS } from "./ui/closeControl";

type MobileNavContentProps = {
  navigationLinks?: GlobalHeaderNavigationLink[];
  currentPathname: string;
  onClose: () => void;
};

const SHEET_CONTROL_CLASS =
  "weather-focus-ring flex min-h-11 items-center gap-2 rounded-lg border border-[color:var(--border-default)] px-3.5 py-2 text-fluid-sm font-medium text-[var(--app-text-secondary)] no-underline transition-colors hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]";

/**
 * The phone's Menu sheet: Search, Share + Theme, a compact 2-column grid of all
 * four groups' pages — Guides too, which has no tab in the bottom bar — (no
 * multi-paragraph wall of descriptions), and utility links.
 */
export function MobileNavContent({ navigationLinks: propLinks, currentPathname, onClose }: MobileNavContentProps) {
  const groups = propLinks ?? resolveNavigationGroupLinks(currentPathname);
  const activePageKey = findActivePage(currentPathname)?.key;

  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      {/* The grab handle says the sheet swipes away; the × says it closes, for a reader
          who does not know the gesture (2026-11-03). */}
      <div className="relative mb-3 flex h-8 items-center justify-center">
        <div className="h-1 w-10 rounded-sm bg-[color:var(--border-strong)]" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className={`${CLOSE_CONTROL_CLASS} absolute -right-2 top-1/2 -translate-y-1/2`}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            onClose();
            document.dispatchEvent(new CustomEvent("whether-open-command-palette"));
          }}
          className={`${SHEET_CONTROL_CLASS} w-full bg-[var(--bg-nested)] text-left`}
        >
          <Search aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>Search or jump to a page</span>
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              openShareRail();
            }}
            className={`${SHEET_CONTROL_CLASS} flex-1 text-left`}
          >
            <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
            <span>Share this page</span>
          </button>
          <ThemeToggleButton showLabel className={SHEET_CONTROL_CLASS} />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
          {groups.map((group) => (
            <div key={group.key} className="min-w-0">
              {/* The hub row leads each column and carries the group's name, so the
                  eyebrow that used to sit above it said "Plan" and then "Plan" again
                  (2026-11-22). Its `nav` label keeps the group audible. */}
              <nav className="space-y-0.5" aria-label={`${group.label} pages`}>
                {pagesInGroup(group.key).map((page) => {
                  const isActive = page.key === activePageKey;
                  const isHub = page.href === group.href;
                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onClose}
                      className={`weather-focus-ring flex min-h-11 items-center rounded-lg border-l-2 px-2.5 py-1.5 text-fluid-sm no-underline transition-colors ${
                        isActive
                          ? "border-[var(--app-text)] bg-[var(--bg-nested)] font-semibold text-[var(--app-text)]"
                          : `border-transparent ${isHub ? "font-semibold" : "font-medium"} text-[var(--app-text-secondary)] hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]`
                      }`}
                    >
                      <span className="truncate">{page.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-[color:var(--border-subtle)] pt-3">
          <p className="mb-1.5 px-2.5 type-eyebrow">More from Whether</p>
          <nav className="grid grid-cols-2 gap-1" aria-label="More from Whether">
            {utilityLinks
              .filter((link) => link.href !== "/search")
              .map((link) => {
                const isActive = pathMatchesLink(link.href, currentPathname);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onClose}
                    className={`weather-focus-ring flex min-h-11 items-center rounded-lg border-l-2 px-2.5 py-1.5 text-fluid-sm no-underline transition-colors ${
                      isActive
                        ? "border-[var(--app-text)] bg-[var(--bg-nested)] font-semibold text-[var(--app-text)]"
                        : "border-transparent font-medium text-[var(--app-text-muted)] hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>
      </div>
    </div>
  );
}

/**
 * One desktop primary group tab: a link to the group's hub.
 *
 * Each tab opened a submenu of the group's pages until 2026-11-25, on hover or from a
 * chevron beside it. The pages it listed are the sub-tab row under the header on every
 * grouped page, in the phone's Menu sheet, in the footer and in the palette, so the
 * submenu was a fifth way to the same links; with three groups of two or three pages it
 * went. The one-key jump stays in the tab's title and in the palette.
 */
function DesktopNavGroupItem({ group }: { group: GlobalHeaderNavigationLink }) {
  return (
    <li className="relative flex items-center">
      <Link
        href={group.href}
        aria-current={group.isActive ? "page" : undefined}
        title={`${group.description} Press ${group.shortcut}.`}
        className={`group weather-focus-ring relative flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-fluid-sm tracking-[0.01em] no-underline transition-colors duration-150 ${
          group.isActive
            ? "font-semibold text-[var(--app-text)]"
            : "font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        }`}
      >
        <span>{group.label}</span>
        <span
          aria-hidden="true"
          className={`absolute inset-x-2 -bottom-[5px] h-0.5 transition-colors ${
            group.isActive ? "bg-[var(--app-text)]" : "bg-transparent group-hover:bg-[var(--border-strong)]"
          }`}
        />
      </Link>
    </li>
  );
}

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

const utilityVisibilityClass = (breakpoint: "md" | "lg"): string =>
  breakpoint === "lg" ? "hidden lg:flex" : "flex";

/**
 * The desktop masthead's primary groups and
 * quiet utility links, styled in Forecast's ink register.
 */
export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const resolvedPathname = pathname ?? currentPathname;

  const groupLinks = useMemo(
    () => resolveGlobalHeaderNavigationLinks(resolvedPathname),
    [resolvedPathname],
  );
  return (
    <div className="hidden min-w-0 flex-1 items-center justify-between gap-2 md:flex">
      <nav aria-label="Primary">
        <ul className="flex shrink-0 items-center gap-0.5 lg:gap-1">
          {groupLinks.map((group) => (
            <DesktopNavGroupItem key={group.href} group={group} />
          ))}
        </ul>
      </nav>
      <nav aria-label="Utility" className="flex shrink-0 items-center gap-1">
        {headerUtilityLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, resolvedPathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              title={link.description}
              className={`weather-focus-ring ${utilityVisibilityClass(link.header)} min-h-11 items-center rounded-md px-2 py-1.5 text-fluid-sm no-underline transition-colors duration-150 ${
                isActive
                  ? "font-semibold text-[var(--app-text)]"
                  : "font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
