"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReportSectionLink } from "./reportShellNavigation";
import { primaryNavigationLayers } from "../../lib/navigation/informationArchitecture";

function OutlineItem({
  href,
  label,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  const isHash = href.startsWith("#");
  const linkClass = `block rounded-md px-3 py-2 md:py-1.5 text-sm no-underline transition-colors min-h-[44px] md:min-h-0 flex items-center ${
    isActive
      ? "bg-sky-500/10 text-sky-100 font-medium"
      : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
  }`;

  if (isHash) {
    return (
      <a href={href} onClick={onClick} className={linkClass}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={linkClass}>
      {label}
    </Link>
  );
}

function SidebarContent({
  sectionLinks,
  onClose,
}: {
  sectionLinks: ReportSectionLink[];
  onClose?: () => void;
}) {
  const currentPathname = usePathname() ?? "/";
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    setPathname(currentPathname);
  }, [currentPathname]);

  return (
    <>
      <Link
        href="/"
        onClick={onClose}
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 no-underline hover:bg-slate-800/30"
      >
        <span className="text-lg font-semibold tracking-tight text-slate-100">
          Whether
        </span>
      </Link>

      {sectionLinks.length > 0 ? (
        <>
          <p className="px-3 type-eyebrow mb-2">
            On this page
          </p>
          <nav aria-label="Page sections" className="space-y-0.5">
            {sectionLinks.map((section) => {
              const isActive = pathname.includes(section.href);
              return (
                <OutlineItem
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  isActive={isActive}
                  onClick={onClose}
                />
              );
            })}
          </nav>
        </>
      ) : null}

      <div className="my-4 border-t border-slate-800/60" />

      <p className="px-3 type-eyebrow mb-2">
        Workflow
      </p>
      <nav aria-label="Workflow" className="space-y-0.5">
        {primaryNavigationLayers.map((route) => {
          const isActive =
            route.href === "/"
              ? pathname === "/"
              : pathname.startsWith(route.href);
          return (
            <OutlineItem
              key={route.href}
              href={route.href}
              label={route.navLabel ?? route.label}
              isActive={isActive}
              onClick={onClose}
            />
          );
        })}
      </nav>
    </>
  );
}

type AppSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  sectionLinks?: ReportSectionLink[];
};

export function AppSidebar({ mobileOpen, onMobileClose, sectionLinks = [] }: AppSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (mobileOpen) {
      triggerRef.current = document.activeElement;
      sidebarRef.current?.focus();
    } else if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      <aside className="hidden lg:flex lg:h-full lg:flex-col">
        <SidebarContent sectionLinks={sectionLinks} />
      </aside>

      {/* The drawer is a div with role="dialog", not a real <dialog>. `<dialog open>`
          is non-modal — no focus trap, no inertness — so it would not make the
          aria-modal claim below any truer, while bringing UA sizing and background
          that have to be fought off. */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside
            ref={sidebarRef}
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-10 w-64 overflow-y-auto border-r border-slate-800/60 bg-slate-950/95 px-4 py-4 backdrop-blur-lg"
          >
            <SidebarContent sectionLinks={sectionLinks} onClose={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
