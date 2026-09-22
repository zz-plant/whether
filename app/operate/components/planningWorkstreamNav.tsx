"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "../../../lib/navigation/routeType";
import { toRoute } from "../../../lib/navigation/routeType";
import { CircleTargetIcon, SlidersIcon, TrendUpIcon } from "../../components/uiIcons";
import {
  operationsWorkstreamLinks,
  type OperationsWorkstreamLink,
} from "../../../lib/navigation/planningNavigation";

/*
 * The switcher is the route nav for the three planning pages. A second
 * rendering of the same three links — "Other planning pages", as cards with
 * Default / Optional badges — used to close every one of those pages; it
 * repeated this control and, on /operate, three of the accordions above it.
 */

const workstreamIconByLabel: Record<OperationsWorkstreamLink["label"], ReactNode> = {
  "Weekly plan": <CircleTargetIcon className="h-3.5 w-3.5" />,
  "Runway planner": <TrendUpIcon className="h-3.5 w-3.5" />,
  Scenarios: <SlidersIcon className="h-3.5 w-3.5" />,
};

export const CompactWorkstreamSwitcher = ({ currentPath }: { currentPath: Route }) => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  return (
    <nav aria-label="Planning views" className="flex flex-wrap items-center gap-2 pb-2">
      <span className="text-xs font-mono font-medium text-slate-400 mr-1">Workstream:</span>
      {operationsWorkstreamLinks.map((link) => {
        const isActive = link.href === currentPath;
        const href = currentSearch ? `${link.href}?${currentSearch}` : link.href;
        return (
          <Link
            key={link.href}
            href={toRoute(href)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors ${
              isActive
                ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
            }`}
          >
            <span className={isActive ? "text-sky-300" : "text-slate-400"} aria-hidden="true">
              {workstreamIconByLabel[link.label]}
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
