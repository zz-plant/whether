"use client";

import Link from "next/link";
import { ChevronRight, Copy, Check } from "lucide-react";
import { useClipboardCopy } from "../useClipboardCopy";

export interface ActionItem {
  id: string | number;
  text: string;
  href?: string;
}

export interface ActionsThisWeekCardProps {
  actions?: ActionItem[];
  operateHref?: string;
  className?: string;
}

const DEFAULT_ACTIONS: ActionItem[] = [
  {
    id: 1,
    text: "Recheck fixed-cost approvals before net-new headcount.",
    href: "/operate#hiring",
  },
  {
    id: 2,
    text: "Re-approve discretionary spend before new burn commitments.",
    href: "/operate#spend",
  },
  {
    id: 3,
    text: "Keep expansion bets only where activation and retention are already on track.",
    href: "/operate#roadmap",
  },
];

export function ActionsThisWeekCard({
  actions = DEFAULT_ACTIONS,
  operateHref = "/operate",
  className = "",
}: ActionsThisWeekCardProps) {
  /*
   * The copy path was a hand-rolled `navigator.clipboard.writeText` in a
   * try/catch whose catch swallowed the failure, so the button showed "Copied!"
   * and had no failure state at all. It goes through the shared hook, which
   * separates "unavailable" from "write failed".
   */
  const { status, copyToClipboard } = useClipboardCopy();
  const didCopy = status === "copied";
  const didFail = status === "error";
  const items = actions.length > 0 ? actions.slice(0, 3) : DEFAULT_ACTIONS;

  const handleCopyList = async () => {
    const text = items
      .map((item, idx) => `${idx + 1}. ${item.text}`)
      .join("\n");
    await copyToClipboard(`*Whether Actions This Week:*\n${text}`, "actions-list");
  };

  return (
    <section
      aria-labelledby="actions-this-week-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 id="actions-this-week-heading" className="text-sm font-semibold tracking-tight text-white">
            Actions this week
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyList}
              aria-label="Copy actions list to clipboard"
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/90 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              {didCopy ? (
                <>
                  <Check size={12} className="text-teal-400" />
                  <span className="text-teal-300">Copied!</span>
                </>
              ) : didFail ? (
                <>
                  <Copy size={12} className="text-amber-300" />
                  <span className="text-amber-300">Copy failed</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="text-slate-400" />
                  <span>Copy list</span>
                </>
              )}
            </button>
            <output className="sr-only" aria-live="polite">
              {didCopy ? "Actions list copied." : didFail ? "Copy failed. Select the actions text to copy it manually." : ""}
            </output>
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              Turn insight into progress
            </span>
          </div>
        </div>

        <ul className="space-y-3">
          {items.map((item, index) => {
            const href = item.href ?? operateHref;
            return (
              <li key={item.id ?? index}>
                <Link
                  href={href}
                  className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3 transition-colors hover:border-teal-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-teal-400 no-underline"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-200 group-hover:border-teal-500/30 group-hover:text-teal-300 transition-colors">
                      {index + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                      {item.text}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-slate-500 transition-all group-hover:text-teal-400 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
