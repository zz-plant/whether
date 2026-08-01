"use client";

import Link from "next/link";
import { CircleTargetIcon, SectionJumpIcon } from "../../components/uiIcons";

const executionSteps = [
  {
    href: "#ops-monthly-action-summary",
    label: "Step 1",
    title: "Approval call",
    description: "What leadership should approve, hold, or revisit this week.",
  },
  {
    href: "#ops-playbook",
    label: "Step 2",
    title: "Guardrails",
    description: "The start, stop, and fence lines that keep changes reversible and bounded.",
  },
  {
    href: "#ops-export-briefs",
    label: "Step 3",
    title: "Shareable brief",
    description: "The version to circulate once finance guidance and operator asks align.",
  },
] as const;

const implementationHandoffLinks = [
  {
    href: "https://github.com/zz-plant/whether/blob/main/docs/developer/integrations.md",
    label: "Integration notes",
    description: "Slack, Notion, and Linear handoff once the brief is approved.",
  },
  {
    href: "https://github.com/zz-plant/whether/blob/main/docs/developer/api-reference.md",
    label: "API handoff",
    description: "Payload and endpoint guidance for data and automation owners.",
  },
] as const;

export const OperationsWorkflowProgress = () => {
  return (
    <section className="weather-panel space-y-3 px-4 py-4" aria-label="Planning workflow progress">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Planning</p>
        <h2 className="text-sm font-semibold text-slate-100">This week&apos;s planning call</h2>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {executionSteps.map((step, index) => {
          const cardTone =
            index === 0
              ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
              : "border-slate-800/80 text-slate-200 hover:border-sky-400/70";
          return (
            <li key={step.href}>
              <article
                aria-current={index === 0 ? "step" : undefined}
                className={`weather-surface flex min-h-[100px] flex-col gap-2 rounded-md border p-3 ${cardTone}`}
              >
                <span className="inline-flex items-center gap-2 text-fluid-xs font-semibold uppercase tracking-[0.2em]">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border text-fluid-micro ${
                        index === 0
                          ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                          : "border-slate-600/80 text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      {index === 0 ? <CircleTargetIcon className="h-3.5 w-3.5" /> : <SectionJumpIcon className="h-3.5 w-3.5" />}
                    </span>
                    {step.label}
                  </span>
                </span>
                <span className="text-sm font-semibold tracking-[0.08em]">{step.title}</span>
                <span className="text-xs text-slate-300">{step.description}</span>
              </article>
            </li>
          );
        })}
      </ol>

      <div className="weather-surface space-y-2 rounded-md border border-slate-800/80 px-3 py-3">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Implementation handoff</p>
        <p className="text-xs text-slate-300">
          For tools and automation owners once the weekly plan is approved.
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {implementationHandoffLinks.map((link) => {
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
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
