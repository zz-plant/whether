"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Home, LayoutGrid, FileText, Search, MoreHorizontal } from "lucide-react";
import {
  loopNavigationLayers,
  mobileTabLayers,
  type NavigationLayerKey,
} from "../../lib/navigation/informationArchitecture";
import {
  normalizePathname,
  resolveGlobalHeaderLoopLinks,
} from "../../lib/navigation/globalHeader";
import { MobileNavContent } from "./globalHeaderNavClient";

const TAB_ICONS: Record<NavigationLayerKey, typeof Home> = {
  "weekly-brief": Home,
  planning: LayoutGrid,
  signals: FileText,
  resolve: FileText,
  trust: FileText,
  history: FileText,
  compare: FileText,
};

const SWIPE_MIN_PX = 72;
/** Scroll distance that counts as a direction, so a jittery thumb does not flicker the bar. */
const SCROLL_INTENT_PX = 8;
/** Near the top the bar always shows: the page has not been read into yet. */
const SCROLL_REVEAL_TOP_PX = 96;

/**
 * Starts inside something that scrolls sideways, or on a control that owns
 * the gesture (the month scrubber, the brief's own cadence swipe).
 */
const startsInHorizontalOwner = (target: EventTarget | null): boolean => {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    if (node.getAttribute("role") === "slider") return true;
    if (node.hasAttribute("data-swipe-owner")) return true;
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = window.getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
};

const TAB_CLASS =
  "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-fluid-nano font-medium leading-none no-underline transition-colors focus-visible:outline-2 focus-visible:outline-sky-400";

/**
 * The loop, one thumb-tap away on a phone.
 *
 * The mobile header used to stack a hamburger sheet plus a second full row of
 * cadence tabs, and the loop the product is built around sat inside the sheet.
 * A fixed bottom bar is the native-app convention every phone user already
 * knows: Brief, Plan and Evidence as tabs, Search opening the palette (the one
 * list of every destination), and More opening the sheet for the rest.
 *
 * On report routes a horizontal swipe on the page moves to the neighbouring
 * loop tab, so the bar and the gesture agree. The brief keeps its own swipe,
 * which moves the month, and marks itself `data-swipe-owner`.
 */
export function MobileTabBar() {
  const pathname = normalizePathname(usePathname() ?? "/");
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [scrolledAway, setScrolledAway] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const loopLinks = useMemo(() => resolveGlobalHeaderLoopLinks(pathname), [pathname]);
  const tabs = useMemo(
    () => mobileTabLayers.map((layer) => ({ ...layer, isActive: loopLinks.find((l) => l.key === layer.key)?.isActive ?? false })),
    [loopLinks],
  );
  const activeInTabs = tabs.some((tab) => tab.isActive);
  const activeLoopLayer = loopLinks.find((link) => link.isActive);
  const moreIsActive = !activeInTabs && Boolean(activeLoopLayer);

  useEffect(() => {
    // The brief owns its swipe (it moves the month); every other loop route
    // moves along the loop. Neighbours come from the same ordered list the
    // tabs and the desktop row render.
    if (pathname === "/") return;
    const currentIndex = loopNavigationLayers.findIndex((layer) => loopLinks.find((l) => l.key === layer.key)?.isActive);
    if (currentIndex < 0) return;

    const onStart = (event: TouchEvent) => {
      if (startsInHorizontalOwner(event.target)) {
        touchStart.current = null;
        return;
      }
      const touch = event.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };
    const onEnd = (event: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const next = loopNavigationLayers[currentIndex + (dx < 0 ? 1 : -1)];
      if (next) router.push(next.href);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pathname, loopLinks, router]);

  useEffect(() => {
    // Out of the way while reading down, back on the first move up. A fixed bar
    // sits in every phone screenshot and cuts through whatever is behind it; a
    // reader scrolling down is reading, and one scrolling up is looking for it.
    // It returns at the foot of the page too, where there is nothing left to
    // read behind it. Plain scroll events, not rAF: the handler is two compares.
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
    // Keyboard focus brings it back: a tab stop inside a bar that is off the
    // screen is a focus ring nobody can see.
    const nav = navRef.current;
    const onFocusIn = () => setScrolledAway(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    nav?.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      nav?.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const hidden = scrolledAway && !showMore;

  return (
    <>
      <nav
        aria-label="Primary, mobile"
        data-testid="mobile-tab-bar"
        ref={navRef}
        data-scrolled-away={hidden ? "true" : undefined}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-default)] bg-[var(--bg-body)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden ${hidden ? "translate-y-full" : ""}`}
      >
        <ul className="flex items-stretch">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.key];
            return (
              <li key={tab.key} className="flex flex-1">
                <Link
                  href={tab.href}
                  aria-current={tab.isActive ? "page" : undefined}
                  className={`relative ${TAB_CLASS} ${tab.isActive ? "text-sky-300 font-semibold" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={tab.isActive ? 2.2 : 1.8} />
                  <span>{tab.navLabel ?? tab.label}</span>
                  {tab.isActive ? (
                    <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-sky-400" aria-hidden="true" />
                  ) : null}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("whether-open-command-palette"))}
              className={`${TAB_CLASS} text-slate-400 hover:text-slate-200`}
              aria-label="Search or jump to a page"
            >
              <Search aria-hidden="true" size={20} strokeWidth={1.8} />
              <span>Search</span>
            </button>
          </li>
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setShowMore(true)}
              aria-expanded={showMore}
              className={`relative ${TAB_CLASS} ${moreIsActive ? "text-sky-300 font-semibold" : "text-slate-400 hover:text-slate-200"}`}
            >
              <MoreHorizontal aria-hidden="true" size={20} strokeWidth={moreIsActive ? 2.2 : 1.8} />
              <span>{moreIsActive && activeLoopLayer ? (activeLoopLayer.navLabel ?? activeLoopLayer.label) : "More"}</span>
              {moreIsActive ? (
                <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-sky-400" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        </ul>
      </nav>

      <Drawer.Root open={showMore} onOpenChange={setShowMore}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          {/* Viewport is what gives the sheet its swipe-to-dismiss and scroll lock. */}
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end md:hidden">
            <Drawer.Popup className="w-full max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-lg">
              <MobileNavContent
                loopLinks={loopLinks}
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
