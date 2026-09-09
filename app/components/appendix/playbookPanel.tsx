import { Collapsible } from "@base-ui/react/collapsible";
import type { PlaybookEntry } from "../../../lib/playbook";
import type { ActionStripItem } from "../../../lib/report/operatingCalls";
import { RuleLines } from "../boundedRuleLines";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { Details } from "../details";
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
    { href: "/operate#ops-decision-shield", label: "Decision check" },
    { href: "/operate#ops-strategy-brief", label: "Strategy summary" },
    { href: "/operate#ops-export-briefs", label: "Share options" },
  ];

  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="weather-panel p-6">
        <div>
          <p className="type-label text-slate-400">Rules for this week</p>
          <h3 id="playbook-title" className="type-section text-slate-100">
            {playbook?.title ?? "Rules for new commitments"}
          </h3>
        </div>
        {/* A labelled group, not another box — the same argument the "Rules by
            area" group below already records. Framing this one put its text on
            a fourth left edge: the panel heading, this box's inset, the group
            label, and the rule cards each started at a different x inside one
            block. */}
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {playbook
              ? playbook.insight
              : "Playbook data unavailable. Use operating guardrails until data recovers."}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Align the team on what to stop, start, and keep limited before approvals move forward.
          </p>
        </div>
        {/* Above the deep dive, not inside it. These are the rules the reader
            acts on this week — §XII collapses the evidence for a claim, never
            the thing to be done — and they are now the canonical home for the
            per-area guardrails the weekly brief used to restate. */}
        {/* A labelled group, not another box: this sits two containers deep
            already and every card inside it is bordered, so a fourth frame here
            only repeated the enclosure. Spacing and the label carry it. */}
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Rules by area
          </p>
          {/* Every lever's rule is built from the same four lines in different
              pairs, so five cards of three sentences each stated the corridor
              fifteen times. The corridor is drawn once, and each area is a row
              that says which lines apply and how far off they sit. */}
          {/* The corridor itself is drawn once at the top of the plan. The rows
              here name which of its four lines each area pauses and re-opens on. */}
          <p className="mt-1 text-fluid-xs text-slate-400">
            Every area pauses and re-opens on the corridor drawn under the weekly plan above; the
            rows say which lines apply and how far off they are.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="weather-stack-table w-full border-collapse text-left text-xs text-slate-300">
              <caption className="sr-only">Action, pause line and re-open line for each area</caption>
              <thead>
                <tr className="border-b border-slate-800/80 text-fluid-nano text-slate-400">
                  <th scope="col" className="py-1.5 pr-3 font-medium">Area</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">{DECISION_CONTRACT_LABELS.action.actionNow}</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                  <th scope="col" className="py-1.5 font-medium">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</th>
                </tr>
              </thead>
              <tbody>
                {visibleActionStripItems.map((item) => (
                  <tr key={item.lever} className="border-b border-slate-800/50 align-top">
                    <th scope="row" className="py-2 pr-3 font-semibold text-slate-100">{item.label}</th>
                    <td className="py-2 pr-3 text-emerald-100" data-label={DECISION_CONTRACT_LABELS.action.actionNow}>{item.areaActionNow}</td>
                    <td className="py-2 pr-3" data-label={DECISION_CONTRACT_LABELS.threshold.pauseIf}>
                      <RuleLines
                        conditions={item.pauseConditions ?? []}
                        fallback={item.triggerThreshold}
                        nearest={item.nearestPause}
                        kind="pause"
                        qualifier={item.pauseQualifier}
                      />
                    </td>
                    <td className="py-2" data-label={DECISION_CONTRACT_LABELS.reversal.changeCourseIf}>
                      <RuleLines
                        conditions={item.resumeConditions ?? []}
                        fallback={item.reversalCondition}
                        nearest={item.nearestResume}
                        kind="resume"
                        qualifier={item.resumeQualifier}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Details
          summary={<span className="text-xs font-semibold tracking-[0.12em] text-slate-300">Deep dive: rule summary and detailed lists</span>}
          className="mt-4"
        >
          <div className="space-y-6">
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
                  Weekly rule summary
                </p>
                {playbook ? (
                  <div className="mt-3 space-y-2 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">{playbook.tone}</p>
                    <p>Mandate: {playbook.mandate}</p>
                    <p className="text-slate-400">Metric: {playbook.metric}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    Playbook signals will return once Treasury data is refreshed.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {playbookQuickLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-fluid-nano font-semibold tracking-[0.08em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
                  className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
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
          </div>
        </Details>
      </div>
    </section>
  );
};
