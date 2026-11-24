"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Home, LayoutGrid, Archive, BookOpen, Menu, ChevronUp } from "lucide-react";
import { pagesInGroup, type NavigationGroupKey } from "../../lib/navigation/informationArchitecture";
import {
  findActivePage,
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import { placePopoverElement } from "../../lib/navigation/popoverPlacement";
import { MobileNavContent } from "./globalHeaderNavClient";

const TAB_ICONS: Record<NavigationGroupKey, typeof Home> = {
  "this-week": Home,
  decide: LayoutGrid,
  record: Archive,
  guides: BookOpen,
};

/** Scroll distance that counts as a direction, so a jittery thumb does not flicker the bar. */
const SCROLL_INTENT_PX = 8;
/** Near the top the bar always shows: the page has not been read into yet. */
const SCROLL_REVEAL_TOP_PX = 96;

const TAB_CLASS =
  "weather-focus-ring flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-fluid-nano font-medium leading-none no-underline transition-colors";

/**
 * Active bottom-bar tab with a one-tap sibling switcher popover (`popover="auto"`).
 *
 * Tapping an inactive group tab navigates straight to its hub; tapping the active
 * tab opens a compact popover directly above the bar listing that group's 2–3 pages
 * so a reader can jump between Plan / Runway planner / SaaS multiples (or This week /
 * Why it changed / Can I trust this?) without scrolling to the top or opening the
 * full Menu drawer.
 */
function ActiveGroupTab({
  tab,
  activePageKey,
  onOpenChange,
}: {
  tab: GlobalHeaderNavigationLink;
  activePageKey: string | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  /* Keyed by the group, not `useId`: Next's `Link` consumes a `useId` on the client
     only, so an id derived from it shifts between server and client and the trigger's
     `popoverTarget` stops naming the popover (see `DesktopNavGroupItem`). One tab is
     active at a time, so the key is unique. */
  const popoverId = `mobile-tab-group-${tab.key}`;
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const Icon = TAB_ICONS[tab.key];
  const pages = useMemo(() => pagesInGroup(tab.key), [tab.key]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    /* Centred over the tab and clamped to the screen by script in every engine: a middle
       tab left CSS anchoring no area that fit, and WebKit ran the History list 40px off
       the right edge (`lib/navigation/popoverPlacement.ts`). */
    const place = () => {
      const trigger = triggerRef.current;
      if (trigger) placePopoverElement(trigger, popover, { side: "above", align: "center", gap: 8 });
    };
    const onToggle = (event: Event) => {
      const next = Reflect.get(event, "newState") === "open";
      setOpen(next);
      onOpenChange(next);
      if (next) {
        place();
        window.addEventListener("resize", place);
      } else {
        window.removeEventListener("resize", place);
      }
    };
    popover.addEventListener("toggle", onToggle);
    return () => {
      popover.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", place);
      onOpenChange(false);
    };
  }, [onOpenChange]);

  const closePopover = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover || typeof popover.hidePopover !== "function") return;
    try {
      if (popover.matches(":popover-open")) popover.hidePopover();
    } catch {
      // Ignore if unsupported or already closed.
    }
  }, []);

  if (pages.length < 2) {
    return (
      <Link
        href={tab.href}
        aria-current="page"
        className={`relative ${TAB_CLASS} font-semibold text-[var(--app-text)]`}
      >
        <span className="absolute top-0 h-0.5 w-8 bg-[var(--app-text)]" aria-hidden="true" />
        <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
        <span className="whitespace-nowrap">{tab.label}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={popoverId}
        aria-controls={popoverId}
        aria-expanded={open}
        aria-current="page"
        aria-label={`${tab.label}, current section — open ${tab.label} pages`}
        className={`relative ${TAB_CLASS} font-semibold text-[var(--app-text)]`}
      >
        <span className="absolute top-0 h-0.5 w-8 bg-[var(--app-text)]" aria-hidden="true" />
        <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
          <span>{tab.label}</span>
          <ChevronUp
            aria-hidden="true"
            size={11}
            strokeWidth={2.2}
            className={`text-[var(--app-text-muted)] transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        className="mobile-tab-submenu"
        data-mobile-group-menu={tab.key}
      >
        <ul className="flex flex-col gap-0.5">
          {pages.map((page) => {
            const isCurrent = page.key === activePageKey;
            return (
              <li key={page.href}>
                <Link
                  href={page.href}
                  data-current-page={isCurrent ? "true" : undefined}
                  onClick={closePopover}
                  className="site-nav-popover-link"
                >
                  <span className="truncate">{page.label}</span>
                  {isCurrent ? <span className="sr-only"> (current page)</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/**
 * The four groups, one thumb-tap away on a phone, in Forecast's ink register.
 *
 * - Inactive tabs navigate straight to their group hub.
 * - The active tab opens a compact popover for its sibling pages right above the bar.
 * - The hidden full-page horizontal swipe-to-switch-group listener is retired so
 *   charts, tables, and the Record Band scrubber never collide with route navigation.
 */
export function MobileTabBar({ pathname: propPathname }: { pathname?: string } = {}) {
  const hookPathname = usePathname() ?? "/";
  const pathname = normalizePathname(propPathname ?? hookPathname);
  const [showMore, setShowMore] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const tabs = useMemo(() => resolveGlobalHeaderNavigationLinks(pathname), [pathname]);
  const activePageKey = useMemo(() => findActivePage(pathname)?.key, [pathname]);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const atFoot = window.innerHeight + y >= document.documentElement.scrollHeight - SCROLL_INTENT_PX;
      if (y < SCROLL_REVEAL_TOP_PX || atFoot) {
        setScrolledAway(false);
        lastY = y;
        return;
      }
      if (Math.abs(y - lastY) < SCROLL_INTENT_PX) return;
      setScrolledAway(y > lastY);
      lastY = y;
    };
    const nav = navRef.current;
    const onFocusIn = () => setScrolledAway(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    nav?.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      nav?.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const hidden = scrolledAway && !showMore && !submenuOpen;

  return (
    <>
      <nav
        aria-label="Primary, mobile"
        data-testid="mobile-tab-bar"
        ref={navRef}
        data-scrolled-away={hidden ? "true" : undefined}
        className={`fixed inset-x-0 bottom-0 z-[var(--z-chrome)] border-t border-[color:var(--border-default)] bg-[var(--bg-body)] px-2 pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden print:hidden ${hidden ? "translate-y-full" : ""}`}
      >
        <ul className="flex items-stretch sm:mx-auto sm:max-w-xl">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.key];
            return (
              <li key={tab.key} className="flex flex-1">
                {tab.isActive ? (
                  <ActiveGroupTab
                    tab={tab}
                    activePageKey={activePageKey}
                    onOpenChange={setSubmenuOpen}
                  />
                ) : (
                  <Link
                    href={tab.href}
                    className={`relative ${TAB_CLASS} text-[var(--app-text-muted)] hover:text-[var(--app-text)]`}
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setShowMore(true)}
              aria-expanded={showMore}
              aria-label="Menu: search, every page and about"
              className={`relative ${TAB_CLASS} text-[var(--app-text-muted)] hover:text-[var(--app-text)]`}
            >
              <Menu aria-hidden="true" size={20} strokeWidth={1.8} />
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      <Drawer.Root open={showMore} onOpenChange={setShowMore}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm" />
          <Drawer.Viewport className="fixed inset-0 z-[var(--z-modal)] flex items-end md:hidden">
            <Drawer.Popup className="w-full max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] shadow-2xl">
              <MobileNavContent
                navigationLinks={tabs}
                currentPathname={pathname}
                onClose={() => setShowMore(false)}
              />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
