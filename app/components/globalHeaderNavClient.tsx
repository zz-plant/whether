"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Menu } from "@base-ui/react/menu";
import { Drawer } from "@base-ui/react/drawer";
import {
  resolveGlobalHeaderRouteLabel,
  resolveGlobalHeaderNavigationLinks,
  type GlobalHeaderNavigationLink,
} from "../../lib/navigation/globalHeader";

type GlobalHeaderNavClientProps = {
  pathname?: string;
};

const FIRST_VISIT_NAV_KEY = "whether_nav_hints_dismissed";
const STEP_LABELS = ["Decide", "Evidence", "Plan", "Resolve", "Readiness", "History"];
const STEP_ORDER = ["/", "/evidence", "/planning", "/resolve", "/trust", "/history"];
const STEP_HINTS = [
  "This week's decision and brief",
  "Proof and thresholds behind the brief",
  "Turn the brief into approvals",
  "Close one open question",
  "Freshness, confidence, and sources",
  "Trends over time",
];

function StepTooltip({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className="cursor-default">{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className="z-30 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-fluid-micro text-slate-200 shadow-lg">
            {hint}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function WorkflowStep({
  link,
  index,
  isActive,
  isLast,
  showHints,
  nextStepActive,
}: {
  link: GlobalHeaderNavigationLink;
  index: number;
  isActive: boolean;
  isLast: boolean;
  showHints: boolean;
  nextStepActive: boolean;
}) {
  const stepNumber = index + 1;
  const stepLabel = STEP_LABELS[index] ?? link.label;
  const hint = STEP_HINTS[index] ?? link.description;
  const isNext = nextStepActive;

  const stepContent = (
    <li className="flex items-center gap-0">
      <Link
        href={link.href}
        aria-current={isActive ? "page" : undefined}
        className={`group flex items-center gap-2 rounded-full px-2.5 py-1.5 text-fluid-xs font-semibold tracking-[0.02em] no-underline transition-all duration-150 ${
          isActive
            ? "bg-sky-500/14 text-sky-100"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
            isActive
              ? "bg-sky-400 text-slate-950"
              : isNext
                ? "bg-sky-400/30 text-sky-200"
                : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
          }`}
        >
          {stepNumber}
        </span>
        <span className="hidden sm:inline">{stepLabel}</span>
      </Link>
      {!isLast ? (
        <span className="mx-0.5 h-px w-3 bg-slate-700/60 sm:w-4" aria-hidden="true" />
      ) : null}
    </li>
  );

  if (showHints && !isActive) {
    return <StepTooltip hint={hint}>{stepContent}</StepTooltip>;
  }

  return stepContent;
}

function SecondaryNavLinks() {
  const pathname = usePathname() ?? "/";
  const secondaryLinks = [
    { href: "/" as Route, label: "This Week" },
    { href: "/" as Route, label: "Conditions" },
    { href: "/trust" as Route, label: "Learn" },
    { href: "/comps" as Route, label: "Valuations" },
    { href: "/regime-changes" as Route, label: "Changes" },
    { href: "/archive" as Route, label: "Archive" },
    { href: "/api-docs" as Route, label: "API" },
  ];
  const moreLinks = [
    { href: "/threshold" as Route, label: "Decision Framework" },
    { href: "/template" as Route, label: "Decision Template" },
    { href: "/planning#ops-export-briefs" as Route, label: "Resources" },
    { href: "/feed.xml" as Route, label: "RSS Feed" },
    { href: "/trust" as Route, label: "About" },
  ];

  return (
    <nav aria-label="More pages" className="flex items-center gap-1">
      {secondaryLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-2.5 py-1.5 text-fluid-xs font-medium tracking-[0.02em] no-underline transition-colors ${
              isActive
                ? "bg-slate-800/70 text-slate-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <Menu.Root>
        <Menu.Trigger className="rounded-full px-2.5 py-1.5 text-fluid-xs font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
          More ▾
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end">
            <Menu.Popup className="z-20 w-40 rounded-lg border border-slate-700/70 bg-slate-950/95 p-1.5 shadow-xl backdrop-blur-xl">
              {moreLinks.map((link) => (
                <Menu.Item
                  key={link.href}
                  className="w-full rounded-md px-3 py-2 text-left text-fluid-xs font-medium text-slate-300 no-underline hover:bg-slate-800/60 cursor-pointer"
                  render={
                    <Link href={link.href} className="block">
                      {link.label}
                    </Link>
                  }
                />
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </nav>
  );
}

function MobileNavContent({
  navigationLinks,
  onClose,
}: {
  navigationLinks: GlobalHeaderNavigationLink[];
  onClose: () => void;
}) {
  return (
    <div className="w-full px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700" />
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Workflow</p>
      <nav className="mt-3 space-y-1" aria-label="Primary routes">
        {navigationLinks.map((link, index) => {
          const stepNumber = index + 1;
          const stepLabel = STEP_LABELS[index] ?? link.label;
          const hint = STEP_HINTS[index] ?? link.description;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold no-underline transition-colors ${
                link.isActive ? "bg-sky-500/12 text-sky-100" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                link.isActive ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>{stepNumber}</span>
              <div className="flex flex-col">
                <span>{stepLabel}</span>
                <span className="text-fluid-xs font-normal text-slate-500">{hint}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function GlobalHeaderNavClient({ pathname }: GlobalHeaderNavClientProps) {
  const currentPathname = usePathname() ?? "/";
  const resolvedPathname = pathname ?? currentPathname;
  const [showMobile, setShowMobile] = useState(false);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(FIRST_VISIT_NAV_KEY);
    if (!dismissed) {
      setShowHints(true);
      localStorage.setItem(FIRST_VISIT_NAV_KEY, "1");
    }
  }, []);

  const navigationLinks = useMemo(
    () => resolveGlobalHeaderNavigationLinks(resolvedPathname),
    [resolvedPathname],
  );
  const activeRouteLabel = resolveGlobalHeaderRouteLabel(resolvedPathname);
  const activeIndex = navigationLinks.findIndex((l) => l.isActive);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMobile(true)}
        className="flex items-center gap-2 rounded-full border border-slate-800/60 px-3 py-1.5 text-fluid-xs font-semibold text-slate-300 md:hidden"
        aria-label="Open navigation"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400/20 text-[10px] font-bold text-sky-100">
          {activeIndex >= 0 ? activeIndex + 1 : "≡"}
        </span>
        {activeRouteLabel}
      </button>

      <nav aria-label="Workflow" className="hidden md:block lg:hidden">
        <ul className="flex items-center">
          {navigationLinks.map((link, index) => (
            <WorkflowStep
              key={link.href}
              link={link}
              index={index}
              isActive={link.isActive}
              isLast={index === navigationLinks.length - 1}
              showHints={showHints}
              nextStepActive={!link.isActive && index === activeIndex + 1}
            />
          ))}
        </ul>
      </nav>

      <div className="hidden md:block lg:hidden">
        <SecondaryNavLinks />
      </div>

      <Drawer.Root open={showMobile} onOpenChange={setShowMobile}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-2xl sm:hidden">
            <MobileNavContent navigationLinks={navigationLinks} onClose={() => setShowMobile(false)} />
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
