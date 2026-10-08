"use client";

import { useEffect, useId, useState } from "react";
import type { PlaybookEntry } from "../../../lib/playbook";

/**
 * The do, don't and limit lists for new commitments, with the week's rule
 * summary above them.
 *
 * This is what `PlaybookPanel` carried besides its per-area rows. The rows
 * are an `AreaTable` in the step above this one — the page's first, since
 * 2026-10-07 — and the lists are what is left to read before committing. The leadership phrases are evidence for the
 * lists (§XII), so they sit behind a native disclosure with no query key.
 */
const visible = <T,>(items: readonly T[], showAll: boolean) => (showAll ? items : items.slice(0, 3));

export function RulesBeforeCommit({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  showAll: initialShowAll,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  /** All of each list, rather than the top three. */
  showAll: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(initialShowAll);
  const [prevShowAll, setPrevShowAll] = useState(initialShowAll);
  const rulesId = useId();

  if (prevShowAll !== initialShowAll) {
    setPrevShowAll(initialShowAll);
    setIsExpanded(initialShowAll);
  }

  useEffect(() => {
    const syncFromLocation = () => {
      setIsExpanded(new URLSearchParams(window.location.search).get("actions") === "all");
    };
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const handleToggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) {
        url.searchParams.set("actions", "all");
      } else {
        url.searchParams.delete("actions");
      }
      url.hash = "ops-playbook";
      window.history.pushState(window.history.state, "", url.toString());
    }
  };

  /* A coloured left rule and a faint tint per list, so Stop and Start read as
     opposites before a word of either is read. These were drawn on
     `.weather-surface` until 2026-09-29, whose border and background are
     unlayered and beat every utility here, so all three rendered as the same
     grey card at the surface radius — rounder than the step card holding them.
     They are rule segments inside a card, which is the data tier (§XIV). */
  const lists = [
    { key: "stop", label: "Stop", items: visible(stopItems, isExpanded), className: "border-rose-500/30 border-l-rose-400/80 bg-rose-500/8", labelClassName: "text-rose-200" },
    { key: "start", label: "Start", items: visible(startItems, isExpanded), className: "border-emerald-500/30 border-l-emerald-400/80 bg-emerald-500/8", labelClassName: "text-emerald-200" },
    { key: "limit", label: "Keep limited", items: visible(fenceItems, isExpanded), className: "border-sky-500/25 border-l-sky-400/70", labelClassName: "text-slate-300" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="type-label text-slate-400">Rules for this week</p>
        <h3 className="type-section text-slate-100">{playbook?.title ?? "Rules for new commitments"}</h3>
        <p className="mt-2 text-sm text-slate-200">
          {playbook ? playbook.insight : "This week's rules did not load. Hold new commitments until they do."}
        </p>
      </div>
      <div id={rulesId} className="grid gap-4 lg:grid-cols-3">
        {lists.map((list) => (
          <div key={list.key} className={`rounded-md border border-l-4 p-4 ${list.className}`}>
            <p className={`text-xs font-semibold ${list.labelClassName}`}>{list.label}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {list.items.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* After the lists it changes, not above the heading: the step opened on a
          control and a count before a reader had seen a rule. "Per area" was
          wrong too; the cut is per list. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls={rulesId}
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold hover:border-sky-400/70 hover:text-slate-100 cursor-pointer"
        >
          {isExpanded ? "Show top 3 only" : "Show all rules"}
        </button>
        <p className="text-xs text-slate-400">
          {isExpanded ? "Showing every rule." : "Showing the top 3 of each list."}
        </p>
      </div>
      {playbook ? (
        <details className="weather-auto-chevron">
          <summary className="text-xs font-semibold text-slate-300">
            Phrases to use, and to avoid, in this week&apos;s meetings
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-emerald-200">More often</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {playbook.leadershipPhrases.more.map((item) => (
                  <li key={item} className="break-words">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-200">Less often</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {playbook.leadershipPhrases.less.map((item) => (
                  <li key={item} className="break-words">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
