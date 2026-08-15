"use client";

import { ScrollArea } from "@base-ui/react/scroll-area";
import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import { useMemo, useState } from "react";

export type ExecutionTableRow = {
  horizon: string;
  owner: string;
  due: string;
  impact: string;
  href: string;
  ctaLabel: string;
};

type SortKey = "horizon" | "owner" | "due";

export const ExecutionTable = ({
  title,
  rows,
}: {
  title: string;
  rows: ExecutionTableRow[];
}) => {
  const [filterValue, setFilterValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("due");

  const visibleRows = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLowerCase();
    const filtered = normalizedFilter
      ? rows.filter((row) => [row.horizon, row.owner, row.impact].some((field) => field.toLowerCase().includes(normalizedFilter)))
      : rows;

    return [...filtered].sort((left, right) => left[sortKey].localeCompare(right[sortKey], undefined, { sensitivity: "base" }));
  }, [filterValue, rows, sortKey]);

  return (
    <section className="weather-surface p-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            placeholder="Filter owner, horizon, impact"
            className="weather-input h-9 w-[220px] text-xs"
            aria-label="Filter execution rows"
          />
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="weather-input h-9 w-[130px] text-xs"
            aria-label="Sort execution rows"
          >
            <option value="due">Sort: due</option>
            <option value="owner">Sort: owner</option>
            <option value="horizon">Sort: horizon</option>
          </select>
        </div>
      </div>
      <ScrollArea.Root className="mt-3 overflow-hidden rounded-md border border-slate-800/80">
          <ScrollArea.Viewport className="max-w-full overscroll-contain">
            <table className="min-w-[720px] border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 type-eyebrow">
                  <th className="px-2 py-2 font-semibold">Horizon</th>
                  <th className="px-2 py-2 font-semibold">Owner</th>
                  <th className="px-2 py-2 font-semibold">Due</th>
                  <th className="px-2 py-2 font-semibold">Expected impact</th>
                  <th className="px-2 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.horizon}-${row.owner}-${row.due}`} className="border-b border-slate-900/80 align-top">
                    <td className="px-2 py-3 font-semibold text-slate-100">{row.horizon}</td>
                    <td className="px-2 py-3">{row.owner}</td>
                    <td className="px-2 py-3">{row.due}</td>
                    <td className="px-2 py-3">{row.impact}</td>
                    <td className="px-2 py-3">
                      <Link
                        href={row.href as Route}
                        className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                      >
                        {row.ctaLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-sm text-slate-400">
                      No rows match that filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="horizontal" className="flex h-2.5 bg-slate-900/80">
            <ScrollArea.Thumb className="rounded-full bg-slate-700" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    </section>
  );
};
