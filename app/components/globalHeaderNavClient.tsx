"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import {
  resolveGlobalHeaderLoopLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import {
  utilityLinks,
  type UtilityLink,
} from "../../lib/navigation/informationArchitecture";

type MobileNavContentProps = {
  navigationLinks?: GlobalHeaderNavigationLink[];
  loopLinks?: GlobalHeaderNavigationLink[];
  currentPathname: string;
  onClose: () => void;
};

export function MobileNavContent({ loopLinks: propLoopLinks, currentPathname, onClose }: MobileNavContentProps) {
  const items = propLoopLinks ?? resolveGlobalHeaderLoopLinks(currentPathname);

  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-sm bg-slate-700" />
      <div className="space-y-4">
        <div>
          <p className="px-4 type-eyebrow mb-1.5">
            Operator loop
          </p>
          <nav className="space-y-0.5" aria-label="Primary operator routes">
            {items.map((link) => {
              const isActive = link.isActive;

              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onClose}
                    className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? "bg-sky-500/14 text-sky-100 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.shortcut ? (
                      <kbd className="weather-kbd uppercase">{link.shortcut}</kbd>
                    ) : null}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800/60 pt-3">
          <p className="px-4 type-eyebrow mb-1.5">
            Tools & reference
          </p>
          <nav className="space-y-0.5" aria-label="Resources and documentation">
            {utilityLinks.map((link: UtilityLink) => {
              const isActive = pathMatchesLink(link.href, currentPathname);
              return (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-colors ${
                    isActive
                      ? "bg-sky-500/14 text-sky-100 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                  }`}
                >
                  {link.label}
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

export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const resolvedPathname = pathname ?? currentPathname;

  const loopLinks = useMemo(
    () => resolveGlobalHeaderLoopLinks(resolvedPathname),
    [resolvedPathname],
  );

  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (!details || !details.open) return;
      if (event.target instanceof Node && !details.contains(event.target)) {
        details.removeAttribute("open");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.removeAttribute("open");
        detailsRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* Six text tabs, the active one underlined. The loop used to sit inside a
     closed "Plan, Evidence & more" disclosure so that the bar carried only the
     brief; the cost was that the five surfaces the product is built around
     were invisible until a chevron was clicked. Six short words fit in a
     header at any desktop width. Below md the bottom tab bar carries them. */
  return (
    <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5">
      {loopLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.isActive ? "page" : undefined}
          title={link.shortcut ? `${link.navLabel ?? link.label} — press ${link.shortcut}` : undefined}
          className={`group relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-400 ${
            link.isActive
              ? "text-white font-semibold"
              : "text-slate-400 font-medium hover:text-slate-100"
          }`}
        >
          <span>{link.navLabel ?? link.label}</span>
          {/* The one-key jump, shown on hover the way Linear teaches its
              shortcuts: no help page needed to learn "p" opens Plan. The
              breakpoint hide sits on a wrapper: `.weather-kbd` sets display
              from unlayered CSS, which would beat a `hidden` utility on the
              keycap itself. */}
          {link.shortcut ? (
            <span className="hidden lg:inline">
              <kbd
                aria-hidden="true"
                className="weather-kbd opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {link.shortcut}
              </kbd>
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className={`absolute inset-x-2.5 -bottom-[7px] h-0.5 rounded-full transition-colors ${
              link.isActive ? "bg-sky-400" : "bg-transparent group-hover:bg-slate-700"
            }`}
          />
        </Link>
      ))}
      <span className="mx-1.5 h-4 w-px bg-slate-800" aria-hidden="true" />
      {/* Native details so it works without JS and costs nothing until
          opened. Utility links only: the loop is in the tabs now. */}
      <details ref={detailsRef} className="group relative">
        <summary
          tabIndex={0}
          className="list-none cursor-pointer rounded-md px-2.5 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-colors duration-150 flex items-center gap-1 text-slate-400 font-medium hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400 [&::-webkit-details-marker]:hidden"
        >
          <span>More</span>
          <span aria-hidden="true" className="text-slate-500 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-800/70 bg-slate-950/95 p-1.5 shadow-xl backdrop-blur-lg">
          <p className="px-3 pb-1 pt-1.5 type-eyebrow text-slate-500">Tools &amp; reference</p>
          {utilityLinks.map((link: UtilityLink) => {
            const isActive = pathMatchesLink(link.href, resolvedPathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  // Close the disclosure after navigating.
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
                className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-fluid-xs no-underline transition-colors ${
                  isActive
                    ? "bg-sky-500/14 text-sky-100 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <span className="font-medium">{link.label}</span>
                <span className="text-fluid-micro text-slate-500">{link.description}</span>
              </Link>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
