"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { ThemeToggleButton } from "./themeToggleButton";

const WORKFLOW_STEPS = [
  { href: "/" as Route, label: "Decide", desc: "This week's call" },
  { href: "/evidence" as Route, label: "Evidence", desc: "Proof and thresholds" },
  { href: "/planning" as Route, label: "Plan", desc: "Turn into approvals" },
  { href: "/resolve" as Route, label: "Resolve", desc: "Close one question" },
  { href: "/trust" as Route, label: "Trust", desc: "Sources and confidence" },
  { href: "/history" as Route, label: "History", desc: "Trends over time" },
] as const;

const SECONDARY_LINKS = [
  { href: "/this-week" as Route, label: "This Week" },
  { href: "/comps" as Route, label: "Multiples" },
  { href: "/current-regime" as Route, label: "Regime" },
  { href: "/regime-changes" as Route, label: "Changes" },
  { href: "/archive" as Route, label: "Archive" },
  { href: "/api-docs" as Route, label: "API" },
  { href: "/learn" as Route, label: "Learn" },
] as const;

function NavItem({
  href,
  label,
  desc,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  desc?: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group flex flex-col rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
        isActive
          ? "bg-sky-500/10 text-sky-100"
          : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
      }`}
    >
      <span className="font-medium">{label}</span>
      {desc ? (
        <span className="text-fluid-micro text-slate-500 group-hover:text-slate-400">
          {desc}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      <Link
        href="/"
        onClick={onClose}
        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 no-underline hover:bg-slate-800/30"
      >
        <span className="font-display text-lg font-semibold tracking-tight text-slate-100">
          Whether
        </span>
      </Link>

      <nav aria-label="Workflow" className="space-y-0.5">
        {WORKFLOW_STEPS.map((step) => {
          const isActive =
            step.href === "/"
              ? pathname === "/"
              : pathname.startsWith(step.href);
          return (
            <NavItem
              key={step.href}
              href={step.href}
              label={step.label}
              desc={step.desc}
              isActive={isActive}
              onClick={onClose}
            />
          );
        })}
      </nav>

      <div className="my-3 border-t border-slate-800/60" />

      <nav aria-label="More pages" className="space-y-0.5">
        {SECONDARY_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={isActive}
              onClick={onClose}
            />
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800/60 pt-3">
        <ThemeToggleButton showLabel className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/40 hover:text-slate-200" />
      </div>
    </>
  );
}

type AppSidebarProps = {
  /** When true, renders as a mobile overlay instead of inline */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop: inline sidebar */}
      <aside className="hidden lg:flex lg:h-full lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile: overlay sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-10 w-64 overflow-y-auto border-r border-slate-800/60 bg-slate-950/95 px-4 py-4 backdrop-blur-2xl">
            <SidebarContent onClose={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
