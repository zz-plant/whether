"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const steps = [
  {
    href: "/operations/plan",
    label: "Step 1",
    title: "Plan",
    description: "Translate the regime into quarterly posture.",
  },
  {
    href: "/operations/decisions",
    label: "Step 2",
    title: "Decisions",
    description: "Validate assumptions and guardrails before committing.",
  },
  {
    href: "/operations/briefings",
    label: "Step 3",
    title: "Briefings",
    description: "Export aligned narratives and leadership-ready kits.",
  },
] as const;

export const OperationsWorkflowProgress = ({ currentPath }: { currentPath: Route }) => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  return (
    <section className="weather-panel space-y-3 px-4 py-4" aria-label="Operations workflow progress">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Workflow progress</p>
        <h2 className="text-sm font-semibold text-slate-100">Complete plan → decisions → briefings</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const isActive = step.href === currentPath;
          const href = currentSearch ? `${step.href}?${currentSearch}` : step.href;
          return (
            <li key={step.href}>
              <Link
                href={href}
                aria-current={isActive ? "step" : undefined}
                className={`weather-surface flex min-h-[84px] flex-col gap-1 rounded-xl border p-3 transition-colors ${
                  isActive
                    ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                    : "border-slate-800/80 text-slate-200 hover:border-sky-400/70"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {step.label}
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
