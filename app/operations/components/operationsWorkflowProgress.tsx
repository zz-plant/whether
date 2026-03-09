"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleTargetIcon, SectionJumpIcon } from "../../components/uiIcons";

const executionSteps = [
  {
    href: "#ops-monthly-action-summary",
    label: "Stage 1",
    title: "Confirm this week + month",
    description: "Use the monthly summary to lock this week's execution posture.",
  },
  {
    href: "#ops-playbook",
    label: "Stage 2",
    title: "Run bounded playbook moves",
    description: "Apply start/stop/fence moves and pause when stop triggers hit.",
  },
  {
    href: "#ops-export-briefs",
    label: "Stage 3",
    title: "Export the artifact",
    description: "Share copy-ready updates once finance guidance and asks are aligned.",
  },
] as const;

const implementationHandoffLinks = [
  {
    href: "/operations/integrations",
    label: "Integrations handoff",
    description: "Optional: route the approved mandate into Slack, Notion, and Linear.",
  },
  {
    href: "/operations/data",
    label: "Data/API handoff",
    description: "Optional: share endpoint guidance with data and automation owners.",
  },
] as const;

export const OperationsWorkflowProgress = () => {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const activeIndex = 0;

  return (
    <section className="weather-panel space-y-3 px-4 py-4" aria-label="Operations workflow progress">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Workflow progress</p>
        <h2 className="text-sm font-semibold text-slate-100">Weekly execution sequence</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {executionSteps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const stepState = isCompleted ? "Complete" : index === activeIndex ? "Active" : "Upcoming";
          const href = currentSearch ? `?${currentSearch}${step.href}` : step.href;
          return (
            <li key={step.href}>
              <Link
                href={href}
                aria-current={index === activeIndex ? "step" : undefined}
                className={`weather-surface flex min-h-[100px] flex-col gap-2 rounded-xl border p-3 transition-colors ${
                  index === activeIndex
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
                          : index === activeIndex
                            ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                            : "border-slate-600/80 text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {isCompleted ? "✓" : index + 1}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      {index === 0 ? <CircleTargetIcon className="h-3.5 w-3.5" /> : <SectionJumpIcon className="h-3.5 w-3.5" />}
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

      <div className="weather-surface space-y-2 rounded-xl border border-slate-800/80 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Optional implementation handoff</p>
        <p className="text-xs text-slate-300">
          Integration and API references are available after you finalize the weekly calls.
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {implementationHandoffLinks.map((link) => {
            const href = currentSearch ? `${link.href}?${currentSearch}` : link.href;
            return (
              <li key={link.href}>
                <Link
                  href={href}
                  className="weather-card block rounded-lg border border-slate-800/80 px-3 py-2 text-xs transition-colors hover:border-sky-400/70"
                >
                  <p className="font-semibold uppercase tracking-[0.14em] text-sky-200">{link.label}</p>
                  <p className="mt-1 text-slate-300">{link.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
