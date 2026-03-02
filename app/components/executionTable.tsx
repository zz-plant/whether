"use client";

import { ScrollArea } from "@base-ui/react/scroll-area";
import { Tooltip } from "@base-ui/react/tooltip";
import type { Route } from "next";
import Link from "next/link";

export type ExecutionTableRow = {
  horizon: string;
  owner: string;
  due: string;
  impact: string;
  href: string;
  ctaLabel: string;
};

const HeaderTooltip = ({ label, detail }: { label: string; detail: string }) => (
  <Tooltip.Root>
    <Tooltip.Trigger className="underline decoration-dotted underline-offset-4">{label}</Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Positioner side="top" sideOffset={8}>
        <Tooltip.Popup className="max-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-lg">
          {detail}
        </Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>
);

export const ExecutionTable = ({
  title,
  rows,
}: {
  title: string;
  rows: ExecutionTableRow[];
}) => (
  <section className="weather-surface p-4" aria-label={title}>
    <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">{title}</p>
    <Tooltip.Provider delay={150} closeDelay={50}>
      <ScrollArea.Root className="mt-3 overflow-hidden rounded-xl border border-slate-800/80">
        <ScrollArea.Viewport className="max-w-full overscroll-contain">
          <table className="min-w-[720px] border-collapse text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="px-2 py-2 font-semibold">
                  <HeaderTooltip label="Horizon" detail="Planning window for this operating action." />
                </th>
                <th className="px-2 py-2 font-semibold">
                  <HeaderTooltip label="Owner" detail="Primary accountable team or function." />
                </th>
                <th className="px-2 py-2 font-semibold">
                  <HeaderTooltip label="Due" detail="Expected completion timing for this action." />
                </th>
                <th className="px-2 py-2 font-semibold">
                  <HeaderTooltip label="Expected impact" detail="Operational outcome expected if delivered on time." />
                </th>
                <th className="px-2 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.horizon} className="border-b border-slate-900/80 align-top">
                  <td className="px-2 py-3 font-semibold text-slate-100">{row.horizon}</td>
                  <td className="px-2 py-3">{row.owner}</td>
                  <td className="px-2 py-3">{row.due}</td>
                  <td className="px-2 py-3">{row.impact}</td>
                  <td className="px-2 py-3">
                    <Link
                      href={row.href as Route}
                      className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                    >
                      {row.ctaLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" className="flex h-2.5 bg-slate-900/80">
          <ScrollArea.Thumb className="rounded-full bg-slate-700" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </Tooltip.Provider>
  </section>
);
