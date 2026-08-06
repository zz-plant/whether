"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import {
  resolveGlobalHeaderRouteLabel,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

const RESOURCE_LINKS = [
  { href: "/api-docs", label: "API Docs" },
  { href: "/threshold", label: "Framework" },
  { href: "/template", label: "Template" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
] as const;

export function MobileNavContent({
  navigationLinks,
  currentPathname,
  onClose,
}: {
  navigationLinks: GlobalHeaderNavigationLink[];
  currentPathname: string;
  onClose: () => void;
}) {
  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-sm bg-slate-700" />
      <div className="space-y-4">
        <div>
          <p className="px-4 text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
            Operator Loop
          </p>
          <nav className="space-y-0.5" aria-label="Primary operator routes">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.isActive ? "page" : undefined}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-colors ${
                  link.isActive
                    ? "bg-sky-500/14 text-sky-100 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-800/60 pt-3">
          <p className="px-4 text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
            Resources & Framework
          </p>
          <nav className="space-y-0.5" aria-label="Resources and documentation">
            {RESOURCE_LINKS.map((link) => {
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

export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const resolvedPathname = pathname ?? currentPathname;
  const [showMobile, setShowMobile] = useState(false);

  const navigationLinks = useMemo(
    () => resolveGlobalHeaderNavigationLinks(resolvedPathname),
    [resolvedPathname],
  );
  const activeRouteLabel = resolveGlobalHeaderRouteLabel(resolvedPathname);
  const isApiActive = pathMatchesLink("/api-docs", resolvedPathname);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMobile(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-fluid-xs font-semibold text-slate-200 transition-colors hover:border-slate-700 hover:text-white md:hidden focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="Open navigation"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
        {activeRouteLabel}
      </button>

      <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5">
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-fluid-xs font-medium tracking-[0.02em] no-underline transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
              link.isActive
                ? "bg-sky-500/14 text-sky-100 font-semibold"
                : "text-slate-300 hover:bg-slate-800/40 hover:text-slate-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-700/60" aria-hidden="true" />
        <Link
          href="/api-docs"
          aria-current={isApiActive ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-fluid-xs font-medium tracking-[0.02em] no-underline transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
            isApiActive
              ? "bg-sky-500/14 text-sky-100 font-semibold"
              : "text-slate-300 hover:bg-slate-800/40 hover:text-slate-100"
          }`}
        >
          API
        </Link>
      </nav>

      <Drawer.Root open={showMobile} onOpenChange={setShowMobile}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-lg md:hidden">
            <MobileNavContent navigationLinks={navigationLinks} currentPathname={resolvedPathname} onClose={() => setShowMobile(false)} />
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

