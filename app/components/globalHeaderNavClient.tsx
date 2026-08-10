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
import {
  navigationLayers,
  utilityLinks,
  type UtilityLink,
} from "../../lib/navigation/informationArchitecture";

type MobileNavContentProps = {
  navigationLinks: GlobalHeaderNavigationLink[];
  currentPathname: string;
  onClose: () => void;
};

function SupportingLayerItem({
  link,
  currentPathname,
  onClose,
  depth,
}: {
  link: typeof navigationLayers[number];
  currentPathname: string;
  onClose: () => void;
  depth: number;
}) {
  const isActive = pathMatchesLink(link.href, currentPathname);
  const children = navigationLayers.filter((l) => l.parentKey === link.key);

  return (
    <>
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive ? "page" : undefined}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-colors ${
          isActive
            ? "bg-sky-500/14 text-sky-100 font-semibold"
            : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
        }`}
        style={{ paddingLeft: `${1 + depth * 0.75}rem` }}
      >
        {link.navLabel ?? link.label}
      </Link>
      {children.map((child) => (
        <SupportingLayerItem
          key={child.href}
          link={child}
          currentPathname={currentPathname}
          onClose={onClose}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function MobileNavContent({ navigationLinks, currentPathname, onClose }: MobileNavContentProps) {
  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-sm bg-slate-700" />
      <div className="space-y-4">
        <div>
          <p className="px-4 text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
            Operator Loop
          </p>
          <nav className="space-y-0.5" aria-label="Primary operator routes">
            {navigationLinks.map((link) => {
              const isActive = link.isActive;
              const supportingChildren = navigationLayers.filter((l) => l.parentKey === link.key);

              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
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
                  {supportingChildren.map((child) => (
                    <SupportingLayerItem
                      key={child.href}
                      link={child}
                      currentPathname={currentPathname}
                      onClose={onClose}
                      depth={1}
                    />
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800/60 pt-3">
          <p className="px-4 text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
            Resources & Framework
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
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-fluid-xs font-bold text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.2)] md:hidden focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="Open navigation"
      >
        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" aria-hidden="true" />
        <span>{activeRouteLabel}</span>
      </button>

      <nav aria-label="Primary" className="hidden md:flex items-center gap-1.5">
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-all duration-150 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              link.isActive
                ? "bg-sky-500/20 text-sky-100 font-bold border border-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
                : "text-slate-300 font-medium border border-transparent hover:border-slate-800 hover:bg-slate-800/60 hover:text-slate-100"
            }`}
          >
            {link.isActive ? (
              <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" aria-hidden="true" />
            ) : null}
            <span>{link.label}</span>
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-800" aria-hidden="true" />
        <Link
          href="/api-docs"
          aria-current={isApiActive ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-all duration-150 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-sky-400 ${
            isApiActive
              ? "bg-sky-500/20 text-sky-100 font-bold border border-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
              : "text-slate-300 font-medium border border-transparent hover:border-slate-800 hover:bg-slate-800/60 hover:text-slate-100"
          }`}
        >
          {isApiActive ? (
            <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" aria-hidden="true" />
          ) : null}
          <span>API</span>
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

