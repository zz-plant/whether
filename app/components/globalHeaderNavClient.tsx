"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Search, Share2 } from "lucide-react";
import { openShareRail } from "./globalShareRail";
import { ThemeToggleButton } from "./themeToggleButton";
import {
  findActivePage,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import {
  headerUtilityLinks,
  pagesInGroup,
  utilityLinks,
} from "../../lib/navigation/informationArchitecture";

type MobileNavContentProps = {
  navigationLinks?: GlobalHeaderNavigationLink[];
  currentPathname: string;
  onClose: () => void;
};

const SHEET_LINK_CLASS = "flex flex-col gap-0.5 rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-colors";
const sheetLinkTone = (isActive: boolean) =>
  isActive ? "bg-sky-500/14 text-sky-100 font-semibold" : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100";

/**
 * The phone's More sheet: Search, share and theme, then each group with its
 * pages, then the utility links. The bottom bar carries the four groups; this is where a phone
 * reaches a group's other pages (Compare periods, the runway planner) and the
 * pages outside the groups.
 */
export function MobileNavContent({ navigationLinks: propLinks, currentPathname, onClose }: MobileNavContentProps) {
  const groups = propLinks ?? resolveGlobalHeaderNavigationLinks(currentPathname);
  const activePageKey = findActivePage(currentPathname)?.key;

  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-sm bg-slate-700" />
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            onClose();
            document.dispatchEvent(new CustomEvent("whether-open-command-palette"));
          }}
          className={`${SHEET_LINK_CLASS} w-full flex-row items-center gap-2 border border-slate-800/80 text-left ${sheetLinkTone(false)}`}
        >
          <Search aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>Search or jump to a page</span>
        </button>
        {/* The header's share and theme cells, for the phone's brief: below `sm`
            the home header trades its actions group for the stage and runway
            pills, which left the theme with no control on that page. */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              openShareRail();
            }}
            className={`${SHEET_LINK_CLASS} flex-1 flex-row items-center gap-2 border border-[color:var(--border-default)] text-left ${sheetLinkTone(false)}`}
          >
            <Share2 aria-hidden="true" size={16} strokeWidth={1.8} />
            <span>Share this page</span>
          </button>
          <ThemeToggleButton showLabel className="border border-[color:var(--border-default)] !bg-transparent text-slate-300" />
        </div>

        {groups.map((group) => (
          <div key={group.key}>
            <p className="px-4 type-eyebrow mb-1.5">{group.label}</p>
            <nav className="space-y-0.5" aria-label={`${group.label} pages`}>
              {pagesInGroup(group.key).map((page) => {
                const isActive = page.key === activePageKey;
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onClose}
                    className={`${SHEET_LINK_CLASS} ${sheetLinkTone(isActive)}`}
                  >
                    <span>{page.label}</span>
                    <span className="text-fluid-micro font-normal text-slate-400">{page.description}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="border-t border-slate-800/60 pt-3">
          <nav className="space-y-0.5" aria-label="More from Whether">
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
                    className={`${SHEET_LINK_CLASS} ${sheetLinkTone(isActive)}`}
                  >
                    <span>{link.label}</span>
                    <span className="text-fluid-micro font-normal text-slate-400">{link.description}</span>
                  </Link>
                );
              })}
          </nav>
        </div>
      </div>
    </div>
  );
}

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

/**
 * The header's two rows of words from `md`: the four groups as tabs, the active
 * one underlined, then the utility links in lighter type. Below `md` the bottom
 * tab bar carries the groups and its More sheet the rest.
 *
 * There is no More menu. It held nine links until 2026-10-08 — SaaS Multiples,
 * Compare periods, Share, API & MCP, Pricing, Calibration, Product writing,
 * Search and About — and where a page lives in the groups now, it is a sub-tab
 * of its group; About is a text link here, and /pricing redirects to it (the
 * paid tier was removed on 2026-10-14); Search is the ⌘K field.
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
      <nav aria-label="Primary" className="flex shrink-0 items-center gap-0.5">
        {groupLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive ? "page" : undefined}
            title={`${link.description} Press ${link.shortcut}.`}
            className={`group relative flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              link.isActive
                ? "text-white font-semibold"
                : "text-slate-400 font-medium hover:text-slate-100"
            }`}
          >
            <span>{link.label}</span>
            {/* The one-key jump, shown on hover. Out of flow, under the tab, so
                the transparent keycap takes no width beside its word. The
                breakpoint hide sits on a wrapper: `.weather-kbd` sets display
                from unlayered CSS, which would beat a `hidden` utility on the
                keycap itself. */}
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2.5 hidden -translate-x-1/2 lg:inline">
              <kbd
                aria-hidden="true"
                className="weather-kbd opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {link.shortcut}
              </kbd>
            </span>
            <span
              aria-hidden="true"
              className={`absolute inset-x-2.5 -bottom-[7px] h-0.5 rounded-full transition-colors ${
                link.isActive ? "bg-sky-400" : "bg-transparent group-hover:bg-slate-700"
              }`}
            />
          </Link>
        ))}
      </nav>
      <nav aria-label="Utility" className="flex shrink-0 items-center gap-0.5">
        {headerUtilityLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, resolvedPathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              title={link.description}
              className={`${link.header === "lg" ? "hidden lg:flex" : "flex"} min-h-11 items-center rounded-md px-2 py-1.5 text-fluid-xs no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                isActive ? "text-slate-100 font-semibold" : "text-slate-500 font-medium hover:text-slate-200"
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
