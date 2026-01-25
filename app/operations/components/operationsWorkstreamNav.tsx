"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  operationsWorkstreamLinks,
  type OperationsWorkstreamLink,
} from "../../../lib/navigation/operationsNavigation";

const navItemStyles =
  "weather-pill flex min-h-[56px] flex-col items-start gap-1.5 rounded-2xl border px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] transition-colors";

const getItemClasses = (link: OperationsWorkstreamLink, currentPath: Route) =>
  link.href === currentPath
    ? `${navItemStyles} border-sky-400/70 bg-sky-500/15 text-sky-100`
    : `${navItemStyles} border-slate-800/80 text-slate-200 hover:border-sky-400/70 hover:text-slate-100`;

export const OperationsWorkstreamNav = ({ currentPath }: { currentPath: Route }) => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentQuery = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label="Operations workstreams" className="weather-panel px-4 py-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Workstreams</p>
        <p className="text-sm text-slate-300">
          Split the operations guidance into focused workflows so you can move faster.
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationsWorkstreamLinks.map((link) => {
          const isActive = link.href === currentPath;
          const labelTone = isActive ? "text-sky-200" : "text-slate-400";
          const descriptionTone = isActive ? "text-sky-100" : "text-slate-100";
          const href = currentSearch
            ? { pathname: link.href, query: currentQuery }
            : link.href;
          return (
            <li key={link.href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={getItemClasses(link, currentPath)}
              >
                <span className={`text-[11px] uppercase tracking-[0.22em] ${labelTone}`}>
                  {link.label}
                </span>
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
