import type { PlaybookEntry } from "../../../lib/playbook";

/**
 * The do, don't and limit lists for new commitments, with the week's rule
 * summary above them.
 *
 * This is what `PlaybookPanel` carried besides its per-area rows. The rows
 * are an `AreaTable` in the weekly plan step now — the consequence tier,
 * directly under the call it follows from — and the lists are what is left
 * to read before committing. The leadership phrases are evidence for the
 * lists (§XII), so they sit behind a native disclosure with no query key.
 */
const visible = <T,>(items: readonly T[], showAll: boolean) => (showAll ? items : items.slice(0, 3));

export function RulesBeforeCommit({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  showAll,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  /** All of each list, rather than the top three. */
  showAll: boolean;
}) {
  const lists = [
    { key: "stop", label: "Stop", items: visible(stopItems, showAll), className: "border-rose-500/50 bg-rose-500/10", labelClassName: "text-rose-100" },
    { key: "start", label: "Start", items: visible(startItems, showAll), className: "border-emerald-400/50 bg-emerald-500/10", labelClassName: "text-emerald-100" },
    { key: "limit", label: "Keep limited", items: visible(fenceItems, showAll), className: "border-sky-400/50", labelClassName: "text-slate-400" },
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
      <div className="grid gap-4 lg:grid-cols-3">
        {lists.map((list) => (
          <div key={list.key} className={`weather-surface border-l-4 p-4 ${list.className}`}>
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
