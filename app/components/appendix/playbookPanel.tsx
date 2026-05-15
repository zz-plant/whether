import { Collapsible } from "@base-ui/react/collapsible";
import type { PlaybookEntry } from "../../../lib/playbook";
import type { ActionStripItem } from "../../../lib/report/operatingCalls";
import { CollapsibleDeepDive } from "../collapsibleDeepDive";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";

export const getVisibleActionLaneItems = <T,>(items: T[], showAll: boolean) =>
  showAll ? items : items.slice(0, 3);

export const PlaybookPanel = ({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  provenance,
  showProvenance = true,
  actionStripItems = [],
  showAllActionLanes = false,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  provenance: DataProvenance;
  showProvenance?: boolean;
  actionStripItems?: ActionStripItem[];
  showAllActionLanes?: boolean;
}) => {
  const visibleStopItems = getVisibleActionLaneItems(stopItems, showAllActionLanes);
  const visibleStartItems = getVisibleActionLaneItems(startItems, showAllActionLanes);
  const visibleFenceItems = getVisibleActionLaneItems(fenceItems, showAllActionLanes);
  const visibleActionStripItems = getVisibleActionLaneItems(actionStripItems, showAllActionLanes);
  const playbookQuickLinks = [
    { href: "/planning#ops-decision-shield", label: "Decision check" },
    { href: "/planning#ops-strategy-brief", label: "Strategy summary" },
    { href: "/planning#ops-export-briefs", label: "Share options" },
  ];

  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="weather-panel p-6">
        <div>
          <p className="type-label text-slate-400">Rules for this week</p>
          <h3 id="playbook-title" className="type-section text-slate-100">
            {playbook?.title ?? "Operational Guidance"}
          </h3>
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {playbook
              ? playbook.insight
              : "Playbook data unavailable. Use operating guardrails until data recovers."}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Align the team on what to stop, start, and keep limited before approvals move forward.
          </p>
        </div>
        <CollapsibleDeepDive
          label="Deep dive: rule summary and detailed lists"
          panelClassName="mt-4 space-y-6"
        >
          <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
            <div className="grid gap-4 lg:col-span-2 lg:grid-cols-3">
              <div className="weather-surface border-l-4 border-rose-500/50 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-rose-100">
                  Stop
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {visibleStopItems.map((item) => (
                    <li key={item} className="break-words">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="weather-surface border-l-4 border-emerald-400/50 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-emerald-100">
                  Start
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {visibleStartItems.map((item) => (
                    <li key={item} className="break-words">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="weather-surface border-l-4 border-sky-400/50 p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Keep limited</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {visibleFenceItems.map((item) => (
                    <li key={item} className="break-words">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="weather-surface p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Rules by area
                </p>
                <ul className="mt-3 space-y-2 text-xs text-slate-300">
                  {visibleActionStripItems.map((item) => (
                    <li
                      key={item.lever}
                      className="rounded-md border border-slate-700/70 bg-slate-900/70 p-2"
                    >
                      <p className="font-semibold text-slate-100">{item.label}</p>
                      <p className="mt-1 text-emerald-100">Action now: {item.areaActionNow}</p>
                      <p className="mt-1 text-amber-100">Pause if: {item.triggerThreshold}</p>
                      <p className="mt-1 text-sky-100">
                        Change course if: {item.reversalCondition}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="weather-surface p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Weekly rule summary
                </p>
                {playbook ? (
                  <div className="mt-3 space-y-2 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">{playbook.tone}</p>
                    <p>Mandate: {playbook.mandate}</p>
                    <p className="text-slate-400">Metric: {playbook.metric}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Playbook signals will return once Treasury data is refreshed.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {playbookQuickLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-[0.6rem] font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
              {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
            </div>
          </div>
          {playbook ? (
            <div className="weather-surface p-4">
              <Collapsible.Root defaultOpen>
                <Collapsible.Trigger
                  type="button"
                  className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 touch-manipulation"
                >
                  Leadership signals (phrases to use or avoid)
                </Collapsible.Trigger>
                <Collapsible.Panel className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-emerald-200">
                      More often
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {playbook.leadershipPhrases.more.map((item) => (
                        <li key={item} className="break-words">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-rose-200">
                      Less often
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {playbook.leadershipPhrases.less.map((item) => (
                        <li key={item} className="break-words">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Collapsible.Panel>
              </Collapsible.Root>
            </div>
          ) : null}
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};
