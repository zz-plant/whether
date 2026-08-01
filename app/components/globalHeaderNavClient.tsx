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

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

const STEP_ORDER = ["/", "/planning", "/#evidence"];

function MobileNavContent({
  navigationLinks,
  onClose,
}: {
  navigationLinks: GlobalHeaderNavigationLink[];
  onClose: () => void;
}) {
  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-4 h-1 w-10 rounded-sm bg-slate-700" />
      <nav className="space-y-1" aria-label="Primary routes">
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive ? "page" : undefined}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium no-underline transition-colors ${
              link.isActive ? "bg-sky-500/12 text-sky-100" : "text-slate-300 hover:bg-slate-800/50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
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
  const displayLinks = useMemo(
    () => navigationLinks.filter((link) => STEP_ORDER.includes(link.href)),
    [navigationLinks],
  );
  const activeRouteLabel = resolveGlobalHeaderRouteLabel(resolvedPathname);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMobile(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-sm border border-slate-800/60 px-3 py-1.5 text-fluid-xs font-semibold text-slate-300 md:hidden"
        aria-label="Open navigation"
      >
        {activeRouteLabel}
      </button>

      <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5">
        {displayLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.isActive ? "page" : undefined}
          className={`rounded-sm px-3 py-1.5 text-fluid-xs font-medium tracking-[0.02em] no-underline transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
            link.isActive
              ? "bg-sky-500/14 text-sky-100"
              : "text-white/60 hover:text-white/70"
          }`}
          >
            {link.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-700/60" aria-hidden="true" />
        <Link
          href="/api-docs"
          className="rounded-sm px-3 py-1.5 text-fluid-xs font-medium tracking-[0.02em] text-white/60 hover:text-white/70 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          API
        </Link>
      </nav>

      <Drawer.Root open={showMobile} onOpenChange={setShowMobile}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-lg md:hidden">
            <MobileNavContent navigationLinks={navigationLinks} onClose={() => setShowMobile(false)} />
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
