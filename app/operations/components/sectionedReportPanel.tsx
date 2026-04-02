"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";

export const SectionedReportPanel = ({
  id,
  title,
  description,
  children,
  defaultOpen = true,
  label = "Section",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  label?: string;
}) => (
  <section id={id} className="space-y-4">
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger
        type="button"
        className="weather-panel group relative inline-flex min-h-[44px] w-full items-center justify-between gap-3 overflow-hidden px-5 py-4 text-left text-sm font-semibold text-slate-100 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:text-slate-100 touch-manipulation"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" aria-hidden="true" />
        <span>
          <span className="text-xs font-semibold tracking-[0.2em] text-sky-200/80">
            {label}
          </span>
          <span className="mt-1 block max-w-2xl text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              {description}
            </span>
          ) : null}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/65 text-slate-300 shadow-[0_12px_24px_-20px_rgba(2,6,23,0.8)] transition-transform duration-200 group-data-[panel-open]:rotate-180">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="mt-4 rounded-[1.1rem] border border-slate-800/55 bg-slate-950/35 p-4 shadow-[0_18px_34px_-28px_rgba(2,6,23,0.75)] sm:p-5">
        <div className="space-y-6">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  </section>
);
