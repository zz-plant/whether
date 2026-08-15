"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ActionLink } from "./ui/actionLink";

const routeGroups = [
  {
    label: "Plan next",
    links: [
      { href: "/planning/financial", label: "Capital posture" },
      { href: "/planning/ship-checklist", label: "Ship call" },
    ],
  },
  {
    label: "Resolve a question",
    links: [
      { href: "/answer", label: "By role" },
      { href: "/answer#toolkit-library", label: "Toolkits" },
      { href: "/template", label: "Blank decision form" },
      { href: "/resources/reversal-trigger-checklist", label: "Reversal checklist" },
    ],
  },
  {
    label: "Review evidence",
    links: [
      { href: "/history/compare", label: "Past epochs" },
      { href: "/history", label: "Full archive" },
    ],
  },
] as const;

// Lower homepage handoff: a collapsed disclosure, not an always-open rail. It
// surfaces optional planning, resolution, and evidence routes that sit
// one hop off the brief without competing with the leading /planning card.
export function DecisionRouteRail() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="group rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-md backdrop-blur-md overflow-hidden transition-all duration-200" aria-label="Route this week's call">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex w-full min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left text-fluid-xs font-medium text-slate-200 transition-colors hover:bg-slate-800/40 select-none weather-focus-ring weather-press-scale"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-semibold text-white">Route this week&apos;s call</span>
          <span className="hidden sm:inline-block h-3 w-px bg-slate-700/60" aria-hidden="true" />
          <span className="truncate text-fluid-nano text-slate-400 font-mono">Plan next · Resolve a question · Review evidence</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
          <span className="text-fluid-nano font-mono uppercase tracking-wider">{open ? "Hide paths" : "More paths"}</span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90 text-sky-400" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      <div id={panelId} hidden={!open}>
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/60">
          <div className="grid gap-3 sm:grid-cols-3">
            {routeGroups.map((group) => (
              <div key={group.label} className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3 space-y-2">
                <span className="text-fluid-nano font-mono font-bold text-sky-400 uppercase tracking-wider block border-b border-slate-800/60 pb-1">
                  {group.label}
                </span>
                <ul className="space-y-1.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <ActionLink
                        href={link.href}
                        variant="inline"
                        className="normal-case tracking-normal text-fluid-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span>{link.label}</span>
                      </ActionLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
