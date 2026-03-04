"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";

export const SectionedReportPanel = ({
  id,
  title,
  description,
  children,
  defaultOpen = true,
  tone = "sky",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: "sky" | "teal" | "amber" | "violet";
}) => {
  const toneClass =
    tone === "teal"
      ? "weather-card-accent-teal"
      : tone === "amber"
        ? "weather-card-accent-amber"
        : tone === "violet"
          ? "weather-card-accent-violet"
          : "weather-card-accent-sky";

  return (
    <section id={id} className="space-y-4">
      <Collapsible.Root defaultOpen={defaultOpen}>
        <Collapsible.Trigger
          type="button"
          className={`weather-panel-quiet weather-card-accent ${toneClass} group inline-flex min-h-[44px] w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm font-semibold text-slate-100 transition-colors hover:text-slate-100 touch-manipulation`}
        >
          <span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Section
            </span>
            <span className="mt-1 block text-lg font-semibold text-slate-100 sm:text-xl">
              {title}
            </span>
            {description ? (
              <span className="mt-1 block text-[15px] text-slate-300 sm:text-base">
                {description}
              </span>
            ) : null}
          </span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-data-[panel-open]:rotate-180">
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
        <Collapsible.Panel className="mt-4 space-y-6">{children}</Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
