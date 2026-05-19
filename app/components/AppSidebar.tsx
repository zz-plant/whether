"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const WORKFLOW_STEPS = [
  { href: "/" as Route, label: "Brief", desc: "This week's call", icon: "📋" },
  { href: "/evidence" as Route, label: "Evidence", desc: "Proof and thresholds", icon: "📊" },
  { href: "/planning" as Route, label: "Plan", desc: "Create your plan", icon: "📐" },
  { href: "/resolve" as Route, label: "Resolve", desc: "Answer one question", icon: "🔍" },
  { href: "/trust" as Route, label: "Trust", desc: "Methodology", icon: "🛡" },
  { href: "/history" as Route, label: "History", desc: "Trends over time", icon: "📈" },
] as const;

const SECONDARY_LINKS = [
  { href: "/this-week" as Route, label: "This Week" },
  { href: "/comps" as Route, label: "Valuations" },
  { href: "/current-regime" as Route, label: "Conditions" },
  { href: "/regime-changes" as Route, label: "Changes" },
  { href: "/archive" as Route, label: "Archive" },
  { href: "/api-docs" as Route, label: "API" },
  { href: "/learn" as Route, label: "Learn" },
] as const;

function NavItem({
  href,
  label,
  desc,
  icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  desc?: string;
  icon?: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
        isActive
          ? "bg-sky-500/10 text-sky-100"
          : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
      }`}
    >
      {icon ? <span className="text-base flex-shrink-0">{icon}</span> : null}
      <div className="flex flex-col min-w-0">
        <span className="font-medium">{label}</span>
      {desc ? (
        <span className="text-fluid-micro text-slate-500 group-hover:text-slate-400">
          {desc}
        </span>
      ) : null}
      </div>
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
              icon={step.icon}
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
