"use client";

import { BoundedValue } from "../../components/ui/boundedValue";
import { displaySignalLabel } from "./evidenceSectionShared";

export const SignalsDecisionSummarySection = ({
  decisionDeltaLabel,
  triggerCondition,
  reversalCondition,
  showMicroDecisionRows,
  regimeLabel,
  actionNowShort,
  startItems,
  stopItems,
  topDiagnosticCallouts,
}: {
  decisionDeltaLabel: string;
  triggerCondition: string;
  reversalCondition: string;
  showMicroDecisionRows: boolean;
  regimeLabel: string;
  actionNowShort?: string;
  startItems: string[];
  stopItems: string[];
  topDiagnosticCallouts: Array<{ label: string; why: string }>;
}) => {
  // "Wrong if" (the guardrail threshold) and the "Hold or gate" list come from
  // separate report fields that regularly carry the same sentence — this week
  // both read "Over-engineering before demand proves out", printed twice within
  // one screen. Drop the repeat from the list, which is the secondary of the
  // two, unless that would empty it.
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\.$/, "");
  const stopItemsWithoutTrigger = stopItems.filter(
    (item) => normalize(item) !== normalize(triggerCondition),
  );
  const displayStopItems =
    stopItemsWithoutTrigger.length > 0 ? stopItemsWithoutTrigger : stopItems;

  return (
    <section
      id="decision-summary"
      className="weather-panel scroll-mt-28 space-y-6 px-6 py-5"
      aria-label="Decision summary"
    >
      <p className="weather-surface flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
        {decisionDeltaLabel}
      </p>
      <article className="weather-surface space-y-3 p-4">
        <p className="type-eyebrow text-sky-200">What this means now</p>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
            <p className="text-xs font-semibold text-slate-400">
              Current outlook
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {actionNowShort ??
                "Hold the current operating posture while thresholds hold."}
            </p>
          </div>
          <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
            <p className="text-xs font-semibold text-slate-400">
              Main pressure
            </p>
            {topDiagnosticCallouts[0] ? (
              <>
                {/* Names the driver as well as describing it — this cell is now the
                  only place the top mover appears. */}
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {displaySignalLabel(topDiagnosticCallouts[0].label)}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {topDiagnosticCallouts[0].why}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-200">
                Review the scorecard below to confirm the main driver before you
                change posture.
              </p>
            )}
          </div>
          <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
            <p className="text-xs font-semibold text-slate-400">
              What would change this
            </p>
            {showMicroDecisionRows ? (
              /* Was two tinted cards nested inside this card, inside the section
               card — three containment levels for two sentences. Labelled rows
               carry the same distinction with one level, and the hue now sits on
               the label rather than on a box around it. */
              <dl className="mt-2 space-y-1.5 text-sm text-slate-200">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 font-semibold text-semantic-caution-fg">
                    Wrong if:
                  </dt>
                  <dd className="min-w-0">
                    <BoundedValue>{triggerCondition}</BoundedValue>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 font-semibold text-semantic-easing-fg">
                    Safe again when:
                  </dt>
                  <dd className="min-w-0">
                    <BoundedValue>{reversalCondition}</BoundedValue>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-200">
                <span className="mr-1 type-eyebrow text-amber-200">
                  Wrong if:
                </span>{" "}
                <span>{triggerCondition}</span>{" "}
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>{" "}
                <span className="mr-1 type-eyebrow text-amber-200">
                  Safe again when:
                </span>{" "}
                <span>{reversalCondition}</span>
              </p>
            )}
          </div>
        </div>
      </article>
      {/* The four-cell state grid that stood here — Current environment,
        Confidence, Decision as-of, Freshness — restated, word for word, what the
        report shell's own intro block already says one screen above ("Sunny ·
        Trust constrained · As of Jun 17, 2026 · Cached snapshot", then "Updated
        … · 15m cadence"). §XI of docs/agents/ui-ux-standards.md says never to
        stack repeated state summaries ahead of the first task block; this page
        stated its posture and freshness four times before any evidence
        appeared. State belongs on the earliest layer that carries it, so the
        shell keeps it and this section starts with the evidence. */}
      {/* The "Big picture" card that stood here held one data-driven line (the
        regime headline, now promoted to this section heading) wrapped in four
        blocks of copy that never changed with the data: a "the sections below
        show..." preamble, a hardcoded What to do / If this is wrong / Check
        again list, and a "the main drivers are below" sign-off. The list
        restated the playbook card beside it and the Freshness cell above it,
        and it printed identical text every week on a page whose entire job is
        reporting what changed this week. */}
      <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
        {regimeLabel} is the current funding environment.
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <article
          className="weather-surface space-y-3 p-5"
          aria-label="Founder decision playbook"
        >
          <p className="type-eyebrow text-sky-200">This week</p>
          <h3 className="text-lg font-semibold text-slate-100">
            What founders should do this week
          </h3>
          {/* Two tinted boxes stood here, inside this card, inside the section —
            the same three-level nesting that was flattened out of the decision
            summary one screen above, left behind on the first pass. A ruled
            group carries the same distinction with one level, and the direction
            now sits on the label rather than on a box around it. Both labels
            also shared the same sky eyebrow, which told the reader nothing about
            which list was which. */}
          <div className="border-l-2 border-semantic-easing-border pl-3">
            <p className="type-eyebrow text-semantic-easing-fg">Lean in here</p>
            <ul
              className="mt-2 space-y-1 text-sm text-slate-100"
              aria-label="Start rules"
            >
              {startItems.slice(0, 3).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="border-l-2 border-semantic-tightening-border pl-3">
            <p className="type-eyebrow text-semantic-tightening-fg">
              Hold or gate
            </p>
            <ul
              className="mt-2 space-y-1 text-sm text-slate-100"
              aria-label="Stop rules"
            >
              {displayStopItems.slice(0, 3).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-300">
            This outlook comes down to three things: how hard it is to fund new
            bets, how open markets are to risk, and whether interest rates are
            rising or falling.
          </p>
        </article>
        {/* Starts at the second callout. The first one's `why` is already the
          Main pressure cell in the summary above, word for word, so listing it
          again here was the same sentence twice on one screen.

          The per-item rank label is gone. It was truthful — "Top mover 2" really
          was the second — but the first never appears under that name, so a list
          opening at 2 reads to the reader as one with an item missing. The card
          is titled "Also moved" and its items are in rank order, which carries
          the same information without implying an absent row. */}
        {topDiagnosticCallouts.length > 1 ? (
          <article className="weather-surface space-y-3 p-5">
            <p className="type-eyebrow text-sky-200">Also moved</p>
            <ul className="space-y-3" aria-label="Top mover callouts">
              {topDiagnosticCallouts.slice(1).map((item) => (
                <li
                  key={item.label}
                  className="rounded-md border border-slate-800/80 bg-slate-950/40 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {displaySignalLabel(item.label)}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">{item.why}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  );
};
