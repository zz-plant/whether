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

  /* Three parallel lists in three columns, stacked on a phone, with the colour
     on each list's name and nowhere else (2026-10-09): Stop in the tightening
     ink, Start in the easing ink, Keep limited in the text's own. Until then
     each list was a box with a tinted fill and a coloured left rule as well as
     a coloured label, so one fact (which list this is) was drawn three times,
     and the boxes sat inside the step's own card. */
  const lists = [
    { key: "stop", label: "Stop", items: visible(stopItems, isExpanded), labelClassName: "text-semantic-tightening-fg" },
    { key: "start", label: "Start", items: visible(startItems, isExpanded), labelClassName: "text-semantic-easing-fg" },
    { key: "limit", label: "Keep limited", items: visible(fenceItems, isExpanded), labelClassName: "text-slate-200" },
  ];

  return (
    <div className="space-y-4">
      {/* The insight alone (2026-10-09). A "Rules for this week" label and an h3
          naming the conditions sat under the step titled "Rules before you
          commit", on a page whose intro stamps the conditions. */}
      <p className="text-sm text-slate-200">
        {playbook ? playbook.insight : "This week's rules did not load. Hold new commitments until they do."}
      </p>
      <div id={rulesId} className="grid gap-6 md:grid-cols-3 md:gap-8">
        {lists.map((list) => (
          <div key={list.key}>
            <h3 className={`text-sm font-semibold ${list.labelClassName}`}>{list.label}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
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
