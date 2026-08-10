"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ActionLink } from "./ui/actionLink";

const routeGroups = [
  {
    label: "Plan",
    links: [
      { href: "/planning/financial", label: "Capital posture" },
      { href: "/planning/ship-checklist", label: "Ship call" },
    ],
  },
  {
    label: "Resolve",
    links: [
      { href: "/answer", label: "By role" },
      { href: "/resolve#toolkit-library", label: "Toolkits" },
    ],
  },
  {
    label: "Rule",
    links: [
      { href: "/template", label: "Blank decision form" },
      { href: "/resources/reversal-trigger-checklist", label: "Reversal checklist" },
    ],
  },
  {
    label: "Compare",
    links: [
      { href: "/history/compare", label: "Past epochs" },
      { href: "/history", label: "Full archive" },
    ],
  },
] as const;

// Lower homepage handoff: a collapsed disclosure, not an always-open rail. It
// surfaces the operator-loop routes (Plan / Resolve / Rule / Compare) that sit
// one hop off the brief without competing with the leading /planning card.
export function DecisionRouteRail() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="group weather-section-border overflow-hidden" aria-label="Route this week's call">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex w-full min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-white/70 transition-colors select-none hover:bg-white/[0.04] hover:text-white/90 weather-focus-ring weather-press-scale"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-white/60">Route this week&apos;s call</span>
            <span className="truncate text-[0.65rem] text-white/40">Plan · Resolve · Rule · Compare</span>
          </div>
          <ChevronRight
            className={`h-5 w-5 shrink-0 transition-transform group-hover:text-white/60 ${open ? "rotate-90" : ""} text-white/50`}
            aria-hidden="true"
          />
        </button>

      <div id={panelId} hidden={!open}>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {routeGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <ul className="space-y-0.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <ActionLink
                        href={link.href}
                        variant="inline"
                        className="normal-case tracking-normal text-fluid-sm text-sky-300/75 hover:text-sky-200"
                      >
                        {link.label}
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