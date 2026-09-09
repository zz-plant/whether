"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Drawer } from "@base-ui/react/drawer";
import {
  resolveGlobalHeaderLoopLinks,
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
          <p className="px-4 type-eyebrow mb-1.5">
            Product
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
          <p className="px-4 type-eyebrow mb-1.5">
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
  const loopLinks = useMemo(
    () => resolveGlobalHeaderLoopLinks(resolvedPathname),
    [resolvedPathname],
  );
  const activeRouteLabel = resolveGlobalHeaderRouteLabel(resolvedPathname);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMobile(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-fluid-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white md:hidden focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-label="Open navigation"
      >
        <MenuIcon className="size-4 text-slate-400" aria-hidden="true" />
        {/* Shown at every width now. The header used to print the route beside
            the wordmark as well, so hiding this below 400px cost nothing; with
            that span gone this is the only place the route names itself, and the
            width it freed pays for it. */}
        <span>{activeRouteLabel}</span>
      </button>

      {/* One primary destination and one disclosure, at every width above md.
          Supporting layers used to render here as `hidden lg:flex`, which made
          the one-screen cut true below 1024px and false above it: the IA marked
          six routes supporting, the desktop bar showed all six. They live in
          More now, above the utility links, so the bar carries the brief and
          nothing competes with it. */}
      <nav aria-label="Primary" className="hidden md:flex items-center gap-1.5">
        {loopLinks
          .filter((link) => link.tier === "primary")
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
              className={`flex items-center rounded-lg px-3 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                link.isActive
                  ? "bg-sky-500/20 text-sky-100 font-bold border border-sky-400/50"
                  : "text-slate-300 font-medium border border-transparent hover:border-slate-800 hover:bg-slate-800/60 hover:text-slate-100"
              }`}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        <span className="mx-1 h-4 w-px bg-slate-800" aria-hidden="true" />
        {/* Native details so it works without JS and costs nothing until
            opened. Two groups: the operator loop the IA demotes to supporting,
            then the utility links that were always here. */}
        <details className="group relative">
          <summary
            tabIndex={0}
            className="list-none cursor-pointer rounded-lg px-3 py-1.5 text-fluid-xs tracking-[0.02em] no-underline transition-colors duration-150 flex items-center gap-1 text-slate-300 font-medium border border-transparent hover:border-slate-800 hover:bg-slate-800/60 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400 [&::-webkit-details-marker]:hidden"
          >
            <span>Plan, Evidence &amp; more</span>
            <span aria-hidden="true" className="text-slate-500 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-800/70 bg-slate-950/95 p-1.5 shadow-xl backdrop-blur-lg">
            <p className="px-3 pb-1 pt-1.5 type-eyebrow text-slate-500">The weekly loop</p>
            {loopLinks
              .filter((link) => link.tier === "supporting")
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.isActive ? "page" : undefined}
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                  className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-fluid-xs no-underline transition-colors ${
                    link.isActive
                      ? "bg-sky-500/14 text-sky-100 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <span className="font-medium">{link.navLabel ?? link.label}</span>
                  <span className="text-fluid-micro text-slate-500">{link.description}</span>
                </Link>
              ))}
            <p className="mt-1.5 border-t border-slate-800/60 px-3 pb-1 pt-2.5 type-eyebrow text-slate-500">Tools &amp; reference</p>
            {utilityLinks.map((link: UtilityLink) => {
              const isActive = pathMatchesLink(link.href, resolvedPathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    // Close the disclosure after navigating.
                    const details = event.currentTarget.closest("details");
                    details?.removeAttribute("open");
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

