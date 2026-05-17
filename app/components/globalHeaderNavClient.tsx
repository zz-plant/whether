"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./uiIcons";
import {
  resolveGlobalHeaderRouteLabel,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";

type GlobalHeaderNavClientProps = {
  pathname?: string;
  variant?: "default" | "compact";
};

type GlobalHeaderNavRailProps = {
  navigationLinks: GlobalHeaderNavigationLink[];
  activeRouteLabel: string;
  variant?: "default" | "compact";
  onIntent: (href: string) => void;
};

const routePresentation = {
  "/": {
    eyebrow: "Read first",
    prompt: "This week’s call",
  },
  "/evidence": {
    eyebrow: "Challenge it",
    prompt: "Proof, drivers, & thresholds",
  },
  "/planning": {
    eyebrow: "Approve it",
    prompt: "Turn the call into a plan",
  },
  "/resolve": {
    eyebrow: "Close one gap",
    prompt: "Resolve one open question",
  },
  "/trust": {
    eyebrow: "Verify it",
    prompt: "Freshness, confidence, & sources",
  },
} as const;

function NavigationLinkCard({
  link,
  index,
  onIntent,
}: {
  link: GlobalHeaderNavigationLink;
  index: number;
  onIntent: (href: string) => void;
}) {
  const presentation = routePresentation[link.href as keyof typeof routePresentation] ?? {
    eyebrow: "Open when needed",
    prompt: link.description,
  };

  return (
    <li className="flex-shrink-0 sm:min-w-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        title={link.boundary}
        onMouseEnter={() => onIntent(link.href)}
        onFocus={() => onIntent(link.href)}
        className={`weather-route-card group inline-flex min-h-[72px] min-w-[148px] flex-col items-start justify-start gap-1.5 px-3.5 py-3 text-left no-underline sm:h-full sm:min-w-0 ${
          link.isActive
            ? "border-sky-300/80 bg-sky-500/18 text-sky-50 shadow-[0_18px_34px_-26px_rgba(56,189,248,0.46)]"
            : "text-slate-100"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-300/90">
            {presentation.eyebrow}
          </span>
          <span className="weather-nav-card-index" aria-hidden="true">
            {index + 1}
          </span>
        </div>
        <span className="mt-1 font-[family:var(--weather-font-display)] text-sm font-semibold tracking-[-0.02em] sm:text-[1.02rem]">
          {link.label}
        </span>
        <span className="text-fluid-xs font-medium leading-relaxed text-slate-200/90">
          {presentation.prompt}
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
  return (
    <li className="flex-shrink-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        onMouseEnter={() => onIntent(link.href)}
        onFocus={() => onIntent(link.href)}
        title={link.description}
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-fluid-micro font-medium tracking-[0.01em] no-underline transition-colors ${
          link.isActive
            ? "border-slate-700/80 bg-slate-900/80 text-slate-50"
            : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-950/60 hover:text-slate-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${link.isActive ? "bg-sky-300" : "bg-slate-600"}`}
        />
        <span>
          {link.label}
        </span>
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
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        className="weather-button inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-0 py-0 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        aria-label="Next surface"
        disabled={!canScrollNext}
        onClick={() => scrollRail(1)}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <nav aria-label="Primary routes">
        <ul
          ref={railRef}
          className="weather-nav-rail flex gap-1.5 overflow-x-auto pb-1 sm:scroll-smooth sm:pr-3 sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
        >
          {navigationLinks.map((link) => (
            <CompactNavigationLink key={link.href} link={link} onIntent={onIntent} />
          ))}
        </ul>
      </nav>
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
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
            Navigation
          </p>
          <p className="truncate text-fluid-sm font-medium text-slate-200">
            {activeRouteLabel}
          </p>
          <p className="pt-1 text-fluid-xs leading-relaxed text-slate-400">
            {hasScrollableOverflow
              ? isMenuOpen
                ? `${activeLink?.label ?? "Weekly Brief"} is active. Swipe or use the arrows to move between the main pages.`
                : "Open navigation to move between the main pages."
              : "All main pages are visible once navigation is open."}
          </p>
        </div>
        {hasScrollableOverflow ? controls : null}
      </div>
      <ul
        id="global-header-nav-list"
        ref={railRef}
        className={`${isMenuOpen ? "flex" : "hidden"} weather-nav-rail gap-2 overflow-x-auto scroll-smooth pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pr-0 md:grid-cols-3 lg:grid-cols-5`}
      >
        {navigationLinks.map((link, index) => (
          <NavigationLinkCard
            key={link.href}
            link={link}
            index={index}
            onIntent={onIntent}
          />
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
}: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const router = useRouter();
  const resolvedPathname = pathname ?? currentPathname;

  const navigationLinks = useMemo(
    () => resolveGlobalHeaderNavigationLinks(resolvedPathname),
    [resolvedPathname],
  );
  const activeRouteLabel = resolveGlobalHeaderRouteLabel(resolvedPathname);

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
