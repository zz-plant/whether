"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";

type GlobalHeaderNavClientProps = {
  pathname?: string;
  variant?: "default" | "compact";
};

function NavigationLinkCard({
  link,
  onIntent,
}: {
  link: GlobalHeaderNavigationLink;
  onIntent: (href: string) => void;
}) {
  const eyebrow = link.href === "/" ? "Start here" : "Support path";

  return (
    <li className="flex-shrink-0 sm:min-w-0">
      <Link
        href={link.href}
        aria-current={link.isActive ? "page" : undefined}
        title={link.boundary}
        onMouseEnter={() => onIntent(link.href)}
        onFocus={() => onIntent(link.href)}
        className={`weather-pill group inline-flex min-h-[78px] min-w-[148px] flex-col items-start justify-start rounded-[1.2rem] px-3.5 py-3.5 text-left transition-colors touch-manipulation sm:h-full sm:min-w-0 ${
          link.isActive
            ? "border-sky-300/80 bg-sky-500/18 text-sky-50 shadow-[0_18px_34px_-26px_rgba(56,189,248,0.46)]"
            : "text-slate-100 hover:border-amber-300/45"
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
        className={`inline-flex min-h-[40px] items-center justify-center rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
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

export function GlobalHeaderNavClient({
  pathname,
  variant = "default",
}: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const router = useRouter();
  const resolvedPathname = pathname ?? currentPathname;
  const navigationLinks = useMemo(() => resolveGlobalHeaderNavigationLinks(resolvedPathname), [resolvedPathname]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleIntentPrefetch = (href: string) => {
    router.prefetch(href as Route);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [resolvedPathname]);

  if (variant === "compact") {
    return (
      <nav aria-label="Primary routes">
        <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigationLinks.map((link) => (
            <CompactNavigationLink key={link.href} link={link} onIntent={handleIntentPrefetch} />
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
          {isMenuOpen ? "Hide sections" : "Browse sections"}
        </button>
      </div>
      <ul
        id="global-header-nav-list"
        className={`${isMenuOpen ? "flex" : "hidden"} gap-2 overflow-x-auto pb-1 pr-8 [-ms-overflow-style:auto] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pr-0 md:grid-cols-3 lg:grid-cols-5`}
      >
        {navigationLinks.map((link) => (
          <NavigationLinkCard key={link.href} link={link} onIntent={handleIntentPrefetch} />
        ))}
      </ul>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950 to-transparent sm:hidden ${
          isMenuOpen ? "block" : "hidden"
        }`}
      />
      <p className="pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:hidden">
        {isMenuOpen ? "Swipe for more sections →" : "Open sections to navigate →"}
      </p>
    </div>
  );
}
