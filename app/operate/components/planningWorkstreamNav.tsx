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
import { WORKSTREAM_NAV_CLASS } from "./workstreamNavLayout";

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

  /* A tab row: the three planning pages are one route's views, and the active
     one is marked by an underline rather than a filled pill. It was three
     bordered pills under a monospace "Workstream:" label — monospace is for
     figures that must align (ui-ux-standards §XVIII), and the label named the
     control instead of the choice. No rule of its own under the row: the
     shell's section divider sits directly below it, and a second line 33px
     above that one drew the same edge twice. */
  return (
    <nav aria-label="Planning views" className={WORKSTREAM_NAV_CLASS}>
      {operationsWorkstreamLinks.map((link) => {
        const isActive = link.href === currentPath;
        const href = currentSearch ? `${link.href}?${currentSearch}` : link.href;
        return (
          <Link
            key={link.href}
            href={toRoute(href)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 border-b-2 text-sm font-medium no-underline transition-colors ${
              isActive
                ? "border-[var(--regime-accent)] text-slate-100"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <span className={isActive ? "text-slate-200" : "text-slate-500"} aria-hidden="true">
              {workstreamIconByLabel[link.label]}
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
