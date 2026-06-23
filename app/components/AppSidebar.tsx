"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { ReportSectionLink } from "./reportShellNavigation";

const WORKFLOW_ROUTES = [
  { href: "/" as Route, label: "Decide" },
  { href: "/planning" as Route, label: "Plan" },
  { href: "/evidence" as Route, label: "Deepen" },
] as const;

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
        <span className="font-display text-lg font-semibold tracking-tight text-slate-100">
          Whether
        </span>
      </Link>

      {sectionLinks.length > 0 ? (
        <>
          <p className="px-3 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
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

      <p className="px-3 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
        Workflow
      </p>
      <nav aria-label="Workflow" className="space-y-0.5">
        {WORKFLOW_ROUTES.map((route) => {
          const isActive =
            route.href === "/"
              ? pathname === "/"
              : pathname.startsWith(route.href);
          return (
            <OutlineItem
              key={route.href}
              href={route.href}
              label={route.label}
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
  return (
    <>
      <aside className="hidden lg:flex lg:h-full lg:flex-col">
        <SidebarContent sectionLinks={sectionLinks} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-10 w-64 overflow-y-auto border-r border-slate-800/60 bg-slate-950/95 px-4 py-4 backdrop-blur-lg">
            <SidebarContent sectionLinks={sectionLinks} onClose={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
