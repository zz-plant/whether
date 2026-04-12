"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  resolveGlobalHeaderRouteLabel,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import {
  resolvePrimaryNavigationSurfaceCue,
} from "../../lib/navigation/informationArchitecture";

type GlobalHeaderNavClientProps = {
  pathname?: string;
  variant?: "default" | "compact";
  deferPathResolution?: boolean;
};

type GlobalHeaderNavRailProps = {
  navigationLinks: GlobalHeaderNavigationLink[];
  activeRouteLabel: string;
  variant?: "default" | "compact";
  onIntent: (href: string) => void;
};

function NavigationLinkCard({
  link,
  onIntent,
}: {
  link: GlobalHeaderNavigationLink;
  onIntent: (href: string) => void;
}) {
  const eyebrow = link.href === "/" ? "This week" : "Open when needed";

  return (
    <li className="flex-shrink-0 sm:min-w-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        title={link.boundary}
        onMouseEnter={() => onIntent(link.href)}
        onFocus={() => onIntent(link.href)}
        className={`weather-route-card group inline-flex min-h-[78px] min-w-[148px] flex-col items-start justify-start gap-1.5 px-3.5 py-3.5 text-left sm:h-full sm:min-w-0 ${
          link.isActive
            ? "border-sky-300/80 bg-sky-500/18 text-sky-50 shadow-[0_18px_34px_-26px_rgba(56,189,248,0.46)]"
            : "text-slate-100"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300/90">
          {eyebrow}
        </span>
        <span className="mt-1 font-[family:var(--weather-font-display)] text-sm font-semibold tracking-[-0.02em] sm:text-[1.02rem]">
          {link.label}
        </span>
        <span
          className={`mt-2 hidden text-[11px] leading-relaxed xl:block ${
            link.isActive ? "text-sky-100/90" : "text-slate-400 group-hover:text-slate-300"
          }`}
        >
          {link.description}
        </span>
      </Link>
    </li>
  );
}

function CompactNavigationLink({
  link,
  onIntent,
}: {
  link: GlobalHeaderNavigationLink;
  onIntent: (href: string) => void;
}) {
  const isAnchor = link.href === "/";

  return (
    <li className="flex-shrink-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        onMouseEnter={() => onIntent(link.href)}
        onFocus={() => onIntent(link.href)}
        className={`weather-pill inline-flex min-h-[42px] items-center justify-center px-3.5 py-2 text-xs font-semibold tracking-[0.08em] touch-manipulation ${
          link.isActive
            ? "border-sky-300/80 bg-sky-500/20 text-sky-50"
            : isAnchor
              ? "border-amber-300/45 bg-amber-400/10 text-amber-50 hover:border-amber-300/70"
              : "border-slate-700/80 bg-slate-950/65 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
        }`}
      >
        {link.label}
      </Link>
    </li>
  );
}

export function GlobalHeaderNavRail({
  navigationLinks,
  activeRouteLabel,
  variant = "default",
  onIntent,
}: GlobalHeaderNavRailProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(navigationLinks.length > 1);
  const railRef = useRef<HTMLUListElement | null>(null);
  const activeLink = navigationLinks.find((link) => link.isActive) ?? navigationLinks[0];
  const activeSurfaceCue = activeLink ? resolvePrimaryNavigationSurfaceCue(activeLink.href) : null;
  const hasScrollableOverflow = canScrollPrev || canScrollNext;

  useEffect(() => {
    if (variant === "default") {
      setIsMenuOpen(false);
    }
  }, [activeLink?.href, variant]);

  useEffect(() => {
    if (variant === "default" && !isMenuOpen) {
      setCanScrollPrev(false);
      setCanScrollNext(navigationLinks.length > 1);
      return;
    }

    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const syncRailState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setCanScrollPrev(rail.scrollLeft > 8);
      setCanScrollNext(maxScrollLeft - rail.scrollLeft > 8);
    };

    let frameId = 0;
    const handleScroll = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(syncRailState);
    };

    syncRailState();
    rail.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", syncRailState);

    return () => {
      rail.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", syncRailState);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isMenuOpen, navigationLinks.length, variant]);

  useEffect(() => {
    if (variant === "default" && !isMenuOpen) {
      return;
    }

    const rail = railRef.current;
    const activeItem = rail?.querySelector('[aria-current="page"]');
    if (!(activeItem instanceof HTMLElement)) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      activeItem.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [activeLink?.href, isMenuOpen, variant]);

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const step = Math.max(Math.round(rail.clientWidth * 0.82), 180);
    rail.scrollBy({
      left: direction * step,
      behavior: "smooth",
    });
  };

  const controls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="weather-button inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-0 py-0 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        aria-label="Previous surface"
        disabled={!canScrollPrev}
        onClick={() => scrollRail(-1)}
      >
        ←
      </button>
      <button
        type="button"
        className="weather-button inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-0 py-0 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        aria-label="Next surface"
        disabled={!canScrollNext}
        onClick={() => scrollRail(1)}
      >
        →
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Workspaces
          </p>
          <p className="truncate text-[13px] font-medium text-slate-200">
            {activeSurfaceCue ?? activeRouteLabel}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Swipe through the main workspaces. The weekly brief stays primary.
          </p>
        </div>
        <nav aria-label="Primary routes">
          <ul
            ref={railRef}
            className="flex gap-2 overflow-x-auto scroll-smooth pb-1 pr-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navigationLinks.map((link) => (
              <CompactNavigationLink key={link.href} link={link} onIntent={onIntent} />
            ))}
          </ul>
        </nav>
      </div>
    );
  }

  return (
    <div className="relative">
          <div className="mb-2 sm:hidden">
        <button
          type="button"
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 text-xs font-semibold tracking-[0.14em]"
          aria-controls="global-header-nav-list"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? "Close navigation" : "Open navigation"}
        </button>
      </div>
      <div className="mb-2 flex items-start justify-between gap-3 sm:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Navigation
          </p>
          <p className="truncate text-[13px] font-medium text-slate-200">
            {activeRouteLabel}
          </p>
          <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
            {hasScrollableOverflow
              ? isMenuOpen
                ? `${activeLink?.label ?? "Weekly Brief"} is active. Swipe or use the arrows to move between the main pages.`
                : "Open navigation, then swipe or use the arrows to move between the main pages."
              : "All main pages are visible once navigation is open."}
          </p>
        </div>
        {hasScrollableOverflow ? controls : null}
      </div>
      <ul
        id="global-header-nav-list"
        ref={railRef}
        className={`${isMenuOpen ? "flex" : "hidden"} gap-2 overflow-x-auto scroll-smooth pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pr-0 md:grid-cols-3 lg:grid-cols-5`}
      >
        {navigationLinks.map((link) => (
          <NavigationLinkCard key={link.href} link={link} onIntent={onIntent} />
        ))}
      </ul>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950 to-transparent sm:hidden ${
          isMenuOpen ? "block" : "hidden"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-950 to-transparent sm:hidden ${
          isMenuOpen ? "block" : "hidden"
        }`}
      />
    </div>
  );
}

export function GlobalHeaderNavClient({
  pathname,
  variant = "default",
  deferPathResolution = false,
}: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const livePathname = pathname ?? currentPathname;
  const resolvedPathname = deferPathResolution && !isHydrated ? null : livePathname;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navigationLinks = useMemo(
    () =>
      resolvedPathname
        ? resolveGlobalHeaderNavigationLinks(resolvedPathname)
        : resolveGlobalHeaderNavigationLinks("/").map((link) => ({
            ...link,
            isActive: false,
          })),
    [resolvedPathname],
  );
  const activeRouteLabel = resolvedPathname ? resolveGlobalHeaderRouteLabel(resolvedPathname) : "Report";

  const handleIntentPrefetch = (href: string) => {
    router.prefetch(href as Route);
  };

  return (
    <GlobalHeaderNavRail
      navigationLinks={navigationLinks}
      activeRouteLabel={activeRouteLabel}
      variant={variant}
      onIntent={handleIntentPrefetch}
    />
  );
}
