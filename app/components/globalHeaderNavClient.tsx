"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Share2 } from "lucide-react";
import { openShareRail } from "./globalShareRail";
import { CloseIcon } from "./uiIcons";
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
 * four groups' pages (no multi-paragraph wall of descriptions), and utility links.
 */
export function MobileNavContent({ navigationLinks: propLinks, currentPathname, onClose }: MobileNavContentProps) {
  const groups = propLinks ?? resolveGlobalHeaderNavigationLinks(currentPathname);
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
 * One desktop primary group tab + its anchored sibling submenu (`popover="auto"`).
 *
 * Follows modern site-navigation conventions:
 * - Links stay in the Tab order; no ARIA `role="menu"` or `aria-haspopup`.
 * - Hovering with a fine pointer previews sibling pages via `showPopover({ source })`;
 *   clicking the chevron trigger pins it open; leaving focus closes it cleanly.
 * - Anchored natively inside `@supports (position-area: block-end)`, with a
 *   `getBoundingClientRect()` fixed fallback for browsers without Anchor Positioning.
 */
function DesktopNavGroupItem({
  group,
  activePageKey,
}: {
  group: GlobalHeaderNavigationLink;
  activePageKey: string | undefined;
}) {
  /* The id is the group's, not `useId`'s. Next's `Link` consumes a `useId` on the
     client and not on the server, so every `useId` after a link shifted by one on
     hydration and the nav's `popoverTarget` / `aria-controls` / `id` disagreed —
     React logged "a tree hydrated but some attributes … didn't match" on every
     page (2026-11-22). One group renders once per header, so the key is unique. */
  const submenuId = `nav-group-${group.key}`;
  const itemRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hoverPreviewRef = useRef(false);
  const [open, setOpen] = useState(false);

  const pages = useMemo(() => pagesInGroup(group.key), [group.key]);
  const hasSubmenu = pages.length > 1 || group.crossLinks.length > 0;

  const positionFallback = useCallback(() => {
    const item = itemRef.current;
    const submenu = submenuRef.current;
    if (!item || !submenu) return;
    if (typeof CSS !== "undefined" && CSS.supports("position-area", "block-end")) return;
    const itemRect = item.getBoundingClientRect();
    const popRect = submenu.getBoundingClientRect();
    const margin = 8;
    const below = itemRect.bottom + 6;
    const top =
      below + popRect.height > window.innerHeight - margin
        ? Math.max(margin, itemRect.top - popRect.height - 6)
        : below;
    const left = Math.max(margin, Math.min(itemRect.left, window.innerWidth - popRect.width - margin));
    submenu.style.top = `${top}px`;
    submenu.style.left = `${left}px`;
  }, []);

  useEffect(() => {
    const submenu = submenuRef.current;
    if (!submenu) return;
    const onToggle = (event: Event) => {
      const nextOpen = Reflect.get(event, "newState") === "open";
      setOpen(nextOpen);
      if (nextOpen) positionFallback();
      else hoverPreviewRef.current = false;
    };
    submenu.addEventListener("toggle", onToggle);
    return () => submenu.removeEventListener("toggle", onToggle);
  }, [positionFallback]);

  const closeSubmenu = useCallback(() => {
    const submenu = submenuRef.current;
    hoverPreviewRef.current = false;
    if (!submenu || typeof submenu.hidePopover !== "function") return;
    try {
      if (submenu.matches(":popover-open")) submenu.hidePopover();
    } catch {
      // Ignore when unsupported or detached.
    }
  }, []);

  useEffect(() => {
    const item = itemRef.current;
    if (!item || !hasSubmenu) return;

    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (typeof window === "undefined" || !window.matchMedia("(hover: hover)").matches) return;
      const submenu = submenuRef.current;
      const trigger = triggerRef.current;
      if (!submenu || typeof submenu.showPopover !== "function") return;
      try {
        if (!submenu.matches(":popover-open")) {
          hoverPreviewRef.current = true;
          if (trigger) submenu.showPopover({ source: trigger });
          else submenu.showPopover();
        }
      } catch {
        // Fallback for older browsers whose showPopover ignores the options object.
        try {
          if (!submenu.matches(":popover-open")) {
            hoverPreviewRef.current = true;
            submenu.showPopover();
          }
        } catch {
          // Ignore if Popover API is unavailable.
        }
      }
    };

    const onPointerLeave = () => {
      if (!hoverPreviewRef.current) return;
      closeSubmenu();
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && item.contains(next)) return;
      closeSubmenu();
    };

    item.addEventListener("pointerenter", onPointerEnter);
    item.addEventListener("pointerleave", onPointerLeave);
    item.addEventListener("focusout", onFocusOut);
    return () => {
      item.removeEventListener("pointerenter", onPointerEnter);
      item.removeEventListener("pointerleave", onPointerLeave);
      item.removeEventListener("focusout", onFocusOut);
    };
  }, [hasSubmenu, closeSubmenu]);

  const handleTriggerClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (hoverPreviewRef.current) {
      /* Clicking while hover-previewing pins the submenu open instead of closing it. */
      hoverPreviewRef.current = false;
      event.preventDefault();
    }
  }, []);

  return (
    <li ref={itemRef} className="relative flex items-center">
      <Link
        href={group.href}
        aria-current={group.isActive ? "page" : undefined}
        title={`${group.description} Press ${group.shortcut}.`}
        onClick={closeSubmenu}
        className={`group weather-focus-ring relative flex min-h-11 items-center rounded-md py-1.5 pl-2.5 pr-1 text-fluid-sm tracking-[0.01em] no-underline transition-colors duration-150 ${
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
      {hasSubmenu ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            popoverTarget={submenuId}
            aria-controls={submenuId}
            aria-expanded={open}
            aria-label={`${group.label} pages`}
            onClick={handleTriggerClick}
            className="weather-focus-ring inline-flex h-7 w-5 items-center justify-center rounded-md text-[var(--app-text-muted)] transition-colors hover:bg-[var(--bg-nested)] hover:text-[var(--app-text)]"
          >
            <ChevronDown
              aria-hidden="true"
              size={13}
              strokeWidth={1.9}
              className={`transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </button>
          <div
            ref={submenuRef}
            id={submenuId}
            popover="auto"
            className="site-nav-submenu"
            data-nav-submenu={group.key}
          >
            {pages.map((page) => {
              const isHub = page.href === group.href;
              const isPageActive = page.key === activePageKey;
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={closeSubmenu}
                  data-current-page={isPageActive ? "true" : undefined}
                  className="site-nav-popover-link"
                >
                  <span className="min-w-0 truncate">{page.label}</span>
                  {isHub ? (
                    <kbd aria-hidden="true" className="weather-kbd shrink-0">
                      {group.shortcut}
                    </kbd>
                  ) : page.placement === "secondary" ? (
                    <span className="shrink-0 text-fluid-nano font-normal text-[var(--app-text-muted)]">
                      Reference
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {group.crossLinks.length > 0 ? (
              <div className="mt-1 border-t border-[color:var(--border-subtle)] pt-1">
                {group.crossLinks.map((cross) => (
                  <Link
                    key={cross.href}
                    href={cross.href}
                    onClick={closeSubmenu}
                    className="site-nav-popover-link text-[var(--app-text-muted)]"
                  >
                    <span className="truncate text-fluid-nano">{cross.label}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </li>
  );
}

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

const utilityVisibilityClass = (breakpoint: "md" | "lg"): string =>
  breakpoint === "lg" ? "hidden lg:flex" : "flex";

/**
 * The desktop masthead's primary groups (with hover/click sibling popovers) and
 * quiet utility links, styled in Forecast's ink register.
 */
export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const resolvedPathname = pathname ?? currentPathname;

  const groupLinks = useMemo(
    () => resolveGlobalHeaderNavigationLinks(resolvedPathname),
    [resolvedPathname],
  );
  const activePageKey = useMemo(() => findActivePage(resolvedPathname)?.key, [resolvedPathname]);

  return (
    <div className="hidden min-w-0 flex-1 items-center justify-between gap-2 md:flex">
      <nav aria-label="Primary">
        <ul className="flex shrink-0 items-center gap-0.5 lg:gap-1">
          {groupLinks.map((group) => (
            <DesktopNavGroupItem
              key={group.href}
              group={group}
              activePageKey={activePageKey}
            />
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
