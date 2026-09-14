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

const navItemStyles =
  "weather-pill flex min-h-[56px] flex-col items-start gap-1.5 border px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] transition-colors";

const workstreamIconByLabel: Record<OperationsWorkstreamLink["label"], ReactNode> = {
  "Weekly plan": <CircleTargetIcon className="h-3.5 w-3.5" />,
  "Financial strategy": <TrendUpIcon className="h-3.5 w-3.5" />,
  "Scenario studio": <SlidersIcon className="h-3.5 w-3.5" />,
};

const getItemClasses = (link: OperationsWorkstreamLink, currentPath: Route) =>
  link.href === currentPath
    ? `${navItemStyles} border-sky-400/70 bg-sky-500/15 text-sky-100`
    : `${navItemStyles} border-slate-800/80 text-slate-200 hover:border-sky-400/70 hover:text-slate-100`;

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

export const OperationsWorkstreamNav = ({ currentPath }: { currentPath: Route }) => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  return (
    <nav aria-label="Planning workstreams" className="weather-panel px-4 py-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Other planning pages</p>
        <p className="text-sm text-slate-300">
          Most teams start with Weekly plan. Open the others for finance direction or a scenario run.
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationsWorkstreamLinks.map((link) => {
          const isActive = link.href === currentPath;
          const labelTone = isActive ? "text-sky-200" : "text-slate-400";
          const descriptionTone = isActive ? "text-sky-100" : "text-slate-100";
          const statusLabel = isActive ? "Default" : "Optional";
          const href = currentSearch ? `${link.href}?${currentSearch}` : link.href;
          return (
            <li key={link.href}>
              <Link
                href={href as Route}
                aria-current={isActive ? "page" : undefined}
                className={getItemClasses(link, currentPath)}
              >
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-slate-300" aria-hidden="true">{workstreamIconByLabel[link.label]}</span>
                    <span className={`type-badge ${labelTone}`}>
                      {link.label}
                    </span>
                  </span>
                  <span className="rounded-sm border border-slate-700/70 px-2 py-1 type-eyebrow text-slate-300">
                    {statusLabel}
                  </span>
                </div>
                <span className={`text-sm font-semibold tracking-[0.08em] ${descriptionTone}`}>
                  {link.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
