"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const steps = [
  {
    href: "/operations",
    label: "Stage 1",
    title: "Plan",
    description: "Set this quarter's operating plan.",
  },
  {
    href: "/operations/integrations",
    label: "Stage 2",
    title: "Integrations",
    description: "Distribute weekly mandate payloads into operating systems.",
  },
  {
    href: "/operations/data",
    label: "Stage 3",
    title: "Data",
    description: "Use endpoint guidance for dashboards and internal automation.",
  },
] as const;

export const OperationsWorkflowProgress = ({ currentPath }: { currentPath: Route }) => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const activeIndex = Math.max(
    steps.findIndex((step) => step.href === currentPath),
    0,
  );

  return (
    <section className="weather-panel space-y-3 px-4 py-4" aria-label="Operations workflow progress">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Workflow progress</p>
        <h2 className="text-sm font-semibold text-slate-100">Plan · integrations · data</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const isActive = step.href === currentPath;
          const isCompleted = index < activeIndex;
          const stepState = isCompleted ? "Complete" : isActive ? "Active" : "Upcoming";
          const href = currentSearch ? `${step.href}?${currentSearch}` : step.href;
          return (
            <li key={step.href}>
              <Link
                href={href as Route}
                aria-current={isActive ? "step" : undefined}
                className={`weather-surface flex min-h-[100px] flex-col gap-2 rounded-xl border p-3 transition-colors ${
                  isActive
                    ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                    : isCompleted
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                      : "border-slate-800/80 text-slate-200 hover:border-sky-400/70"
                }`}
              >
                <span className="inline-flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                        isCompleted
                          ? "border-emerald-300/80 bg-emerald-500/30 text-emerald-50"
                          : isActive
                            ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                            : "border-slate-600/80 text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {isCompleted ? "✓" : index + 1}
                    </span>
                    {step.label}
                  </span>
                  <span className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px]">{stepState}</span>
                </span>
                <span className="text-sm font-semibold tracking-[0.08em]">{step.title}</span>
                <span className="text-xs text-slate-300">{step.description}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
